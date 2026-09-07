import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, Button, PageTitle, ProgressBar } from "../components/ui";
import { StreakHeatmap } from "../components/StreakHeatmap";
import { fetchLeetCodeStats, loadCachedStats, saveCachedStats, type LeetCodeStats, type Solved } from "../lib/leetcode";
import { usePrefs } from "../lib/prefs";
import { fmtDateTime, pct } from "../lib/format";

const LEVELS: { key: "easy" | "medium" | "hard"; label: string; color: string }[] = [
  { key: "easy", label: "Easy", color: "#22c55e" },
  { key: "medium", label: "Medium", color: "#f59e0b" },
  { key: "hard", label: "Hard", color: "#ef4444" },
];

export function LeetCodePage() {
  const username = usePrefs((s) => s.leetcodeUsername);
  const [cached, setCached] = useState<LeetCodeStats | null>(loadCachedStats);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Changing the handle in Settings leaves a cache belonging to the old one.
  const stats =
    cached && cached.username.toLowerCase() === username.toLowerCase() ? cached : null;

  const refresh = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const next = await fetchLeetCodeStats(username);
      saveCachedStats(next);
      setCached(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  if (!username) {
    return (
      <div className="space-y-5">
        <Header username={username} />
        <Card className="p-8 text-center space-y-3">
          <p className="text-sm text-ink-soft dark:text-zinc-400">
            Add your LeetCode username in Settings to track your solved problems.
          </p>
          <Link to="/settings" className="inline-block">
            <Button variant="soft">Open Settings</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Header username={username} />

      <Card className="p-4 sm:p-5 flex flex-wrap items-center gap-x-4 gap-y-2">
        <Button onClick={() => void refresh()} disabled={busy}>
          {busy ? "Fetching…" : stats ? "Refresh" : "Fetch stats"}
        </Button>
        {stats && (
          <span className="text-xs text-ink-faint dark:text-zinc-500">
            Updated {fmtDateTime(stats.fetchedAt)}
          </span>
        )}
        {error && (
          <span className="w-full text-[13px] text-rose-600 dark:text-rose-400">{error}</span>
        )}
      </Card>

      {stats ? (
        <>
          <Card className="p-5 sm:p-6">
            <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
              <Stat value={stats.all.solved} label={`of ${stats.all.total} problems`} big />
              <Stat value={stats.streak} label="day streak" />
              <Stat value={stats.activeDays} label="active days" />
            </div>

            <div className="mt-6 space-y-4">
              {LEVELS.map(({ key, label, color }) => (
                <Bar key={key} label={label} color={color} data={stats[key]} />
              ))}
            </div>
          </Card>

          <Card className="p-5 sm:p-6">
            <h2 className="font-display text-base font-bold mb-1">Submission activity</h2>
            <p className="text-xs text-ink-faint dark:text-zinc-500 mb-4">Last 17 weeks</p>
            <StreakHeatmap days={stats.calendar} unit="submissions" />
          </Card>
        </>
      ) : (
        !error && (
          <Card className="p-8 text-center text-sm text-ink-soft dark:text-zinc-400">
            Hit “Fetch stats” to pull the latest numbers for {username}.
          </Card>
        )
      )}
    </div>
  );
}

function Header({ username }: { username: string }) {
  return (
    <PageTitle
      eyebrow="LeetCode"
      title="Problems solved"
      subtitle={
        username ? (
          <>
            Public profile of{" "}
            <span className="font-medium text-ink dark:text-white">{username}</span> · change it in{" "}
            <Link to="/settings" className="text-accent-500 dark:text-accent-300 hover:underline">
              Settings
            </Link>
          </>
        ) : (
          "Pulled straight from your public LeetCode profile."
        )
      }
    />
  );
}

function Stat({ value, label, big = false }: { value: number; label: string; big?: boolean }) {
  return (
    <div>
      <div
        className={`font-display font-bold tracking-tight text-ink dark:text-white ${
          big ? "text-4xl sm:text-5xl" : "text-2xl"
        }`}
      >
        {value}
      </div>
      <div className="text-xs text-ink-soft dark:text-zinc-400 mt-0.5">{label}</div>
    </div>
  );
}

function Bar({ label, color, data }: { label: string; color: string; data: Solved }) {
  return (
    <div>
      <div className="flex items-baseline justify-between text-[13px] mb-1.5">
        <span className="font-medium" style={{ color }}>
          {label}
        </span>
        <span className="text-ink-soft dark:text-zinc-400 font-mono text-xs">
          {data.solved}
          <span className="text-ink-faint dark:text-zinc-600"> / {data.total}</span>
        </span>
      </div>
      <ProgressBar value={pct(data.solved, data.total)} color={color} />
    </div>
  );
}
