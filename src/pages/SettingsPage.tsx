import { useRef, useState, type ReactNode } from "react";
import { Card, Button, Segmented, PageTitle } from "../components/ui";
import { SyncBadge } from "../components/SyncBadge";
import { IconMoon, IconSun } from "../components/icons";
import { useAuth, signIn, signUp, signOut } from "../lib/auth";
import { exportBackup, importBackup } from "../lib/backup";
import { useTheme } from "../lib/theme";
import { runSync, resetSyncCursor } from "../lib/sync";

const FIELD =
  "w-full h-11 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] border border-transparent px-3.5 text-sm outline-none transition focus:border-accent-400/50 focus:bg-white dark:focus:bg-white/[0.09] placeholder:text-ink-faint dark:placeholder:text-zinc-500";

export function SettingsPage() {
  const { user, configured } = useAuth();
  const { theme, setTheme } = useTheme();
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<string | null>(null);

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
      <Section title="Backup">
        <p className="text-[13px] leading-relaxed text-ink-soft dark:text-zinc-400">
          Export everything — progress, notes, flairs, images and voice memos — to a single JSON
          file, or restore from one.
        </p>
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

      {msg && (
        <p className="text-[13px] text-ink-soft dark:text-zinc-400 text-center">{msg}</p>
      )}
    </div>
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
