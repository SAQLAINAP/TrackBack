import { useSearchParams, Link } from "react-router-dom";
import { useState } from "react";
import { useSearch } from "../lib/queries";
import { Card } from "../components/ui";

export function SearchPage() {
  const [params, setParams] = useSearchParams();
  const initial = params.get("q") ?? "";
  const [q, setQ] = useState(initial);
  const hits = useSearch(q);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Search</h1>
      <input
        autoFocus
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setParams(e.target.value ? { q: e.target.value } : {});
        }}
        placeholder="Search lessons & notes…"
        className="w-full rounded-xl bg-zinc-100 dark:bg-zinc-900 px-4 py-2.5 outline-none border border-transparent focus:border-zinc-300 dark:focus:border-zinc-700"
      />

      {q.trim().length >= 2 && (
        <div className="text-sm text-ink-faint dark:text-zinc-500">{hits.length} results</div>
      )}

      <div className="grid gap-3">
        {hits.map((h) => (
          <Link key={h.lesson.id} to={`/lesson/${h.lesson.id}`}>
            <Card className="p-4">
              <div className="text-xs text-ink-faint dark:text-zinc-500">{h.courseTitle}</div>
              <div className="font-medium mt-0.5 leading-snug">{h.lesson.title}</div>
              {h.snippet && (
                <div className="text-sm text-ink-faint dark:text-zinc-500 mt-1">…{h.snippet}…</div>
              )}
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
