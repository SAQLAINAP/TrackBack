import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../lib/db";
import { useCourse, useLessons, useProgressMap } from "../lib/queries";
import { Card, ProgressBar } from "../components/ui";
import { fmtDuration, fmtDate, pct } from "../lib/format";
import { toggleComplete } from "../lib/repo";
import { FLAIRS, type FlairKind, type LessonStatus } from "../lib/types";
import { FLAIR_MAP } from "../lib/types";

type StatusFilter = "all" | LessonStatus;

export function CoursePage() {
  const { courseId } = useParams();
  const course = useCourse(courseId);
  const lessons = useLessons(courseId);
  const pmap = useProgressMap();

  const [status, setStatus] = useState<StatusFilter>("all");
  const [flair, setFlair] = useState<FlairKind | "all">("all");
  const [text, setText] = useState("");

  const flairMap = useLiveQuery(
    async () => {
      if (!courseId) return new Map<string, FlairKind[]>();
      const ids = lessons.map((l) => l.id);
      const rows = (await db.flairs.where("lessonId").anyOf(ids).toArray()).filter((f) => !f.deleted);
      const m = new Map<string, FlairKind[]>();
      for (const r of rows) {
        const a = m.get(r.lessonId) ?? [];
        a.push(r.kind);
        m.set(r.lessonId, a);
      }
      return m;
    },
    [courseId, lessons.length],
    new Map<string, FlairKind[]>(),
  );

  const noteSet = useLiveQuery(
    async () => {
      const ids = lessons.map((l) => l.id);
      const rows = (await db.notes.where("lessonId").anyOf(ids).toArray()).filter(
        (n) => !n.deleted && n.markdown.trim(),
      );
      return new Set(rows.map((n) => n.lessonId));
    },
    [lessons.length],
    new Set<string>(),
  );

  const filtered = useMemo(() => {
    const q = text.trim().toLowerCase();
    return lessons.filter((l) => {
      const st = pmap.get(l.id)?.status ?? "not_started";
      if (status !== "all" && st !== status) return false;
      if (flair !== "all" && !(flairMap.get(l.id) ?? []).includes(flair)) return false;
      if (q && !l.title.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [lessons, pmap, status, flair, flairMap, text]);

  if (!course) return <div className="text-ink-faint">Loading…</div>;

  const total = lessons.length;
  const done = lessons.filter((l) => pmap.get(l.id)?.status === "completed").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-ink-faint dark:text-zinc-500">
        <Link to={`/section/${course.sectionId}`} className="hover:text-ink dark:hover:text-white">
          ← Back
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight leading-snug">{course.title}</h1>
        <div className="mt-3 flex items-center gap-3">
          <ProgressBar value={pct(done, total)} />
          <span className="text-sm text-ink-faint dark:text-zinc-500 shrink-0">
            {done}/{total}
          </span>
        </div>
        <a
          href={course.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-block mt-2 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          Open on YouTube ↗
        </a>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Filter lessons…"
          className="rounded-xl bg-zinc-100 dark:bg-zinc-900 px-3 py-1.5 text-sm outline-none border border-transparent focus:border-zinc-300 dark:focus:border-zinc-700"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as StatusFilter)}
          className="rounded-xl bg-zinc-100 dark:bg-zinc-900 px-3 py-1.5 text-sm outline-none"
        >
          <option value="all">All status</option>
          <option value="not_started">Not started</option>
          <option value="in_progress">In progress</option>
          <option value="completed">Completed</option>
        </select>
        <select
          value={flair}
          onChange={(e) => setFlair(e.target.value as FlairKind | "all")}
          className="rounded-xl bg-zinc-100 dark:bg-zinc-900 px-3 py-1.5 text-sm outline-none"
        >
          <option value="all">All flairs</option>
          {FLAIRS.map((f) => (
            <option key={f.kind} value={f.kind}>
              {f.emoji} {f.label}
            </option>
          ))}
        </select>
        <span className="text-sm text-ink-faint dark:text-zinc-500 ml-auto">{filtered.length} shown</span>
      </div>

      <Card className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {filtered.map((l, i) => {
          const prog = pmap.get(l.id);
          const st = prog?.status ?? "not_started";
          const kinds = flairMap.get(l.id) ?? [];
          return (
            <div key={l.id} className="flex items-center gap-3 px-4 py-3">
              <button
                onClick={() => toggleComplete(l.id)}
                title="Toggle complete"
                className={`shrink-0 h-6 w-6 rounded-full border-2 grid place-items-center transition ${
                  st === "completed"
                    ? "bg-emerald-500 border-emerald-500 text-white"
                    : "border-zinc-300 dark:border-zinc-600 hover:border-emerald-400"
                }`}
              >
                {st === "completed" ? "✓" : ""}
              </button>
              <Link to={`/lesson/${l.id}`} className="min-w-0 flex-1">
                <div
                  className={`truncate ${st === "completed" ? "text-ink-faint dark:text-zinc-500 line-through" : ""}`}
                >
                  <span className="text-ink-faint dark:text-zinc-600 tabular-nums mr-2">{i + 1}.</span>
                  {l.title}
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-ink-faint dark:text-zinc-500">
                  {l.durationSec > 0 && <span className="tabular-nums">{fmtDuration(l.durationSec)}</span>}
                  {st === "completed" && prog?.completedAt && <span>· done {fmtDate(prog.completedAt)}</span>}
                  {noteSet.has(l.id) && <span>· 📝</span>}
                  {kinds.map((k) => (
                    <span key={k} title={FLAIR_MAP[k].label}>
                      {FLAIR_MAP[k].emoji}
                    </span>
                  ))}
                </div>
              </Link>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="px-4 py-8 text-center text-ink-faint dark:text-zinc-500">No lessons match.</div>
        )}
      </Card>
    </div>
  );
}
