import type { Table } from "dexie";
import { db, getMeta, setMeta } from "./db";
import { uid, now } from "./id";
import { seedSections, seedCourses, seedLessons, SEED_VERSION } from "../data/seed";
import type { FlairKind, LessonStatus, MediaItem } from "./types";
import { requestSync } from "./sync";
import { isSupabaseConfigured } from "./supabase";

interface SyncedRow {
  id: string;
  lessonId: string;
  updatedAt: number;
  deleted: number;
  dirty: number;
}

// ---------- Seeding ----------

/**
 * Nested playlists the original scraper mistook for videos: their videoId is a
 * playlist id, so the embed never loads, and they inflated the System Design
 * denominator so it could never reach 100%.
 */
const BOGUS_LESSON_IDS = [
  "l_PLMCXHnjXnTnucEu8lYMatA23OOi_De3Zp",
  "l_PLMCXHnjXnTnszR6YSo1tQK2BMr15cC9Zh",
  "l_PLMCXHnjXnTnto1pZVvH7rbZ9W5neZ7Yhc",
];

async function tombstoneByLesson<T extends SyncedRow>(table: Table<T, string>): Promise<number> {
  const rows = await table.where("lessonId").anyOf(BOGUS_LESSON_IDS).toArray();
  let count = 0;
  for (const row of rows) {
    if (row.deleted) continue;
    await table.put({ ...row, deleted: 1, updatedAt: now(), dirty: 1 });
    count++;
  }
  return count;
}

/**
 * Dropping them from the seed is not enough: seedIfNeeded only bulkPuts, so on
 * an existing install the rows survive in IndexedDB.
 *
 * User rows are tombstoned rather than hard-deleted so the deletion pushes to
 * Supabase — a hard delete would leave the remote rows live and a later pull
 * (or a fresh install) would resurrect them.
 */
async function purgeBogusLessons(): Promise<void> {
  if (await getMeta<boolean>("purgedPlaylistLessons")) return;

  let tombstoned = 0;
  await db.transaction(
    "rw",
    db.lessons,
    db.progress,
    db.notes,
    db.flairs,
    db.media,
    async () => {
      await db.lessons.bulkDelete(BOGUS_LESSON_IDS);
      tombstoned += await tombstoneByLesson(db.progress);
      tombstoned += await tombstoneByLesson(db.notes);
      tombstoned += await tombstoneByLesson(db.flairs);
      tombstoned += await tombstoneByLesson(db.media);
    },
  );

  await setMeta("purgedPlaylistLessons", true);
  if (tombstoned) requestSync();
}

export async function seedIfNeeded(): Promise<void> {
  await purgeBogusLessons();

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
    // Re-watching from scratch should not inherit a stale resume point.
    positionSec: status === "not_started" ? 0 : existing?.positionSec ?? 0,
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

/**
 * Store the playback head so a 90-minute lesson resumes where you left off.
 *
 * Called on a timer while the video plays, so it deliberately does NOT call
 * requestSync() — pushing to Supabase every few seconds would be wasteful. The
 * row is marked dirty and rides along on the next real sync.
 */
export async function savePosition(lessonId: string, positionSec: number): Promise<void> {
  const existing = await db.progress.get(lessonId);
  // Never downgrade a completed lesson just because it was scrubbed.
  const status: LessonStatus = existing?.status === "completed" ? "completed" : "in_progress";
  await db.progress.put({
    id: lessonId,
    lessonId,
    status,
    completedAt: existing?.completedAt ?? (status === "completed" ? now() : null),
    positionSec: Math.max(0, Math.floor(positionSec)),
    updatedAt: now(),
    deleted: 0,
    dirty: 1,
  });
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

// ---------- Destructive reset ----------

async function tombstoneAll<T extends SyncedRow>(table: Table<T, string>): Promise<number> {
  const rows = await table.toArray();
  let count = 0;
  for (const row of rows) {
    if (row.deleted) continue;
    await table.put({ ...row, deleted: 1, updatedAt: now(), dirty: 1 });
    count++;
  }
  return count;
}

/**
 * Wipe all study history — progress, notes, flairs and media. The bundled
 * course catalogue and the user's settings are left alone.
 *
 * When sync is configured the rows are tombstoned rather than dropped. A hard
 * local delete would leave the Supabase copies live, so the next pull — or a
 * reinstall, or "Force full re-sync" — would quietly resurrect everything the
 * user just asked to destroy. Media keeps its storagePath so the push can also
 * delete the remote object, but the blob is dropped immediately since that is
 * the only bulky thing here.
 *
 * With no sync configured there is nothing to propagate to, so the tables are
 * emptied outright and the space is reclaimed straight away.
 */
export async function resetAllUserData(): Promise<{ cleared: number }> {
  let cleared = 0;

  await db.transaction("rw", db.progress, db.notes, db.flairs, db.media, async () => {
    if (!isSupabaseConfigured) {
      for (const table of [db.progress, db.notes, db.flairs, db.media]) {
        cleared += await table.count();
        await table.clear();
      }
      return;
    }

    cleared += await tombstoneAll(db.progress);
    cleared += await tombstoneAll(db.notes);
    cleared += await tombstoneAll(db.flairs);
    for (const item of await db.media.toArray()) {
      if (item.deleted) continue;
      await db.media.put({ ...item, blob: undefined, deleted: 1, updatedAt: now(), dirty: 1 });
      cleared++;
    }
  });

  if (isSupabaseConfigured) requestSync();
  return { cleared };
}
