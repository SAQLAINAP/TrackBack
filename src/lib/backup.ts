import { db } from "./db";
import type { MediaItem } from "./types";
import { requestSync } from "./sync";

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

  const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `course-tracker-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
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
