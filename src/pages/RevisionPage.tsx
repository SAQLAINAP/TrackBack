import { useState } from "react";
import { Link } from "react-router-dom";
import { useFlaggedLessons } from "../lib/queries";
import { Card, PageTitle } from "../components/ui";
import { FlairChip } from "../components/FlairChip";
import { FLAIRS, type FlairKind } from "../lib/types";

export function RevisionPage() {
  const [filter, setFilter] = useState<FlairKind[]>(["revision_needed"]);
  const items = useFlaggedLessons(filter.length ? filter : undefined);

  const toggle = (k: FlairKind) =>
    setFilter((f) => (f.includes(k) ? f.filter((x) => x !== k) : [...f, k]));

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageTitle
        eyebrow="Revision"
        title="Revision queue"
        subtitle="Every lesson you flagged, across all courses."
      />

      <Card className="p-3.5 space-y-2.5">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="font-display font-semibold text-[13px] uppercase tracking-wider text-ink-faint dark:text-zinc-500">
            Filter
          </h3>
          <span className="text-xs text-ink-faint dark:text-zinc-500 tabular-nums">
            {items.length} lesson{items.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {FLAIRS.map((f) => (
            <FlairChip
              key={f.kind}
              kind={f.kind}
              active={filter.includes(f.kind)}
              onClick={() => toggle(f.kind)}
            />
          ))}
        </div>
      </Card>

      <div className="grid gap-3">
        {items.map((it) => (
          <Link key={it.lesson.id} to={`/lesson/${it.lesson.id}`} className="block">
            <Card className="p-4" interactive>
              <div className="text-[11px] uppercase tracking-wider text-ink-faint dark:text-zinc-500 truncate">
                {it.sectionName} · {it.courseTitle}
              </div>
              <div className="font-medium text-[14px] mt-1 leading-snug">{it.lesson.title}</div>
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {it.kinds.map((k) => (
                  <FlairChip key={k} kind={k} active size="sm" />
                ))}
              </div>
            </Card>
          </Link>
        ))}
        {items.length === 0 && (
          <Card className="p-8 text-center text-sm text-ink-faint dark:text-zinc-500">
            Nothing flagged{filter.length ? " for this filter" : ""}. Add flairs from any lesson.
          </Card>
        )}
      </div>
    </div>
  );
}
