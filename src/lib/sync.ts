import { db, getMeta, setMeta } from "./db";
import { supabase, isSupabaseConfigured, MEDIA_BUCKET } from "./supabase";
import { now } from "./id";
import type { Flair, MediaItem, Note, Progress } from "./types";

// Sync status broadcast so UI can reflect state.
export type SyncStatus = "idle" | "syncing" | "offline" | "disabled" | "error" | "signedout";
type Listener = (s: SyncStatus, detail?: string) => void;
const listeners = new Set<Listener>();
let currentStatus: SyncStatus = isSupabaseConfigured ? "idle" : "disabled";

export function onSyncStatus(fn: Listener): () => void {
  listeners.add(fn);
  fn(currentStatus);
  return () => listeners.delete(fn);
}
function setStatus(s: SyncStatus, detail?: string) {
  currentStatus = s;
  listeners.forEach((l) => l(s, detail));
}
export const getSyncStatus = () => currentStatus;

// User data tables (progress, notes, flairs, media) are synced;
// content tables (sections, courses, lessons) come from bundled seed.
let debounce: ReturnType<typeof setTimeout> | null = null;
let running = false;
let queuedAgain = false;

export function requestSync(): void {
  if (!isSupabaseConfigured) return;
  if (debounce) clearTimeout(debounce);
  debounce = setTimeout(() => void runSync(), 800);
}

