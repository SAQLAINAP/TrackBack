import { Link, useParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../lib/db";
import { useCourses, useProgressMap } from "../lib/queries";
import { Card, ProgressBar } from "../components/ui";
import { fmtHours, pct } from "../lib/format";
import type { Course } from "../lib/types";

export function SectionPage() {
  const { sectionId } = useParams();
  const section = useLiveQuery(() => (sectionId ? db.sections.get(sectionId) : undefined), [sectionId]);
  const courses = useCourses(sectionId);

  if (!section) return <div className="text-ink-faint">Loading…</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-ink-faint dark:text-zinc-500">
        <Link to="/" className="hover:text-ink dark:hover:text-white">
          ← Dashboard
        </Link>
      </div>
      <div className="flex items-center gap-3">
        <span className="h-4 w-4 rounded-full" style={{ backgroundColor: section.color }} />
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">{section.name}</h1>
      </div>

      <div className="grid gap-4">
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
    <Link to={`/course/${course.id}`}>
      <Card className="p-5">
        <div className="flex items-start justify-between gap-4">
          <h3 className="font-semibold leading-snug">{course.title}</h3>
          <span className="text-sm text-ink-faint dark:text-zinc-500 shrink-0">{p}%</span>
        </div>
        <div className="mt-3">
          <ProgressBar value={p} color={color} />
        </div>
        <div className="mt-3 text-sm text-ink-faint dark:text-zinc-500">
          {done}/{total} lessons{remainingSec ? ` · ${fmtHours(remainingSec)} left` : ""}
        </div>
      </Card>
    </Link>
  );
}
