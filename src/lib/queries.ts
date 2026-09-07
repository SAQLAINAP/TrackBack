import { useLiveQuery } from "dexie-react-hooks";
import { db } from "./db";
import { dayKey } from "./format";
import type { Course, FlairKind, Lesson, MediaItem, Progress, Section } from "./types";

export function useSections(): Section[] {
  return useLiveQuery(() => db.sections.orderBy("order").toArray(), [], [] as Section[]);
}

export function useCourses(sectionId?: string): Course[] {
  return useLiveQuery(
    () =>
      sectionId
        ? db.courses.where("sectionId").equals(sectionId).sortBy("order")
        : db.courses.orderBy("order").toArray(),
    [sectionId],
    [] as Course[],
  );
}

export function useLessons(courseId?: string): Lesson[] {
  return useLiveQuery(
    () =>
      courseId
        ? db.lessons.where("courseId").equals(courseId).sortBy("order")
        : Promise.resolve([] as Lesson[]),
    [courseId],
    [] as Lesson[],
  );
}

export function useLesson(lessonId?: string) {
  return useLiveQuery(() => (lessonId ? db.lessons.get(lessonId) : undefined), [lessonId]);
}

export function useCourse(courseId?: string) {
  return useLiveQuery(() => (courseId ? db.courses.get(courseId) : undefined), [courseId]);
}

// Map of lessonId -> Progress (only live, non-deleted rows)
export function useProgressMap(): Map<string, Progress> {
  return useLiveQuery(
    async () => {
      const rows = await db.progress.toArray();
      const m = new Map<string, Progress>();
      for (const r of rows) if (!r.deleted) m.set(r.lessonId, r);
      return m;
    },
    [],
    new Map<string, Progress>(),
  );
}

export interface CountStats {
  total: number;
  completed: number;
  inProgress: number;
  remainingSec: number;
  totalSec: number;
}

function statsFor(lessons: Lesson[], pmap: Map<string, Progress>): CountStats {
  let completed = 0,
    inProgress = 0,
    remainingSec = 0,
    totalSec = 0;
  for (const l of lessons) {
    totalSec += l.durationSec;
    const st = pmap.get(l.id)?.status;
    if (st === "completed") completed++;
    else {
      remainingSec += l.durationSec;
      if (st === "in_progress") inProgress++;
    }
  }
  return { total: lessons.length, completed, inProgress, remainingSec, totalSec };
}

export function useCourseStats(courseId: string): CountStats {
  const lessons = useLessons(courseId);
  const pmap = useProgressMap();
  return statsFor(lessons ?? [], pmap);
}

export function useSectionStats(sectionId: string): CountStats {
  const stats = useLiveQuery(
    async () => {
      const courses = await db.courses.where("sectionId").equals(sectionId).toArray();
      const ids = courses.map((c) => c.id);
      const lessons = await db.lessons.where("courseId").anyOf(ids).toArray();
      const prog = await db.progress.toArray();
      const pmap = new Map<string, Progress>();
      for (const r of prog) if (!r.deleted) pmap.set(r.lessonId, r);
      return statsFor(lessons, pmap);
    },
    [sectionId],
    { total: 0, completed: 0, inProgress: 0, remainingSec: 0, totalSec: 0 },
  );
  return stats;
}

export function useOverallStats(): CountStats {
  return useLiveQuery(
    async () => {
      const lessons = await db.lessons.toArray();
      const prog = await db.progress.toArray();
      const pmap = new Map<string, Progress>();
      for (const r of prog) if (!r.deleted) pmap.set(r.lessonId, r);
      return statsFor(lessons, pmap);
    },
    [],
    { total: 0, completed: 0, inProgress: 0, remainingSec: 0, totalSec: 0 },
  );
}

export interface StreakInfo {
  current: number;
  best: number;
  days: Record<string, number>; // dayKey -> count completed
}

export function useStreak(): StreakInfo {
  return useLiveQuery(
    async () => {
      const prog = await db.progress.toArray();
      const days: Record<string, number> = {};
      for (const p of prog) {
        if (p.deleted || p.status !== "completed" || !p.completedAt) continue;
        const k = dayKey(p.completedAt);
        days[k] = (days[k] ?? 0) + 1;
      }
      // compute current & best streak
      const set = new Set(Object.keys(days));
      const dstr = (d: Date) => dayKey(d.getTime());
      let current = 0;
      const cursor = new Date();
      // allow streak to count if today OR yesterday active
      if (!set.has(dstr(cursor))) cursor.setDate(cursor.getDate() - 1);
      while (set.has(dstr(cursor))) {
        current++;
        cursor.setDate(cursor.getDate() - 1);
      }
      let best = 0;
      const sorted = Object.keys(days).sort();
      let run = 0;
      let prev: Date | null = null;
      for (const k of sorted) {
        const [y, m, d] = k.split("-").map(Number);
        const cur = new Date(y, m - 1, d);
        if (prev) {
          const diff = Math.round((cur.getTime() - prev.getTime()) / 86400000);
          run = diff === 1 ? run + 1 : 1;
        } else run = 1;
        best = Math.max(best, run);
        prev = cur;
      }
      return { current, best, days };
    },
    [],
    { current: 0, best: 0, days: {} },
  );
}

