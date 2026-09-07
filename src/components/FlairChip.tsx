import { FLAIR_MAP, type FlairKind } from "../lib/types";

// Explicit class strings so Tailwind's JIT keeps them.
const STYLES: Record<FlairKind, { on: string; off: string }> = {
  revision_needed: {
    on: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30",
    off: "text-amber-700/70 border-amber-200 dark:text-amber-400/60 dark:border-amber-500/20",
  },
  coding_needed: {
    on: "bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-500/15 dark:text-sky-300 dark:border-sky-500/30",
    off: "text-sky-700/70 border-sky-200 dark:text-sky-400/60 dark:border-sky-500/20",
  },
  not_understood: {
    on: "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30",
    off: "text-rose-700/70 border-rose-200 dark:text-rose-400/60 dark:border-rose-500/20",
  },
  skipped: {
    on: "bg-zinc-200 text-zinc-700 border-zinc-300 dark:bg-zinc-700/40 dark:text-zinc-300 dark:border-zinc-600",
    off: "text-zinc-500 border-zinc-200 dark:text-zinc-500 dark:border-zinc-700",
  },
  important: {
    on: "bg-violet-100 text-violet-800 border-violet-300 dark:bg-violet-500/15 dark:text-violet-300 dark:border-violet-500/30",
    off: "text-violet-700/70 border-violet-200 dark:text-violet-400/60 dark:border-violet-500/20",
  },
  done_well: {
    on: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30",
    off: "text-emerald-700/70 border-emerald-200 dark:text-emerald-400/60 dark:border-emerald-500/20",
  },
};

export function FlairChip({
  kind,
  active,
  onClick,
  size = "md",
}: {
  kind: FlairKind;
  active?: boolean;
  onClick?: () => void;
  size?: "sm" | "md";
}) {
  const meta = FLAIR_MAP[kind];
  const s = STYLES[kind];
  const sz = size === "sm" ? "text-[11px] px-2 py-0.5" : "text-xs px-2.5 py-1";
  return (
    <button
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-full border font-medium transition ${sz} ${
        active ? s.on : `bg-transparent ${s.off} opacity-70 hover:opacity-100`
      } ${onClick ? "cursor-pointer" : "cursor-default"}`}
    >
      <span>{meta.emoji}</span>
      <span>{meta.label}</span>
    </button>
  );
}
