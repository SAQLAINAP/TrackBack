import { useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "./supabase";
import { runSync } from "./sync";

export interface AuthUser {
  id: string;
  email: string | null;
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ? { id: data.user.id, email: data.user.email ?? null } : null);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ? { id: session.user.id, email: session.user.email ?? null } : null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return { user, loading, configured: isSupabaseConfigured };
}

export async function signIn(email: string, password: string): Promise<void> {
  if (!supabase) throw new Error("Sync not configured");
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  await runSync();
}

export async function signUp(email: string, password: string): Promise<void> {
  if (!supabase) throw new Error("Sync not configured");
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  await runSync();
}

export async function signOut(): Promise<void> {
  if (!supabase) return;
  await supabase.auth.signOut();
}
