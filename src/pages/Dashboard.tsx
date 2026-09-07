import { Link } from "react-router-dom";
import { useSections, useOverallStats, useStreak, useUpNext, useProgressMap } from "../lib/queries";
import { db } from "../lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import { Card, Ring, ProgressBar } from "../components/ui";
import { StreakHeatmap } from "../components/StreakHeatmap";
import { fmtHours, fmtDate, pct } from "../lib/format";
import type { Section } from "../lib/types";

export function Dashboard() {
  const sections = useSections();
  const overall = useOverallStats();
  const streak = useStreak();
  const upNext = useUpNext();

  const overallPct = pct(overall.completed, overall.total);

  // projected finish: pace = completions in last 14 days / 14
  const last14 = Object.entries(streak.days)
    .filter(([k]) => {
      const [y, m, d] = k.split("-").map(Number);
      const diff = (Date.now() - new Date(y, m - 1, d).getTime()) / 86400000;
      return diff <= 14;
    })
    .reduce((a, [, c]) => a + c, 0);
  const pace = last14 / 14; // lessons/day
  const remainingLessons = overall.total - overall.completed;
  const projectedDate =
    pace > 0 && remainingLessons > 0
      ? fmtDate(Date.now() + (remainingLessons / pace) * 86400000)
      : null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Your courses</h1>
        <p className="text-ink-faint dark:text-zinc-500 mt-1">
          Keep the streak alive. One lesson at a time.
        </p>
      </div>

      {/* Overview */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5 flex items-center gap-4">
          <Ring value={overallPct} size={84} color="#6366f1" />
          <div>
            <div className="text-sm text-ink-faint dark:text-zinc-500">Overall</div>
            <div className="text-2xl font-semibold">
              {overall.completed}
              <span className="text-ink-faint dark:text-zinc-500 text-lg">/{overall.total}</span>
            </div>
            <div className="text-xs text-ink-faint dark:text-zinc-500">lessons done</div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="text-sm text-ink-faint dark:text-zinc-500">Remaining</div>
          <div className="text-2xl font-semibold mt-1">{fmtHours(overall.remainingSec)}</div>
          <div className="text-xs text-ink-faint dark:text-zinc-500 mt-1">
            {projectedDate ? (
              <>at {pace.toFixed(1)}/day → finish <span className="font-medium">{projectedDate}</span></>
            ) : (
              "complete a lesson to project a finish date"
            )}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-baseline justify-between">
            <div className="text-sm text-ink-faint dark:text-zinc-500">Streak</div>
            <div className="text-xs text-ink-faint dark:text-zinc-500">best {streak.best}d</div>
          </div>
          <div className="text-2xl font-semibold mt-1">🔥 {streak.current} days</div>
          <div className="mt-3">
            <StreakHeatmap days={streak.days} />
          </div>
        </Card>
      </div>

      {/* Up next */}
      {upNext && (
        <Card className="p-5 flex items-center justify-between">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-wide text-ink-faint dark:text-zinc-500">Up next</div>
            <div className="font-medium truncate">{upNext.title}</div>
          </div>
          <Link
            to={`/lesson/${upNext.id}`}
            className="shrink-0 ml-4 inline-flex items-center gap-2 rounded-xl bg-ink text-white dark:bg-white dark:text-black px-4 py-2 font-medium hover:opacity-90 transition"
          >
            Resume →
          </Link>
        </Card>
      )}

      {/* Sections */}
      <div className="grid gap-4 sm:grid-cols-2">
        {sections.map((s) => (
          <SectionCard key={s.id} section={s} />
        ))}
      </div>
    </div>
  );
}

function SectionCard({ section }: { section: Section }) {
  const pmap = useProgressMap();
  const data = useLiveQuery(
    async () => {
      const courses = await db.courses.where("sectionId").equals(section.id).sortBy("order");
      const ids = courses.map((c) => c.id);
      const lessons = await db.lessons.where("courseId").anyOf(ids).toArray();
      return { courses: courses.length, lessons };
    },
    [section.id],
    { courses: 0, lessons: [] },
  );
  const total = data.lessons.length;
  const done = data.lessons.filter((l) => pmap.get(l.id)?.status === "completed").length;
  const p = pct(done, total);

  return (
    <Link to={`/section/${section.id}`}>
      <Card className="p-5 h-full">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: section.color }} />
            <h3 className="font-semibold text-lg">{section.name}</h3>
          </div>
          <span className="text-sm text-ink-faint dark:text-zinc-500">{p}%</span>
        </div>
        <div className="mt-3">
          <ProgressBar value={p} color={section.color} />
        </div>
        <div className="mt-3 text-sm text-ink-faint dark:text-zinc-500">
          {done}/{total} lessons · {data.courses} course{data.courses !== 1 ? "s" : ""}
        </div>
      </Card>
    </Link>
  );
}
