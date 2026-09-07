import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`rounded-2xl bg-paper-card dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-800 shadow-soft ${
        onClick ? "cursor-pointer transition hover:shadow-lift hover:-translate-y-0.5" : ""
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
  return (
    <div className={`h-2 w-full rounded-full bg-zinc-200/80 dark:bg-zinc-800 overflow-hidden ${className}`}>
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${Math.min(100, Math.max(0, value))}%`, backgroundColor: color }}
      />
    </div>
  );
}

export function Ring({
  value,
  size = 72,
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
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c - (Math.min(100, Math.max(0, value)) / 100) * c;
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" className="text-zinc-200 dark:text-zinc-800" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={c}
          strokeDashoffset={off}
          strokeLinecap="round"
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-sm font-semibold">
        {label ?? `${Math.round(value)}%`}
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
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "outline" | "danger";
  size?: "sm" | "md";
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition disabled:opacity-40 disabled:cursor-not-allowed";
  const sizes = { sm: "text-sm px-3 py-1.5", md: "px-4 py-2" };
  const variants = {
    primary: "bg-ink text-white hover:bg-black dark:bg-white dark:text-black dark:hover:bg-zinc-200",
    ghost: "text-ink-soft hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800",
    outline:
      "border border-zinc-300 dark:border-zinc-700 text-ink dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800",
    danger: "bg-rose-600 text-white hover:bg-rose-700",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
