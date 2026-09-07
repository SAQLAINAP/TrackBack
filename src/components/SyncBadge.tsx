import { useEffect, useState } from "react";
import { onSyncStatus, type SyncStatus } from "../lib/sync";

const LABEL: Record<SyncStatus, { text: string; dot: string }> = {
  idle: { text: "Synced", dot: "bg-emerald-500" },
  syncing: { text: "Syncing…", dot: "bg-sky-500 animate-pulse" },
  offline: { text: "Offline", dot: "bg-zinc-400" },
  disabled: { text: "Local only", dot: "bg-zinc-300" },
  error: { text: "Sync error", dot: "bg-rose-500" },
  signedout: { text: "Signed out", dot: "bg-amber-500" },
};

export function SyncBadge() {
  const [status, setStatus] = useState<SyncStatus>("disabled");
  useEffect(() => onSyncStatus((s) => setStatus(s)), []);
  const l = LABEL[status];
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-ink-faint dark:text-zinc-500">
      <span className={`h-2 w-2 rounded-full ${l.dot}`} />
      {l.text}
    </span>
  );
}
