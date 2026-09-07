import { useState, type ReactNode } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useTheme } from "../lib/theme";
import { useBackButton } from "../lib/useBackButton";
import { SyncBadge } from "./SyncBadge";
import { IconCode, IconFlag, IconHome, IconMark, IconMoon, IconSearch, IconSettings, IconSun } from "./icons";

export function Layout({ children }: { children: ReactNode }) {
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const loc = useLocation();
  const [q, setQ] = useState("");

  // Android back button navigates the router instead of exiting the app.
  useBackButton();

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim().length >= 2) navigate(`/search?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    // pb-nav keeps content clear of the fixed mobile bottom nav.
    <div className="min-h-full flex flex-col pb-nav sm:pb-0">
      {/*
        The header's blurred background fills the status-bar area (pt-safe),
        while its 56px content row sits safely below the system icons.
      */}
      <header className="sticky top-0 z-40 pt-safe px-safe bg-paper/80 dark:bg-surface/70 backdrop-blur-xl border-b border-black/[0.06] dark:border-white/[0.07]">
        <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 h-14 flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2 shrink-0" aria-label="TrackBack home">
            <span className="grid place-items-center h-7 w-7 rounded-lg bg-accent-grad text-white shadow-glow">
              <IconMark size={15} />
            </span>
            <span className="font-display text-[17px] font-bold tracking-tight text-ink dark:text-white">
              TrackBack
            </span>
          </Link>

          {/* Desktop inline search */}
          <form onSubmit={submitSearch} className="hidden sm:block flex-1 max-w-sm ml-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search lessons & notes…"
              className="w-full rounded-xl bg-black/[0.04] dark:bg-white/[0.06] border border-transparent focus:border-accent-400/50 focus:bg-white dark:focus:bg-white/[0.09] px-3.5 py-2 text-sm outline-none transition placeholder:text-ink-faint dark:placeholder:text-zinc-500"
            />
          </form>

          <div className="ml-auto flex items-center gap-1">
            <nav className="hidden sm:flex items-center gap-1 text-sm">
              <TopLink to="/revision" active={loc.pathname.startsWith("/revision")}>
                Revision
              </TopLink>
              <TopLink to="/leetcode" active={loc.pathname.startsWith("/leetcode")}>
                LeetCode
              </TopLink>
              <TopLink to="/settings" active={loc.pathname.startsWith("/settings")}>
                Settings
              </TopLink>
            </nav>

            <button
              onClick={toggle}
              title="Toggle theme"
              aria-label="Toggle theme"
              className="h-10 w-10 grid place-items-center rounded-xl text-ink-soft dark:text-zinc-300 hover:bg-black/[0.05] dark:hover:bg-white/[0.08] active:scale-95 transition"
            >
              {theme === "dark" ? <IconSun size={19} /> : <IconMoon size={19} />}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full mx-auto max-w-5xl px-4 sm:px-6 py-5 sm:py-8 animate-fade-up">
        {children}
      </main>

      <footer className="w-full mx-auto max-w-5xl px-4 sm:px-6 py-5 flex items-center justify-between text-xs text-ink-faint dark:text-zinc-500">
        <SyncBadge />
        <span>Local-first · offline ready</span>
      </footer>

      <BottomNav pathname={loc.pathname} />
    </div>
  );
}

function TopLink({ to, active, children }: { to: string; active: boolean; children: ReactNode }) {
  return (
    <Link
      to={to}
      className={`px-3 py-2 rounded-xl transition ${
        active
          ? "bg-black/[0.06] dark:bg-white/[0.09] text-ink dark:text-white font-medium"
          : "text-ink-soft dark:text-zinc-400 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
      }`}
    >
      {children}
    </Link>
  );
}

/** Android-style bottom navigation — sits above the gesture bar via pb-safe. */
function BottomNav({ pathname }: { pathname: string }) {
  const items = [
    { to: "/", label: "Home", Icon: IconHome, match: (p: string) => p === "/" },
    { to: "/search", label: "Search", Icon: IconSearch, match: (p: string) => p.startsWith("/search") },
    { to: "/revision", label: "Revision", Icon: IconFlag, match: (p: string) => p.startsWith("/revision") },
    { to: "/leetcode", label: "LeetCode", Icon: IconCode, match: (p: string) => p.startsWith("/leetcode") },
    { to: "/settings", label: "Settings", Icon: IconSettings, match: (p: string) => p.startsWith("/settings") },
  ];

  return (
    <nav className="sm:hidden fixed inset-x-0 bottom-0 z-40 pb-safe px-safe bg-paper/90 dark:bg-surface/85 backdrop-blur-xl border-t border-black/[0.06] dark:border-white/[0.08]">
      <div className="flex items-stretch" style={{ height: "var(--bottomnav-h)" }}>
        {items.map(({ to, label, Icon, match }) => {
          const active = match(pathname);
          return (
            <Link
              key={to}
              to={to}
              className={`flex-1 flex flex-col items-center justify-center gap-1 transition active:scale-95 ${
                active ? "text-accent-500 dark:text-accent-300" : "text-ink-faint dark:text-zinc-500"
              }`}
            >
              <span
                className={`grid place-items-center h-7 w-12 rounded-lg transition ${
                  active ? "bg-accent-500/10 dark:bg-accent-400/15" : ""
                }`}
              >
                <Icon size={20} />
              </span>
              <span className={`text-[10.5px] leading-none ${active ? "font-semibold" : "font-medium"}`}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
