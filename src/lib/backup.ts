import { db } from "./db";
import type { MediaItem } from "./types";
import { requestSync } from "./sync";
import { markBackedUp } from "./prefs";
import { fmtDate, fmtDuration } from "./format";

interface BackupMedia extends Omit<MediaItem, "blob"> {
  blobBase64?: string;
}

interface BackupFile {
  version: 1;
  exportedAt: number;
  progress: unknown[];
  notes: unknown[];
  flairs: unknown[];
  media: BackupMedia[];
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onloadend = () => resolve((r.result as string).split(",")[1] ?? "");
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

function base64ToBlob(b64: string, mime: string): Blob {
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

export async function exportBackup(): Promise<void> {
  const [progress, notes, flairs, media] = await Promise.all([
    db.progress.toArray(),
    db.notes.toArray(),
    db.flairs.toArray(),
    db.media.toArray(),
  ]);

  const mediaOut: BackupMedia[] = [];
  for (const m of media) {
    const { blob, ...rest } = m;
    mediaOut.push({ ...rest, blobBase64: blob ? await blobToBase64(blob) : undefined });
  }

  const data: BackupFile = {
    version: 1,
    exportedAt: Date.now(),
    progress,
    notes,
    flairs,
    media: mediaOut,
  };

  download(
    new Blob([JSON.stringify(data)], { type: "application/json" }),
    `trackback-backup-${new Date().toISOString().slice(0, 10)}.json`,
  );
  markBackedUp();
}

function download(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  // Revoking synchronously can cancel the download in some WebViews.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/**
 * Push every heading in a note down one level so it nests under the lesson's
 * own `##` heading instead of competing with it — notes very often start with
 * `## Something`, which would otherwise flatten the whole document outline.
 *
 * Fenced code is skipped, so a `# comment` in a Python snippet survives intact.
 */
function demoteHeadings(md: string): string {
  let inFence = false;
  return md
    .split("\n")
    .map((line) => {
      if (/^\s{0,3}(```|~~~)/.test(line)) {
        inFence = !inFence;
        return line;
      }
      if (inFence) return line;
      // h6 is as deep as Markdown goes, so leave those alone.
      return line.replace(/^( {0,3})(#{1,5})(\s|$)/, (_m, pad, hashes, tail) => `${pad}#${hashes}${tail}`);
    })
    .join("\n");
}

/**
 * Export every note in a course as one Markdown document, in lesson order —
 * handy for a revision pass before an interview.
 */
export async function exportCourseNotes(courseId: string): Promise<{ notes: number }> {
  const course = await db.courses.get(courseId);
  if (!course) throw new Error("Course not found");

  const lessons = await db.lessons.where("courseId").equals(courseId).sortBy("order");
  const noteRows = await db.notes.where("lessonId").anyOf(lessons.map((l) => l.id)).toArray();
  const noteMap = new Map(
    noteRows.filter((n) => !n.deleted && n.markdown.trim()).map((n) => [n.lessonId, n.markdown]),
  );
  const progRows = await db.progress.where("lessonId").anyOf(lessons.map((l) => l.id)).toArray();
  const progMap = new Map(progRows.filter((p) => !p.deleted).map((p) => [p.lessonId, p]));

  const out: string[] = [
    `# ${course.title}`,
    "",
    `_${noteMap.size} of ${lessons.length} lessons have notes · exported ${fmtDate(Date.now())}_`,
    "",
  ];

  let n = 0;
  for (const [i, lesson] of lessons.entries()) {
    const md = noteMap.get(lesson.id);
    if (!md) continue;
    n++;
    const p = progMap.get(lesson.id);
    const meta = [
      lesson.durationSec ? fmtDuration(lesson.durationSec) : null,
      p?.status === "completed" && p.completedAt ? `completed ${fmtDate(p.completedAt)}` : null,
      `https://youtu.be/${lesson.videoId}`,
    ].filter(Boolean);

    out.push(
      "---",
      "",
      `## ${i + 1}. ${lesson.title}`,
      "",
      `_${meta.join(" · ")}_`,
      "",
      demoteHeadings(md.trim()),
      "",
    );
  }

  if (n === 0) out.push("---", "", "_No notes written for this course yet._", "");

  const slug = course.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  download(new Blob([out.join("\n")], { type: "text/markdown" }), `${slug}-notes.md`);
  return { notes: n };
}

export async function importBackup(file: File): Promise<{ imported: number }> {
  const text = await file.text();
  const data = JSON.parse(text) as BackupFile;
  if (data.version !== 1) throw new Error("Unsupported backup version");

  let imported = 0;
  await db.transaction("rw", db.progress, db.notes, db.flairs, db.media, async () => {
    for (const r of data.progress as any[]) {
      await mergeById(db.progress, r);
      imported++;
    }
    for (const r of data.notes as any[]) {
      await mergeById(db.notes, r);
      imported++;
    }
    for (const r of data.flairs as any[]) {
      await mergeById(db.flairs, r);
      imported++;
    }
    for (const r of data.media as BackupMedia[]) {
      const { blobBase64, ...rest } = r;
      const item: MediaItem = {
        ...(rest as MediaItem),
        blob: blobBase64 ? base64ToBlob(blobBase64, rest.mime) : undefined,
        dirty: 1,
      };
      const existing = await db.media.get(item.id);
      if (!existing || existing.updatedAt < item.updatedAt) await db.media.put(item);
      imported++;
    }
  });
  requestSync();
  return { imported };
}

async function mergeById(table: any, row: any): Promise<void> {
  const existing = await table.get(row.id);
  if (!existing || existing.updatedAt < row.updatedAt) {
    await table.put({ ...row, dirty: 1 });
  }
}
