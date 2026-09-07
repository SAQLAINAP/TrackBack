import { dayKey } from "../lib/format";

// GitHub-style contribution heatmap for the last ~17 weeks.
export function StreakHeatmap({
  days,
  unit = "completed",
}: {
  days: Record<string, number>;
  unit?: string;
}) {
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

  // Busier days emit a soft glow so the grid has depth in dark mode.
  const level = (c: number) =>
    c === 0
      ? "bg-black/[0.06] dark:bg-white/[0.07]"
      : c < 2
        ? "bg-emerald-500/30 dark:bg-emerald-500/25"
        : c < 4
          ? "bg-emerald-500/55 dark:bg-emerald-500/45"
          : c < 7
            ? "bg-emerald-500/80 dark:bg-emerald-500/70 shadow-[0_0_6px_rgba(16,185,129,0.45)]"
            : "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]";

  return (
    <div className="flex gap-[3px] overflow-x-auto no-scrollbar -mx-0.5 px-0.5">
      {cols.map((col, i) => (
        <div key={i} className="flex flex-col gap-[3px] shrink-0">
          {col.map((cell) => (
            <div
              key={cell.key}
              title={cell.future ? "" : `${cell.key}: ${cell.count} ${unit}`}
              className={`h-3 w-3 rounded-[3px] ${cell.future ? "opacity-0" : level(cell.count)}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
