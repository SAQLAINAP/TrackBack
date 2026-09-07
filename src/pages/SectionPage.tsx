import { Link, useParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../lib/db";
import { useCourses, useProgressMap } from "../lib/queries";
import { Card, ProgressBar } from "../components/ui";
import { IconArrowLeft } from "../components/icons";
import { fmtHours, pct } from "../lib/format";
import type { Course } from "../lib/types";

export function SectionPage() {
  const { sectionId } = useParams();
  const section = useLiveQuery(() => (sectionId ? db.sections.get(sectionId) : undefined), [sectionId]);
  const courses = useCourses(sectionId);

  if (!section) return <div className="text-ink-faint">Loading…</div>;

  return (
    <div className="space-y-5 sm:space-y-6">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-sm text-ink-faint dark:text-zinc-500 hover:text-ink dark:hover:text-white transition"
      >
        <IconArrowLeft size={16} className="shrink-0" />
        Dashboard
      </Link>

      <div className="flex items-center gap-2.5">
        <span
          className="h-3 w-3 shrink-0 rounded-full"
          style={{ backgroundColor: section.color, boxShadow: `0 0 12px ${section.color}aa` }}
        />
        <h1 className="font-display text-[24px] sm:text-3xl font-bold tracking-tight text-ink dark:text-white">
          {section.name}
        </h1>
      </div>

      <div className="grid gap-3 sm:gap-4">
        {courses.map((c) => (
          <CourseRow key={c.id} course={c} color={section.color} />
        ))}
      </div>
    </div>
  );
}

function CourseRow({ course, color }: { course: Course; color: string }) {
  const pmap = useProgressMap();
  const lessons = useLiveQuery(
    () => db.lessons.where("courseId").equals(course.id).toArray(),
    [course.id],
    [],
  );
  const total = lessons.length;
  const done = lessons.filter((l) => pmap.get(l.id)?.status === "completed").length;
  const remainingSec = lessons
    .filter((l) => pmap.get(l.id)?.status !== "completed")
    .reduce((a, l) => a + l.durationSec, 0);
  const p = pct(done, total);

  return (
    <Link to={`/course/${course.id}`} className="block">
      <Card className="p-4 sm:p-5" interactive>
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-display font-semibold text-[15px] leading-snug min-w-0">
            {course.title}
          </h3>
          <span className="text-sm font-semibold tabular-nums shrink-0">{p}%</span>
        </div>
        <ProgressBar value={p} color={color} className="mt-3.5" />
        <div className="mt-2.5 text-[13px] text-ink-faint dark:text-zinc-500">
          {done}/{total} lessons{remainingSec ? ` · ${fmtHours(remainingSec)} left` : ""}
        </div>
      </Card>
    </Link>
  );
}