async function currentUserId(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export async function runSync(): Promise<void> {
  if (!supabase) return;
  if (!navigator.onLine) {
    setStatus("offline");
    return;
  }
  const userId = await currentUserId();
  if (!userId) {
    setStatus("signedout");
    return;
  }
  if (running) {
    queuedAgain = true;
    return;
  }
  running = true;
  setStatus("syncing");
  try {
    await pushAll(userId);
    await pullAll(userId);
    setStatus("idle");
  } catch (e) {
    console.error("[sync] failed", e);
    setStatus("error", e instanceof Error ? e.message : String(e));
  } finally {
    running = false;
    if (queuedAgain) {
      queuedAgain = false;
      void runSync();
    }
  }
}

// ---------- PUSH ----------
async function pushAll(userId: string): Promise<void> {
  await pushMedia(userId);
  await pushRows<Progress>("progress", userId, (r) => ({
    id: r.id,
    user_id: userId,
    lesson_id: r.lessonId,
    status: r.status,
    completed_at: r.completedAt,
    updated_at: r.updatedAt,
    deleted: r.deleted,
  }));
  await pushRows<Note>("notes", userId, (r) => ({
    id: r.id,
    user_id: userId,
    lesson_id: r.lessonId,
    markdown: r.markdown,
    updated_at: r.updatedAt,
    deleted: r.deleted,
  }));
  await pushRows<Flair>("flairs", userId, (r) => ({
    id: r.id,
    user_id: userId,
    lesson_id: r.lessonId,
    kind: r.kind,
    created_at: r.createdAt,
    updated_at: r.updatedAt,
    deleted: r.deleted,
  }));
}

async function pushRows<T extends { id: string; dirty: number }>(
  table: string,
  _userId: string,
  toRow: (r: T) => Record<string, unknown>,
): Promise<void> {
  const dirty = (await (db as any)[table].where("dirty").equals(1).toArray()) as T[];
  if (!dirty.length) return;
  const payload = dirty.map(toRow);
  const { error } = await supabase!.from(table).upsert(payload, { onConflict: "id" });
  if (error) throw error;
  await db.transaction("rw", (db as any)[table], async () => {
    for (const r of dirty) await (db as any)[table].update(r.id, { dirty: 0 });
  });
}

async function pushMedia(userId: string): Promise<void> {
  const dirty = (await db.media.where("dirty").equals(1).toArray()) as MediaItem[];
  for (const m of dirty) {
    let storagePath = m.storagePath;
    if (!m.deleted && m.blob && !storagePath) {
      const ext = m.kind === "audio" ? "webm" : (m.mime.split("/")[1] || "png");
      storagePath = `${userId}/${m.id}.${ext}`;
      const { error: upErr } = await supabase!.storage
        .from(MEDIA_BUCKET)
        .upload(storagePath, m.blob, { contentType: m.mime, upsert: true });
      if (upErr) throw upErr;
    }
    if (m.deleted && storagePath) {
      await supabase!.storage.from(MEDIA_BUCKET).remove([storagePath]);
    }
    const { error } = await supabase!.from("media").upsert(
      {
        id: m.id,
        user_id: userId,
        lesson_id: m.lessonId,
        kind: m.kind,
        mime: m.mime,
        storage_path: m.deleted ? null : storagePath,
        created_at: m.createdAt,
        updated_at: m.updatedAt,
        deleted: m.deleted,
      },
      { onConflict: "id" },
    );
    if (error) throw error;
    await db.media.update(m.id, { dirty: 0, storagePath: m.deleted ? null : storagePath });
  }
}

// ---------- PULL ----------
async function pullAll(userId: string): Promise<void> {
  const since = (await getMeta<number>("lastPulledAt")) ?? 0;
  let maxSeen = since;

  const bump = (t: number) => {
    if (t > maxSeen) maxSeen = t;
  };

  // progress
  {
    const { data, error } = await supabase!
      .from("progress")
      .select("*")
      .eq("user_id", userId)
      .gt("updated_at", since);
    if (error) throw error;
    for (const r of data ?? []) {
      bump(r.updated_at);
      await mergeRow("progress", r.id, r.updated_at, () => ({
        id: r.id,
        lessonId: r.lesson_id,
        status: r.status,
        completedAt: r.completed_at,
        updatedAt: r.updated_at,
        deleted: r.deleted ? 1 : 0,
        dirty: 0,
      }));
    }
  }
  // notes
  {
    const { data, error } = await supabase!
      .from("notes")
      .select("*")
      .eq("user_id", userId)
      .gt("updated_at", since);
    if (error) throw error;
    for (const r of data ?? []) {
      bump(r.updated_at);
      await mergeRow("notes", r.id, r.updated_at, () => ({
        id: r.id,
        lessonId: r.lesson_id,
        markdown: r.markdown,
        updatedAt: r.updated_at,
        deleted: r.deleted ? 1 : 0,
        dirty: 0,
      }));
    }
  }
  // flairs
  {
    const { data, error } = await supabase!
      .from("flairs")
      .select("*")
      .eq("user_id", userId)
      .gt("updated_at", since);
    if (error) throw error;
    for (const r of data ?? []) {
      bump(r.updated_at);
      await mergeRow("flairs", r.id, r.updated_at, () => ({
        id: r.id,
        lessonId: r.lesson_id,
        kind: r.kind,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        deleted: r.deleted ? 1 : 0,
        dirty: 0,
      }));
    }
  }
  // media (metadata; blob lazy-downloaded on demand)
  {
    const { data, error } = await supabase!
      .from("media")
      .select("*")
      .eq("user_id", userId)
      .gt("updated_at", since);
    if (error) throw error;
    for (const r of data ?? []) {
      bump(r.updated_at);
      const local = await db.media.get(r.id);
      if (local && local.updatedAt >= r.updated_at && !local.dirty) continue;
      await db.media.put({
        id: r.id,
        lessonId: r.lesson_id,
        kind: r.kind,
        blob: local?.blob,
        mime: r.mime,
        storagePath: r.storage_path,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        deleted: r.deleted ? 1 : 0,
        dirty: 0,
      });
    }
  }

  if (maxSeen > since) await setMeta("lastPulledAt", maxSeen);
}

async function mergeRow(
  table: string,
  id: string,
  remoteUpdated: number,
  build: () => Record<string, unknown>,
): Promise<void> {
  const local = await (db as any)[table].get(id);
  // Last-write-wins; never clobber un-pushed local edits that are newer.
  if (local && (local.dirty === 1 || local.updatedAt >= remoteUpdated)) return;
  await (db as any)[table].put(build());
}

// Lazily fetch a media blob from storage if we only have metadata.
export async function ensureMediaBlob(id: string): Promise<Blob | undefined> {
  const item = await db.media.get(id);
  if (!item) return undefined;
  if (item.blob) return item.blob;
  if (!supabase || !item.storagePath) return undefined;
  const { data, error } = await supabase.storage.from(MEDIA_BUCKET).download(item.storagePath);
  if (error || !data) return undefined;
  await db.media.update(id, { blob: data });
  return data;
}

// ---------- lifecycle wiring ----------
export function initSync(): void {
  if (!isSupabaseConfigured || !supabase) {
    setStatus("disabled");
    return;
  }
  window.addEventListener("online", () => void runSync());
  window.addEventListener("offline", () => setStatus("offline"));
  window.addEventListener("focus", () => void runSync());
  supabase.auth.onAuthStateChange((_evt, session) => {
    if (session) void runSync();
    else setStatus("signedout");
  });
  void runSync();
  // periodic pull every 60s while open
  setInterval(() => void runSync(), 60_000);
}

export async function resetSyncCursor(): Promise<void> {
  await setMeta("lastPulledAt", 0);
}

export const nowTs = now;
