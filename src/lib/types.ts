export type LessonStatus = "not_started" | "in_progress" | "completed";

export type FlairKind =
  | "revision_needed"
  | "coding_needed"
  | "not_understood"
  | "skipped"
  | "important"
  | "done_well";

export interface FlairMeta {
  kind: FlairKind;
  label: string;
  emoji: string;
  color: string; // tailwind text/bg base color name
}

export const FLAIRS: FlairMeta[] = [
  { kind: "revision_needed", label: "Revision needed", emoji: "🔁", color: "amber" },
  { kind: "coding_needed", label: "Coding needed", emoji: "💻", color: "sky" },
  { kind: "not_understood", label: "Not understood", emoji: "❓", color: "rose" },
  { kind: "skipped", label: "Skipped", emoji: "⏭️", color: "zinc" },
  { kind: "important", label: "Important", emoji: "⭐", color: "violet" },
  { kind: "done_well", label: "Nailed it", emoji: "✅", color: "emerald" },
];

export const FLAIR_MAP: Record<FlairKind, FlairMeta> = Object.fromEntries(
  FLAIRS.map((f) => [f.kind, f]),
) as Record<FlairKind, FlairMeta>;

// ---- Content tables (from bundled seed; not synced) ----
export interface Section {
  id: string; // slug
  name: string;
  color: string;
  order: number;
}

export interface Course {
  id: string;
  sectionId: string;
  title: string;
  playlistId: string | null;
  sourceUrl: string;
  order: number;
}

export interface Lesson {
  id: string;
  courseId: string;
  videoId: string;
  title: string;
  durationSec: number;
  order: number;
}

// ---- User data tables (synced via Supabase) ----
export interface Progress {
  id: string; // == lessonId
  lessonId: string;
  status: LessonStatus;
  completedAt: number | null;
  updatedAt: number;
  deleted: number; // 0 | 1
  dirty: number; // 0 | 1
}

export interface Note {
  id: string; // == lessonId
  lessonId: string;
  markdown: string;
  updatedAt: number;
  deleted: number;
  dirty: number;
}

export interface MediaItem {
  id: string;
  lessonId: string;
  kind: "image" | "audio";
  blob?: Blob; // local copy
  mime: string;
  storagePath: string | null; // supabase storage key once uploaded
  createdAt: number;
  updatedAt: number;
  deleted: number;
  dirty: number;
}

export interface Flair {
  id: string;
  lessonId: string;
  kind: FlairKind;
  createdAt: number;
  updatedAt: number;
  deleted: number;
  dirty: number;
}