// Up next: first non-completed lesson in course order across sections
export function useUpNext(): Lesson | undefined {
  return useLiveQuery(async () => {
    const courses = await db.courses.orderBy("order").toArray();
    // group by section order
    const sections = await db.sections.orderBy("order").toArray();
    const prog = await db.progress.toArray();
    const done = new Set(prog.filter((p) => !p.deleted && p.status === "completed").map((p) => p.lessonId));
    for (const s of sections) {
      const secCourses = courses.filter((c) => c.sectionId === s.id).sort((a, b) => a.order - b.order);
      for (const c of secCourses) {
        const lessons = await db.lessons.where("courseId").equals(c.id).sortBy("order");
        const next = lessons.find((l) => !done.has(l.id));
        if (next) return next;
      }
    }
    return undefined;
  }, []);
}

export function useNote(lessonId?: string) {
  return useLiveQuery(() => (lessonId ? db.notes.get(lessonId) : undefined), [lessonId]);
}

export function useLessonFlairs(lessonId?: string): Set<FlairKind> {
  return useLiveQuery(
    async () => {
      if (!lessonId) return new Set<FlairKind>();
      const rows = await db.flairs.where("lessonId").equals(lessonId).toArray();
      return new Set(rows.filter((r) => !r.deleted).map((r) => r.kind));
    },
    [lessonId],
    new Set<FlairKind>(),
  );
}

export function useLessonMedia(lessonId?: string) {
  return useLiveQuery(
    async () => {
      if (!lessonId) return [];
      const rows = await db.media.where("lessonId").equals(lessonId).toArray();
      return rows.filter((r) => !r.deleted).sort((a, b) => a.createdAt - b.createdAt);
    },
    [lessonId],
    [] as MediaItem[],
  );
}

export interface RevisionItem {
  lesson: Lesson;
  courseTitle: string;
  sectionName: string;
  kinds: FlairKind[];
}

export function useFlaggedLessons(filterKinds?: FlairKind[]): RevisionItem[] {
  return useLiveQuery(
    async () => {
      const flairs = (await db.flairs.toArray()).filter((f) => !f.deleted);
      const byLesson = new Map<string, FlairKind[]>();
      for (const f of flairs) {
        if (filterKinds && !filterKinds.includes(f.kind)) continue;
        const arr = byLesson.get(f.lessonId) ?? [];
        arr.push(f.kind);
        byLesson.set(f.lessonId, arr);
      }
      const out: RevisionItem[] = [];
      const courses = await db.courses.toArray();
      const sections = await db.sections.toArray();
      const cMap = new Map(courses.map((c) => [c.id, c]));
      const sMap = new Map(sections.map((s) => [s.id, s]));
      for (const [lessonId, kinds] of byLesson) {
        const lesson = await db.lessons.get(lessonId);
        if (!lesson) continue;
        const course = cMap.get(lesson.courseId);
        const section = course ? sMap.get(course.sectionId) : undefined;
        out.push({
          lesson,
          courseTitle: course?.title ?? "",
          sectionName: section?.name ?? "",
          kinds,
        });
      }
      return out.sort((a, b) => a.lesson.title.localeCompare(b.lesson.title));
    },
    [JSON.stringify(filterKinds ?? [])],
    [] as RevisionItem[],
  );
}

export interface SearchHit {
  lesson: Lesson;
  courseTitle: string;
  snippet?: string;
}

export function useSearch(q: string): SearchHit[] {
  return useLiveQuery(
    async () => {
      const query = q.trim().toLowerCase();
      if (query.length < 2) return [];
      const lessons = await db.lessons.toArray();
      const notes = await db.notes.toArray();
      const noteMap = new Map(notes.filter((n) => !n.deleted).map((n) => [n.lessonId, n.markdown]));
      const courses = await db.courses.toArray();
      const cMap = new Map(courses.map((c) => [c.id, c.title]));
      const hits: SearchHit[] = [];
      for (const l of lessons) {
        const inTitle = l.title.toLowerCase().includes(query);
        const noteText = noteMap.get(l.id);
        const inNote = noteText?.toLowerCase().includes(query);
        if (inTitle || inNote) {
          let snippet: string | undefined;
          if (inNote && noteText) {
            const idx = noteText.toLowerCase().indexOf(query);
            snippet = noteText.slice(Math.max(0, idx - 30), idx + 40).replace(/\n/g, " ");
          }
          hits.push({ lesson: l, courseTitle: cMap.get(l.courseId) ?? "", snippet });
        }
        if (hits.length > 60) break;
      }
      return hits;
    },
    [q],
    [] as SearchHit[],
  );
}
