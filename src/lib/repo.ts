import { db, getMeta, setMeta } from "./db";
import { uid, now } from "./id";
import { seedSections, seedCourses, seedLessons, SEED_VERSION } from "../data/seed";
import type { FlairKind, LessonStatus, MediaItem } from "./types";
import { requestSync } from "./sync";

// ---------- Seeding ----------
export async function seedIfNeeded(): Promise<void> {
  const version = await getMeta<number>("seedVersion");
  if (version === SEED_VERSION) return;

  await db.transaction("rw", db.sections, db.courses, db.lessons, async () => {
    await db.sections.bulkPut(
      seedSections.map((s) => ({ id: s.slug, name: s.name, color: s.color, order: s.order })),
    );
    await db.courses.bulkPut(
      seedCourses.map((c) => ({
        id: c.id,
        sectionId: c.sectionSlug,
        title: c.title,
        playlistId: c.playlistId,
        sourceUrl: c.sourceUrl,
        order: c.order,
      })),
    );
    await db.lessons.bulkPut(
      seedLessons.map((l) => ({
        id: l.id,
        courseId: l.courseId,
        videoId: l.videoId,
        title: l.title,
        durationSec: l.durationSec,
        order: l.order,
      })),
    );
  });
  await setMeta("seedVersion", SEED_VERSION);
}

// ---------- Progress ----------
export async function setStatus(lessonId: string, status: LessonStatus): Promise<void> {
  const existing = await db.progress.get(lessonId);
  const completedAt =
    status === "completed" ? existing?.completedAt ?? now() : status === "not_started" ? null : existing?.completedAt ?? null;
  await db.progress.put({
    id: lessonId,
    lessonId,
    status,
    completedAt,
    updatedAt: now(),
    deleted: 0,
    dirty: 1,
  });
  requestSync();
}

export async function toggleComplete(lessonId: string): Promise<void> {
  const existing = await db.progress.get(lessonId);
  const next: LessonStatus = existing?.status === "completed" ? "not_started" : "completed";
  await setStatus(lessonId, next);
}

// ---------- Notes ----------
export async function saveNote(lessonId: string, markdown: string): Promise<void> {
  await db.notes.put({
    id: lessonId,
    lessonId,
    markdown,
    updatedAt: now(),
    deleted: 0,
    dirty: 1,
  });
  requestSync();
}

// ---------- Media ----------
export async function addMedia(
  lessonId: string,
  kind: "image" | "audio",
  blob: Blob,
): Promise<MediaItem> {
  const item: MediaItem = {
    id: uid(),
    lessonId,
    kind,
    blob,
    mime: blob.type || (kind === "audio" ? "audio/webm" : "image/png"),
    storagePath: null,
    createdAt: now(),
    updatedAt: now(),
    deleted: 0,
    dirty: 1,
  };
  await db.media.put(item);
  requestSync();
  return item;
}

export async function deleteMedia(id: string): Promise<void> {
  const item = await db.media.get(id);
  if (!item) return;
  await db.media.put({ ...item, deleted: 1, updatedAt: now(), dirty: 1 });
  requestSync();
}

// ---------- Flairs ----------
export async function toggleFlair(lessonId: string, kind: FlairKind): Promise<void> {
  const existing = await db.flairs
    .where("lessonId")
    .equals(lessonId)
    .and((f) => f.kind === kind)
    .first();

  if (existing) {
    await db.flairs.put({
      ...existing,
      deleted: existing.deleted ? 0 : 1,
      updatedAt: now(),
      dirty: 1,
    });
  } else {
    await db.flairs.put({
      id: uid(),
      lessonId,
      kind,
      createdAt: now(),
      updatedAt: now(),
      deleted: 0,
      dirty: 1,
    });
  }
  requestSync();
}
