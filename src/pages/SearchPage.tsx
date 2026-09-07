import { useSearchParams, Link } from "react-router-dom";
import { useState } from "react";
import { useSearch } from "../lib/queries";
import { Card, PageTitle } from "../components/ui";
import { IconSearch } from "../components/icons";

export function SearchPage() {
  const [params, setParams] = useSearchParams();
  const initial = params.get("q") ?? "";
  const [q, setQ] = useState(initial);
  const hits = useSearch(q);
  const active = q.trim().length >= 2;

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageTitle eyebrow="Search" title="Find anything" />

      <div className="relative">
        <IconSearch
          size={18}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint dark:text-zinc-500 pointer-events-none"
        />
        <input
          autoFocus
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setParams(e.target.value ? { q: e.target.value } : {});
          }}
          placeholder="Search lessons & notes…"
          className="w-full h-12 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] border border-transparent pl-11 pr-4 text-[15px] outline-none transition focus:border-accent-400/50 focus:bg-white dark:focus:bg-white/[0.09] placeholder:text-ink-faint dark:placeholder:text-zinc-500"
        />
      </div>

      {active && (
        <div className="text-xs text-ink-faint dark:text-zinc-500 tabular-nums">
          {hits.length} result{hits.length !== 1 ? "s" : ""}
        </div>
      )}

      <div className="grid gap-3">
        {hits.map((h) => (
          <Link key={h.lesson.id} to={`/lesson/${h.lesson.id}`} className="block">
            <Card className="p-4" interactive>
              <div className="text-[11px] uppercase tracking-wider text-ink-faint dark:text-zinc-500 truncate">
                {h.courseTitle}
              </div>
              <div className="font-medium text-[14px] mt-1 leading-snug">{h.lesson.title}</div>
              {h.snippet && (
                <div className="text-[13px] text-ink-soft dark:text-zinc-400 mt-1.5 leading-relaxed">
                  …{h.snippet}…
                </div>
              )}
            </Card>
          </Link>
        ))}
        {active && hits.length === 0 && (
          <Card className="p-8 text-center text-sm text-ink-faint dark:text-zinc-500">
            No matches for “{q.trim()}”.
          </Card>
        )}
      </div>
    </div>
  );
}
