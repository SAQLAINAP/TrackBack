import { useId, type ReactNode } from "react";

export function Card({
  children,
  className = "",
  onClick,
  /** Adds hover/press affordance without needing a click handler (e.g. when wrapped in a <Link>). */
  interactive = false,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  interactive?: boolean;
}) {
  const isInteractive = interactive || !!onClick;
  return (
    <div
      onClick={onClick}
      className={`rounded-2xl bg-paper-card dark:bg-white/[0.035] border border-black/[0.06] dark:border-white/[0.07] shadow-soft dark:shadow-none ${
        isInteractive
          ? "cursor-pointer transition duration-200 hover:shadow-lift hover:-translate-y-0.5 dark:hover:bg-white/[0.06] dark:hover:border-white/[0.12] active:scale-[0.995]"
          : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function ProgressBar({
  value,
  color = "#6366f1",
  className = "",
}: {
  value: number; // 0-100
  color?: string;
  className?: string;
}) {
  const v = Math.min(100, Math.max(0, value));
  return (
    <div
      className={`h-1.5 w-full rounded-full bg-black/[0.07] dark:bg-white/[0.09] overflow-hidden ${className}`}
    >
      <div
        className="h-full rounded-full transition-all duration-700 ease-out"
        style={{
          width: `${v}%`,
          background: `linear-gradient(90deg, ${color}99, ${color})`,
          boxShadow: v > 0 ? `0 0 12px ${color}66` : undefined,
        }}
      />
    </div>
  );
}

export function Ring({
  value,
  size = 76,
  stroke = 7,
  color = "#6366f1",
  label,
}: {
  value: number; // 0-100
  size?: number;
  stroke?: number;
  color?: string;
  label?: ReactNode;
}) {
  const gid = useId();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.min(100, Math.max(0, value));
  const off = c - (v / 100) * c;
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90 overflow-visible">
        <defs>
          <linearGradient id={gid} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color} />
            <stop offset="100%" stopColor="#d946ef" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          className="text-black/[0.08] dark:text-white/[0.10]"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${gid})`}
          strokeWidth={stroke}
          strokeDasharray={c}
          strokeDashoffset={off}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
          style={{ filter: v > 0 ? `drop-shadow(0 0 6px ${color}80)` : undefined }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center font-display text-sm font-bold">
        {label ?? `${Math.round(v)}%`}
      </div>
    </div>
  );
}

export function Button({
  children,
  onClick,
  variant = "primary",
  size = "md",
  type = "button",
  disabled,
  full = false,
  className = "",
  title,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "solid" | "ghost" | "outline" | "danger" | "soft";
  size?: "sm" | "md" | "lg";
  type?: "button" | "submit";
  disabled?: boolean;
  full?: boolean;
  className?: string;
  title?: string;
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl font-medium whitespace-nowrap transition duration-150 active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100";
  const sizes = {
    sm: "text-[13px] px-3 h-9",
    md: "text-sm px-4 h-10",
    lg: "text-sm px-5 h-12",
  };
  const variants = {
    primary: "bg-accent-grad text-white shadow-glow hover:shadow-glow-lg",
    solid:
      "bg-ink text-white hover:bg-black dark:bg-white dark:text-black dark:hover:bg-zinc-200",
    ghost:
      "text-ink-soft hover:bg-black/[0.05] dark:text-zinc-300 dark:hover:bg-white/[0.08]",
    outline:
      "border border-black/10 dark:border-white/[0.14] text-ink dark:text-zinc-100 hover:bg-black/[0.04] dark:hover:bg-white/[0.07]",
    danger: "bg-rose-600 text-white hover:bg-rose-700 shadow-[0_8px_24px_-8px_rgba(225,29,72,0.5)]",
    soft: "bg-accent-500/10 text-accent-600 dark:bg-accent-400/15 dark:text-accent-300 hover:bg-accent-500/[0.18] dark:hover:bg-accent-400/25",
  };
  return (
    <button
      type={type}
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${sizes[size]} ${variants[variant]} ${full ? "w-full" : ""} ${className}`}
    >
      {children}
    </button>
  );
}

/** Equal-width segmented control — used for lesson status so buttons never wrap unevenly. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className = "",
}: {
  options: { value: T; label: ReactNode }[];
  value: T | undefined;
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div
      className={`grid gap-1 p-1 rounded-2xl bg-black/[0.04] dark:bg-white/[0.05] border border-black/[0.05] dark:border-white/[0.07] ${className}`}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={`h-10 rounded-xl text-[13px] font-medium inline-flex items-center justify-center gap-1.5 whitespace-nowrap transition active:scale-[0.97] ${
              active
                ? "bg-white dark:bg-white/[0.13] text-ink dark:text-white shadow-sm"
                : "text-ink-soft dark:text-zinc-400 hover:bg-black/[0.03] dark:hover:bg-white/[0.05]"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Page heading with optional eyebrow + subtitle. */
export function PageTitle({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
}) {
  return (
    <div className="space-y-1">
      {eyebrow && (
        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-accent-500 dark:text-accent-300">
          {eyebrow}
        </div>
      )}
      <h1 className="font-display text-[26px] sm:text-3xl font-bold tracking-tight text-ink dark:text-white">
        {title}
      </h1>
      {subtitle && <p className="text-sm text-ink-soft dark:text-zinc-400">{subtitle}</p>}
    </div>
  );
}
