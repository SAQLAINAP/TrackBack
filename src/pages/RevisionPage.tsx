import { useState } from "react";
import { Link } from "react-router-dom";
import { useFlaggedLessons } from "../lib/queries";
import { Card } from "../components/ui";
import { FlairChip } from "../components/FlairChip";
import { FLAIRS, type FlairKind } from "../lib/types";

export function RevisionPage() {
  const [filter, setFilter] = useState<FlairKind[]>(["revision_needed"]);
  const items = useFlaggedLessons(filter.length ? filter : undefined);

  const toggle = (k: FlairKind) =>
    setFilter((f) => (f.includes(k) ? f.filter((x) => x !== k) : [...f, k]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Revision queue</h1>
        <p className="text-ink-faint dark:text-zinc-500 mt-1">
          Every lesson you flagged, across all courses.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FLAIRS.map((f) => (
          <FlairChip key={f.kind} kind={f.kind} active={filter.includes(f.kind)} onClick={() => toggle(f.kind)} />
        ))}
      </div>

      <div className="grid gap-3">
        {items.map((it) => (
          <Link key={it.lesson.id} to={`/lesson/${it.lesson.id}`}>
            <Card className="p-4">
              <div className="text-xs text-ink-faint dark:text-zinc-500">
                {it.sectionName} · {it.courseTitle}
              </div>
              <div className="font-medium mt-0.5 leading-snug">{it.lesson.title}</div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {it.kinds.map((k) => (
                  <FlairChip key={k} kind={k} active size="sm" />
                ))}
              </div>
            </Card>
          </Link>
        ))}
        {items.length === 0 && (
          <Card className="p-8 text-center text-ink-faint dark:text-zinc-500">
            Nothing flagged{filter.length ? " for this filter" : ""}. Add flairs from any lesson.
          </Card>
        )}
      </div>
    </div>
  );
}
