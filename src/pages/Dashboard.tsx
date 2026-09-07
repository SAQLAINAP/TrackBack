import { Link } from "react-router-dom";
import {
  useSections,
  useOverallStats,
  useStreak,
  useUpNext,
  useProgressMap,
  useTodayCount,
} from "../lib/queries";
import { db } from "../lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import { Card, Ring, ProgressBar, PageTitle } from "../components/ui";
import { StreakHeatmap } from "../components/StreakHeatmap";
import { IconArrowRight, IconCheck, IconFlame, IconPlay } from "../components/icons";
import { usePrefs } from "../lib/prefs";
import { fmtHours, fmtDate, fmtDuration, pct } from "../lib/format";
import type { Section } from "../lib/types";

export function Dashboard() {
  const sections = useSections();
  const overall = useOverallStats();
  const streak = useStreak();
  const upNext = useUpNext();
  const today = useTodayCount();
  const dailyGoal = usePrefs((s) => s.dailyGoal);

  const overallPct = pct(overall.completed, overall.total);
  const goalMet = dailyGoal > 0 && today >= dailyGoal;

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
    <div className="space-y-6 sm:space-y-8">
      <PageTitle
        eyebrow="Dashboard"
        title="Your courses"
        subtitle="Keep the streak alive. One lesson at a time."
      />

      {/* Hero — overall progress */}
      <Card className="p-5 sm:p-6 relative overflow-hidden">
        {/* soft accent bloom so the card glows instead of reading flat */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-16 -right-10 h-48 w-48 rounded-full opacity-70 blur-2xl"
          style={{
            background:
              "radial-gradient(circle, rgba(99,102,241,0.22), rgba(217,70,239,0.10) 55%, transparent 70%)",
          }}
        />
        <div className="relative flex items-center gap-5">
          <Ring value={overallPct} size={92} stroke={8} color="#6366f1" />
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint dark:text-zinc-500">
              Overall progress
            </div>
            <div className="font-display text-[28px] font-bold leading-tight tracking-tight mt-0.5">
              {overall.completed}
              <span className="text-ink-faint dark:text-zinc-500 text-xl font-semibold">
                /{overall.total}
              </span>
            </div>
            <div className="text-sm text-ink-soft dark:text-zinc-400">
              lessons complete · {fmtHours(overall.remainingSec)} left
            </div>
            {projectedDate && (
              <div className="text-[13px] text-ink-faint dark:text-zinc-500 mt-1">
                on track to finish {projectedDate} · {pace.toFixed(1)}/day
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Stats — equal-height cards */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
        <StatCard
          label="Today's goal"
          trailing={dailyGoal > 0 ? `${dailyGoal}/day` : "off"}
        >
          {dailyGoal > 0 ? (
            <div className="flex items-center gap-3.5">
              <Ring
                value={pct(Math.min(today, dailyGoal), dailyGoal)}
                size={56}
                stroke={6}
                color={goalMet ? "#10b981" : "#6366f1"}
                label={
                  goalMet ? (
                    <IconCheck size={20} className="text-emerald-500" />
                  ) : (
                    <span className="font-display text-[13px] font-bold tabular-nums">{today}</span>
                  )
                }
              />
              <div className="min-w-0">
                <div className="font-display text-2xl font-bold tracking-tight">
                  {today}
                  <span className="text-ink-faint dark:text-zinc-500 text-base font-semibold">
                    /{dailyGoal}
                  </span>
                </div>
                <div className="text-xs text-ink-faint dark:text-zinc-500 mt-0.5">
                  {goalMet
                    ? "goal met — nice work"
                    : `${dailyGoal - today} to go today`}
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="font-display text-2xl font-bold tracking-tight text-ink-faint dark:text-zinc-500">
                —
              </div>
              <div className="text-xs text-ink-faint dark:text-zinc-500 mt-1">
                set a daily goal in Settings
              </div>
            </>
          )}
        </StatCard>

        <StatCard label="Streak" trailing={`best ${streak.best}d`}>
          <div className="flex items-center gap-1.5 font-display text-2xl font-bold tracking-tight">
            <IconFlame
              size={22}
              className={streak.current > 0 ? "text-orange-500" : "text-ink-faint dark:text-zinc-600"}
            />
            {streak.current}
            <span className="text-base font-semibold text-ink-faint dark:text-zinc-500">
              {streak.current === 1 ? "day" : "days"}
            </span>
          </div>
          <div className="mt-3">
            <StreakHeatmap days={streak.days} />
          </div>
        </StatCard>
      </div>

      {/* Up next */}
      {upNext && (
        <Card className="p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <span className="hidden sm:grid place-items-center h-10 w-10 shrink-0 rounded-xl bg-accent-500/10 dark:bg-accent-400/15 text-accent-500 dark:text-accent-300">
              <IconPlay size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-accent-500 dark:text-accent-300">
                Up next
              </div>
              <div className="font-medium truncate mt-0.5">{upNext.lesson.title}</div>
              <div className="text-xs text-ink-faint dark:text-zinc-500 truncate mt-0.5">
                {upNext.courseTitle}
                {upNext.resumeSec > 15 && ` · paused at ${fmtDuration(upNext.resumeSec)}`}
              </div>
            </div>
            <Link
              to={`/lesson/${upNext.lesson.id}`}
              className="shrink-0 inline-flex items-center gap-1.5 h-10 px-4 rounded-xl bg-accent-grad text-white text-sm font-medium shadow-glow hover:shadow-glow-lg active:scale-[0.97] transition"
            >
              {upNext.resumeSec > 15 ? "Resume" : "Start"}
              <IconArrowRight size={16} />
            </Link>
          </div>
        </Card>
      )}

      {/* Sections */}
      <div className="space-y-3">
        <h2 className="font-display font-semibold text-[15px] text-ink-soft dark:text-zinc-400">
          Sections
        </h2>
        <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
          {sections.map((s) => (
            <SectionCard key={s.id} section={s} />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Uniform stat tile so every box in the row lines up. */
function StatCard({
  label,
  trailing,
  children,
}: {
  label: string;
  trailing?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-4 sm:p-5 h-full flex flex-col">
      <div className="flex items-baseline justify-between gap-2">
        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint dark:text-zinc-500">
          {label}
        </div>
        {trailing && (
          <div className="text-[11px] text-ink-faint dark:text-zinc-500 shrink-0">{trailing}</div>
        )}
      </div>
      <div className="mt-1.5">{children}</div>
    </Card>
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
    <Link to={`/section/${section.id}`} className="block">
      <Card className="p-4 sm:p-5 h-full" interactive>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: section.color, boxShadow: `0 0 10px ${section.color}99` }}
            />
            <h3 className="font-display font-semibold text-[16px] truncate">{section.name}</h3>
          </div>
          <span className="text-sm font-semibold tabular-nums shrink-0">{p}%</span>
        </div>
        <ProgressBar value={p} color={section.color} className="mt-3.5" />
        <div className="mt-2.5 text-[13px] text-ink-faint dark:text-zinc-500">
          {done}/{total} lessons · {data.courses} course{data.courses !== 1 ? "s" : ""}
        </div>
      </Card>
    </Link>
  );
}
