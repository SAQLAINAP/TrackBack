import { useRef, useState } from "react";
import { Card, Button } from "../components/ui";
import { SyncBadge } from "../components/SyncBadge";
import { useAuth, signIn, signUp, signOut } from "../lib/auth";
import { exportBackup, importBackup } from "../lib/backup";
import { useTheme } from "../lib/theme";
import { runSync, resetSyncCursor } from "../lib/sync";

export function SettingsPage() {
  const { user, configured } = useAuth();
  const { theme, toggle } = useTheme();
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
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>

      {/* Account / Sync */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Sync & account</h2>
          <SyncBadge />
        </div>

        {!configured ? (
          <div className="text-sm text-ink-faint dark:text-zinc-500 space-y-2">
            <p>
              Cross-device sync is not configured yet — the app is running fully local. To enable it, create a
              free Supabase project and add these to a <code>.env.local</code> file, then restart:
            </p>
            <pre className="bg-zinc-900 text-zinc-100 rounded-xl p-3 text-xs overflow-x-auto">
{`VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key`}
            </pre>
          </div>
        ) : user ? (
          <div className="flex items-center justify-between">
            <div className="text-sm">
              Signed in as <span className="font-medium">{user.email}</span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => runSync()}>
                Sync now
              </Button>
              <Button variant="ghost" size="sm" onClick={() => signOut()}>
                Sign out
              </Button>
            </div>
          </div>
        ) : (
          <AuthForm onMsg={setMsg} />
        )}
      </Card>

      {/* Backup */}
      <Card className="p-5 space-y-3">
        <h2 className="font-semibold">Backup</h2>
        <p className="text-sm text-ink-faint dark:text-zinc-500">
          Export everything (progress, notes, flairs, images, voice) to a single JSON file, or restore from one.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => exportBackup()}>
            ⬇ Export backup
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => onImport(e.target.files?.[0] ?? null)}
          />
          <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
            ⬆ Import backup
          </Button>
        </div>
      </Card>

      {/* Appearance */}
      <Card className="p-5 flex items-center justify-between">
        <h2 className="font-semibold">Appearance</h2>
        <Button variant="outline" size="sm" onClick={toggle}>
          {theme === "dark" ? "☀️ Light mode" : "🌙 Dark mode"}
        </Button>
      </Card>

      {configured && user && (
        <Card className="p-5 flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Force full re-sync</h2>
            <p className="text-sm text-ink-faint dark:text-zinc-500">Re-pull all server data from scratch.</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              await resetSyncCursor();
              await runSync();
              setMsg("Re-sync triggered.");
            }}
          >
            Re-sync
          </Button>
        </Card>
      )}

      {msg && <div className="text-sm text-ink-faint dark:text-zinc-500">{msg}</div>}
    </div>
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
    <form onSubmit={submit} className="space-y-3">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        className="w-full rounded-xl bg-zinc-100 dark:bg-zinc-900 px-3.5 py-2 text-sm outline-none border border-transparent focus:border-zinc-300 dark:focus:border-zinc-700"
      />
      <input
        type="password"
        required
        minLength={6}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        className="w-full rounded-xl bg-zinc-100 dark:bg-zinc-900 px-3.5 py-2 text-sm outline-none border border-transparent focus:border-zinc-300 dark:focus:border-zinc-700"
      />
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={busy}>
          {mode === "in" ? "Sign in" : "Create account"}
        </Button>
        <button
          type="button"
          onClick={() => setMode((m) => (m === "in" ? "up" : "in"))}
          className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          {mode === "in" ? "Need an account?" : "Have an account?"}
        </button>
      </div>
    </form>
  );
}
