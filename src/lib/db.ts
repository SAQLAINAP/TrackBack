import Dexie, { type Table } from "dexie";
import type {
  Section,
  Course,
  Lesson,
  Progress,
  Note,
  MediaItem,
  Flair,
} from "./types";

export interface MetaRow {
  key: string;
  value: unknown;
}

export class CourseDB extends Dexie {
  sections!: Table<Section, string>;
  courses!: Table<Course, string>;
  lessons!: Table<Lesson, string>;
  progress!: Table<Progress, string>;
  notes!: Table<Note, string>;
  media!: Table<MediaItem, string>;
  flairs!: Table<Flair, string>;
  meta!: Table<MetaRow, string>;

  constructor() {
    super("course-tracker");
    this.version(1).stores({
      sections: "id, order",
      courses: "id, sectionId, order",
      lessons: "id, courseId, order, videoId",
      progress: "id, lessonId, status, completedAt, dirty",
      notes: "id, lessonId, dirty, updatedAt",
      media: "id, lessonId, kind, dirty, updatedAt",
      flairs: "id, lessonId, kind, dirty, updatedAt",
      meta: "key",
    });
  }
}

export const db = new CourseDB();

export async function getMeta<T = unknown>(key: string): Promise<T | undefined> {
  const row = await db.meta.get(key);
  return row?.value as T | undefined;
}

export async function setMeta(key: string, value: unknown): Promise<void> {
  await db.meta.put({ key, value });
}
