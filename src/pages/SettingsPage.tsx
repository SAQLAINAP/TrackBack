import { useEffect, useRef, useState, type ReactNode } from "react";
import { Card, Button, Segmented, PageTitle, Toggle } from "../components/ui";
import { SyncBadge } from "../components/SyncBadge";
import { IconAlert, IconMoon, IconSun } from "../components/icons";
import { useAuth, signIn, signUp, signOut } from "../lib/auth";
import { exportBackup, importBackup } from "../lib/backup";
import { useTheme } from "../lib/theme";
import { runSync, resetSyncCursor } from "../lib/sync";
import { resetAllUserData } from "../lib/repo";
import { usePrefs } from "../lib/prefs";
import { useStreak } from "../lib/queries";
import { cancelDaily, remindersSupported, scheduleDaily } from "../lib/reminders";
import { fmtDate } from "../lib/format";

/**
 * Width is deliberately NOT baked in: Tailwind emits `w-20` before `w-full`, so
 * a caller appending `w-20` to a class string containing `w-full` loses the
 * cascade and gets a full-width control anyway.
 */
const INPUT =
  "h-11 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] border border-transparent px-3.5 text-sm outline-none transition focus:border-accent-400/50 focus:bg-white dark:focus:bg-white/[0.09] placeholder:text-ink-faint dark:placeholder:text-zinc-500";
const FIELD = `${INPUT} w-full`;

