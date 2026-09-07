import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../lib/db";
import { useCourse, useLessons, useProgressMap } from "../lib/queries";
import { Card, ProgressBar } from "../components/ui";
import { IconArrowLeft, IconCheck, IconExternal, IconNote } from "../components/icons";
import { fmtDuration, fmtDate, pct } from "../lib/format";
import { toggleComplete } from "../lib/repo";
import { FLAIRS, type FlairKind, type LessonStatus } from "../lib/types";
import { FLAIR_MAP } from "../lib/types";

type StatusFilter = "all" | LessonStatus;

/** Shared control chrome so the filter row reads as one uniform strip. */
const CONTROL =
  "h-10 w-full rounded-xl bg-black/[0.04] dark:bg-white/[0.06] border border-transparent px-3 text-sm outline-none transition focus:border-accent-400/50 focus:bg-white dark:focus:bg-white/[0.09]";

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
    <div className="space-y-5 sm:space-y-6">
      <Link
        to={`/section/${course.sectionId}`}
        className="inline-flex items-center gap-1.5 text-sm text-ink-faint dark:text-zinc-500 hover:text-ink dark:hover:text-white transition"
      >
        <IconArrowLeft size={16} className="shrink-0" />
        Back
      </Link>

      <div className="space-y-3">
        <h1 className="font-display text-[21px] sm:text-[26px] font-bold tracking-tight leading-snug text-ink dark:text-white">
          {course.title}
        </h1>
        <div className="flex items-center gap-3">
          <ProgressBar value={pct(done, total)} />
          <span className="text-sm font-semibold tabular-nums shrink-0">
            {done}/{total}
          </span>
        </div>
        <a
          href={course.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-accent-600 dark:text-accent-300 hover:underline"
        >
          Open on YouTube
          <IconExternal size={14} />
        </a>
      </div>

      {/* Filters — stacked on mobile so nothing overflows the viewport */}
      <div className="space-y-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Filter lessons…"
          className={`${CONTROL} placeholder:text-ink-faint dark:placeholder:text-zinc-500`}
        />
        <div className="grid grid-cols-2 gap-2">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusFilter)}
            className={CONTROL}
          >
            <option value="all">All status</option>
            <option value="not_started">Not started</option>
            <option value="in_progress">In progress</option>
            <option value="completed">Completed</option>
          </select>
          <select
            value={flair}
            onChange={(e) => setFlair(e.target.value as FlairKind | "all")}
            className={CONTROL}
          >
            <option value="all">All flairs</option>
            {FLAIRS.map((f) => (
              <option key={f.kind} value={f.kind}>
                {f.emoji} {f.label}
              </option>
            ))}
          </select>
        </div>
        <p className="text-xs text-ink-faint dark:text-zinc-500 text-right tabular-nums">
          {filtered.length} of {total} shown
        </p>
      </div>

      <Card className="divide-y divide-black/[0.05] dark:divide-white/[0.06] overflow-hidden">
        {filtered.map((l, i) => {
          const prog = pmap.get(l.id);
          const st = prog?.status ?? "not_started";
          const kinds = flairMap.get(l.id) ?? [];
          const isDone = st === "completed";
          return (
            <div key={l.id} className="flex items-center gap-2.5 pl-2 pr-3 py-1">
              {/* 44px touch target keeps taps reliable on a phone */}
              <button
                onClick={() => toggleComplete(l.id)}
                aria-label={isDone ? "Mark incomplete" : "Mark complete"}
                className="shrink-0 h-11 w-11 grid place-items-center rounded-xl active:scale-90 transition"
              >
                <span
                  className={`h-6 w-6 rounded-full border-2 grid place-items-center transition ${
                    isDone
                      ? "bg-emerald-500 border-emerald-500 text-white shadow-[0_0_12px_rgba(16,185,129,0.45)]"
                      : "border-black/20 dark:border-white/25"
                  }`}
                >
                  {isDone && <IconCheck size={13} strokeWidth={3} />}
                </span>
              </button>
              <Link to={`/lesson/${l.id}`} className="min-w-0 flex-1 py-2.5">
                <div className="flex items-baseline gap-2 min-w-0">
                  <span className="text-[11px] text-ink-faint dark:text-zinc-600 tabular-nums shrink-0">
                    {i + 1}
                  </span>
                  <span
                    className={`text-[14px] leading-snug line-clamp-2 ${
                      isDone ? "text-ink-faint dark:text-zinc-500" : "text-ink dark:text-zinc-100"
                    }`}
                  >
                    {l.title}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-1 pl-[1.1rem] text-[11px] text-ink-faint dark:text-zinc-500">
                  {l.durationSec > 0 && (
                    <span className="tabular-nums">{fmtDuration(l.durationSec)}</span>
                  )}
                  {isDone && prog?.completedAt && <span>· {fmtDate(prog.completedAt)}</span>}
                  {noteSet.has(l.id) && (
                    <span className="inline-flex items-center gap-1" title="Has notes">
                      ·<IconNote size={11} />
                    </span>
                  )}
                  {kinds.length > 0 && (
                    <span className="inline-flex items-center gap-1">
                      ·
                      <span className="inline-flex items-center gap-1">
                        {kinds.map((k) => (
                          <span
                            key={k}
                            title={FLAIR_MAP[k].label}
                            className="h-1.5 w-1.5 rounded-full"
                            style={{ backgroundColor: FLAIR_MAP[k].hex }}
                          />
                        ))}
                      </span>
                    </span>
                  )}
                </div>
              </Link>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="px-4 py-10 text-center text-sm text-ink-faint dark:text-zinc-500">
            No lessons match.
          </div>
        )}
      </Card>
    </div>
  );
}
