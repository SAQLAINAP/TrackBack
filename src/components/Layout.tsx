import { useState, type ReactNode } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useTheme } from "../lib/theme";
import { SyncBadge } from "./SyncBadge";

export function Layout({ children }: { children: ReactNode }) {
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const loc = useLocation();
  const [q, setQ] = useState("");

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim().length >= 2) navigate(`/search?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-30 backdrop-blur bg-paper/80 dark:bg-zinc-950/80 border-b border-zinc-200/70 dark:border-zinc-800">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 h-14 flex items-center gap-3">
          <Link to="/" className="font-semibold tracking-tight text-ink dark:text-white shrink-0">
            <span className="text-indigo-500">◆</span> Tracker
          </Link>

          <form onSubmit={submitSearch} className="flex-1 max-w-md hidden sm:block">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search lessons & notes…"
              className="w-full rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-transparent focus:border-zinc-300 dark:focus:border-zinc-700 px-3.5 py-1.5 text-sm outline-none"
            />
          </form>

          <nav className="flex items-center gap-1 ml-auto text-sm">
            <NavLink to="/revision" active={loc.pathname === "/revision"}>
              Revision
            </NavLink>
            <NavLink to="/settings" active={loc.pathname === "/settings"}>
              Settings
            </NavLink>
            <button
              onClick={toggle}
              title="Toggle theme"
              className="ml-1 h-9 w-9 grid place-items-center rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
            >
              {theme === "dark" ? "☀️" : "🌙"}
            </button>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-6 sm:py-8">{children}</main>

      <footer className="mx-auto max-w-5xl px-4 sm:px-6 py-6 flex items-center justify-between text-xs text-ink-faint dark:text-zinc-600">
        <SyncBadge />
        <span>Local-first · offline ready</span>
      </footer>
    </div>
  );
}

function NavLink({ to, active, children }: { to: string; active: boolean; children: ReactNode }) {
  return (
    <Link
      to={to}
      className={`px-3 py-1.5 rounded-xl transition ${
        active
          ? "bg-zinc-100 dark:bg-zinc-800 text-ink dark:text-white"
          : "text-ink-soft dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
      }`}
    >
      {children}
    </Link>
  );
}
