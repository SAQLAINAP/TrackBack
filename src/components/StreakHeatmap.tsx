import { dayKey } from "../lib/format";

// GitHub-style contribution heatmap for the last ~17 weeks.
export function StreakHeatmap({ days }: { days: Record<string, number> }) {
  const weeks = 17;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // start on the Sunday of the earliest visible week
  const start = new Date(today);
  start.setDate(start.getDate() - (weeks * 7 - 1));
  start.setDate(start.getDate() - start.getDay());

  const cols: { key: string; count: number; future: boolean }[][] = [];
  const cur = new Date(start);
  for (let w = 0; w < weeks; w++) {
    const col: { key: string; count: number; future: boolean }[] = [];
    for (let d = 0; d < 7; d++) {
      const k = dayKey(cur.getTime());
      col.push({ key: k, count: days[k] ?? 0, future: cur.getTime() > today.getTime() });
      cur.setDate(cur.getDate() + 1);
    }
    cols.push(col);
  }

  const level = (c: number) =>
    c === 0
      ? "bg-zinc-100 dark:bg-zinc-800"
      : c < 2
        ? "bg-emerald-200 dark:bg-emerald-900"
        : c < 4
          ? "bg-emerald-300 dark:bg-emerald-700"
          : c < 7
            ? "bg-emerald-400 dark:bg-emerald-600"
            : "bg-emerald-500 dark:bg-emerald-500";

  return (
    <div className="flex gap-[3px] overflow-x-auto">
      {cols.map((col, i) => (
        <div key={i} className="flex flex-col gap-[3px]">
          {col.map((cell) => (
            <div
              key={cell.key}
              title={cell.future ? "" : `${cell.key}: ${cell.count} completed`}
              className={`h-3 w-3 rounded-[3px] ${cell.future ? "opacity-0" : level(cell.count)}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