export function SettingsPage() {
  const { user, configured } = useAuth();
  const { theme, setTheme } = useTheme();
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const lastBackupAt = usePrefs((s) => s.lastBackupAt);

  const daysSinceBackup = lastBackupAt
    ? Math.floor((Date.now() - lastBackupAt) / 86400000)
    : null;
  // Nag once a fortnight, and immediately if there's never been an export.
  const backupStale = daysSinceBackup === null || daysSinceBackup >= 14;

  const onImport = async (f: File | null) => {
    if (!f) return;
    try {
      const { imported } = await importBackup(f);
      setMsg(`Imported ${imported} records.`);
    } catch (e) {
      setMsg(`Import failed: ${e instanceof Error ? e.message : e}`);
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="space-y-5 sm:space-y-6 max-w-2xl">
      <PageTitle title="Settings" subtitle="Theme, sync and backups." />

      <StudySection onMsg={setMsg} />

      <LeetCodeSection />

      {/* Appearance */}
      <Section title="Appearance">
        <Segmented<"light" | "dark">
          value={theme}
          onChange={setTheme}
          options={[
            { value: "light", label: (<><IconSun size={15} />Light</>) },
            { value: "dark", label: (<><IconMoon size={15} />Dark</>) },
          ]}
        />
      </Section>

      {/* Account / Sync */}
      <Section title="Sync & account" trailing={<SyncBadge />}>
        {!configured ? (
          <div className="space-y-2.5">
            <p className="text-[13px] leading-relaxed text-ink-soft dark:text-zinc-400">
              Cross-device sync isn’t configured — the app runs fully local. To enable it, create a
              free Supabase project and add these to <code className="font-mono text-[12px]">.env.local</code>,
              then rebuild:
            </p>
            <pre className="bg-surface dark:bg-black/40 text-zinc-100 rounded-xl p-3 text-[11px] leading-relaxed overflow-x-auto border border-white/[0.06]">
{`VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key`}
            </pre>
          </div>
        ) : user ? (
          <div className="space-y-3">
            <p className="text-[13px] text-ink-soft dark:text-zinc-400 truncate">
              Signed in as <span className="font-medium text-ink dark:text-white">{user.email}</span>
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              <Button variant="outline" full onClick={() => runSync()}>
                Sync now
              </Button>
              <Button variant="ghost" full onClick={() => signOut()}>
                Sign out
              </Button>
            </div>
          </div>
        ) : (
          <AuthForm onMsg={setMsg} />
        )}
      </Section>

      {/* Backup */}
      <Section title="Backup" trailing={<BackupAge />}>
        <p className="text-[13px] leading-relaxed text-ink-soft dark:text-zinc-400">
          Export everything — progress, notes, flairs, images and voice memos — to a single JSON
          file, or restore from one.
        </p>
        {backupStale && (
          <p className="text-[13px] leading-relaxed rounded-xl px-3 py-2.5 bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
            {lastBackupAt
              ? `Your last backup was ${daysSinceBackup} days ago. Export again to stay safe.`
              : "You’ve never exported a backup. If this device is lost, your notes go with it."}
          </p>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(e) => onImport(e.target.files?.[0] ?? null)}
        />
        <div className="grid grid-cols-2 gap-2.5">
          <Button variant="outline" full onClick={() => exportBackup()}>
            Export
          </Button>
          <Button variant="outline" full onClick={() => fileRef.current?.click()}>
            Import
          </Button>
        </div>
      </Section>

      {configured && user && (
        <Section title="Force full re-sync">
          <p className="text-[13px] leading-relaxed text-ink-soft dark:text-zinc-400">
            Re-pull all server data from scratch.
          </p>
          <Button
            variant="ghost"
            full
            onClick={async () => {
              await resetSyncCursor();
              await runSync();
              setMsg("Re-sync triggered.");
            }}
          >
            Re-sync
          </Button>
        </Section>
      )}

      <DangerSection onMsg={setMsg} />

      {msg && (
        <p className="text-[13px] text-ink-soft dark:text-zinc-400 text-center">{msg}</p>
      )}
    </div>
  );
}

/** Typed exactly, case and all, before the reset button unlocks. */
const RESET_PHRASE = "RESET EVERYTHING";

/**
 * Irreversible, so it is gated three ways: the input is hidden until you ask
 * for it, the phrase must match exactly, and a backup is offered inline right
 * where you are about to lose the data.
 */
function DangerSection({ onMsg }: { onMsg: (m: string) => void }) {
  const [armed, setArmed] = useState(false);
  const [phrase, setPhrase] = useState("");
  const [busy, setBusy] = useState(false);
  // Trimmed but case-sensitive: Android keyboards readily append a trailing
  // space, and rejecting that guards nothing. Having to type the capitals is
  // the part that actually makes this deliberate.
  const matches = phrase.trim() === RESET_PHRASE;

  const disarm = () => {
    setArmed(false);
    setPhrase("");
  };

  const onReset = async () => {
    if (!matches || busy) return;
    setBusy(true);
    try {
      const { cleared } = await resetAllUserData();
      disarm();
      onMsg(
        cleared === 0
          ? "Nothing to reset — there was no saved progress."
          : `Reset complete. Cleared ${cleared} record${cleared === 1 ? "" : "s"}.`,
      );
    } catch (e) {
      onMsg(`Reset failed: ${e instanceof Error ? e.message : e}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card
      // `!` is load-bearing: Card sets `dark:border-white/[0.07]`, and a dark:
      // variant outranks an unprefixed border-color utility, so in dark mode
      // the rose edge would silently never render.
      className="p-4 sm:p-5 space-y-3 !border-rose-500/25"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display font-semibold text-[15px] text-rose-600 dark:text-rose-400">
          Danger zone
        </h2>
        <IconAlert size={16} className="text-rose-500 shrink-0" />
      </div>

      <p className="text-[13px] leading-relaxed text-ink-soft dark:text-zinc-400">
        Reset everything clears all completions, resume points, notes, flairs, images and voice
        memos. Your courses stay — as does your theme, daily goal and reminder — but every trace of
        what you&rsquo;ve studied is gone. This cannot be undone.
      </p>

      {!armed ? (
        <Button variant="outline" full onClick={() => setArmed(true)}>
          Reset everything…
        </Button>
      ) : (
        <div className="space-y-3">
          <div className="rounded-xl px-3 py-2.5 bg-rose-500/[0.08] border border-rose-500/20 space-y-2.5">
            <p className="text-[13px] leading-relaxed text-rose-700 dark:text-rose-300">
              Export a backup first — it is the only way back.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await exportBackup();
                onMsg("Backup exported.");
              }}
            >
              Export backup
            </Button>
          </div>

          <label className="block space-y-1.5">
            <span className="block text-[13px] text-ink-soft dark:text-zinc-400">
              Type <span className="font-mono font-semibold text-ink dark:text-white">{RESET_PHRASE}</span> to confirm
            </span>
            <input
              autoFocus
              value={phrase}
              onChange={(e) => setPhrase(e.target.value)}
              // A stray Enter shouldn't be able to trigger this.
              onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
              placeholder={RESET_PHRASE}
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              aria-label={`Type ${RESET_PHRASE} to confirm`}
              className={`${FIELD} font-mono tracking-wide`}
            />
          </label>

          <div className="grid grid-cols-2 gap-2.5">
            <Button variant="ghost" full onClick={disarm} disabled={busy}>
              Cancel
            </Button>
            <Button variant="danger" full disabled={!matches || busy} onClick={() => void onReset()}>
              {busy ? "Resetting…" : "Reset everything"}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

/** Uniform settings block so every card shares the same padding + header rhythm. */
function Section({
  title,
  trailing,
  children,
}: {
  title: string;
  trailing?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card className="p-4 sm:p-5 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display font-semibold text-[15px]">{title}</h2>
        {trailing}
      </div>
      {children}
    </Card>
  );
}

function BackupAge() {
  const lastBackupAt = usePrefs((s) => s.lastBackupAt);
  return (
    <span className="text-[11px] text-ink-faint dark:text-zinc-500 shrink-0">
      {lastBackupAt ? fmtDate(lastBackupAt) : "never exported"}
    </span>
  );
}

function LeetCodeSection() {
  const { leetcodeUsername, set } = usePrefs();
  return (
    <Section title="LeetCode">
      <p className="text-[13px] leading-relaxed text-ink-soft dark:text-zinc-400">
        Your public LeetCode handle. The LeetCode tab reads its solved counts from this profile.
      </p>
      <input
        value={leetcodeUsername}
        onChange={(e) => set({ leetcodeUsername: e.target.value.trim() })}
        placeholder="username"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        className={FIELD}
      />
    </Section>
  );
}

/**
 * Daily goal + study reminder.
 *
 * The goal is purely local UI state, so it applies instantly. The reminder has
 * to round-trip through the OS scheduler, so it reports success/failure — a
 * silent no-op after the user flips the switch would be worse than an error.
 */
function StudySection({ onMsg }: { onMsg: (m: string) => void }) {
  const { dailyGoal, reminderEnabled, reminderTime, set } = usePrefs();
  const streak = useStreak();
  const native = remindersSupported();

  // Keep the OS schedule in step with the streak count baked into the message.
  useEffect(() => {
    if (reminderEnabled) void scheduleDaily(reminderTime, streak.current);
  }, [reminderEnabled, reminderTime, streak.current]);

  const onToggle = async (on: boolean) => {
    if (!on) {
      set({ reminderEnabled: false });
      await cancelDaily();
      return;
    }
    const ok = await scheduleDaily(reminderTime, streak.current);
    set({ reminderEnabled: ok });
    if (!ok) onMsg("Couldn’t schedule the reminder — notifications are blocked for TrackBack.");
  };

  return (
    <Section title="Study">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-medium">Daily goal</div>
          <div className="text-xs text-ink-faint dark:text-zinc-500 mt-0.5">
            Lessons per day. Set 0 to hide the ring.
          </div>
        </div>
        <input
          type="number"
          min={0}
          max={50}
          inputMode="numeric"
          value={dailyGoal}
          onChange={(e) => set({ dailyGoal: Math.max(0, Math.min(50, Number(e.target.value) || 0)) })}
          className={`${INPUT} w-20 shrink-0 text-center tabular-nums`}
        />
      </div>

      <div className="h-px bg-black/[0.06] dark:bg-white/[0.07]" />

      <Toggle
        checked={reminderEnabled}
        disabled={!native}
        onChange={(v) => void onToggle(v)}
        label="Daily reminder"
        hint={
          native
            ? "A nudge if you haven’t studied yet."
            : "Only available in the installed Android app."
        }
      />
      {native && reminderEnabled && (
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-ink-soft dark:text-zinc-400">Remind me at</span>
          <input
            type="time"
            value={reminderTime}
            onChange={(e) => set({ reminderTime: e.target.value })}
            className={`${INPUT} w-32 shrink-0 text-center tabular-nums`}
          />
        </div>
      )}
    </Section>
  );
}

function AuthForm({ onMsg }: { onMsg: (m: string) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"in" | "up">("in");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "in") await signIn(email, password);
      else {
        await signUp(email, password);
        onMsg("Account created. Check your email if confirmation is required.");
      }
    } catch (err) {
      onMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-2.5">
      <input
        type="email"
        required
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        className={FIELD}
      />
      <input
        type="password"
        required
        minLength={6}
        autoComplete={mode === "in" ? "current-password" : "new-password"}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        className={FIELD}
      />
      <Button type="submit" disabled={busy} full>
        {busy ? "Working…" : mode === "in" ? "Sign in" : "Create account"}
      </Button>
      <button
        type="button"
        onClick={() => setMode((m) => (m === "in" ? "up" : "in"))}
        className="w-full text-center text-[13px] text-accent-600 dark:text-accent-300 hover:underline py-1"
      >
        {mode === "in" ? "Need an account?" : "Have an account?"}
      </button>
    </form>
  );
}
