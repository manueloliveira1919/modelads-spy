import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "starter" | "pro" | "admin";

interface AuthState {
  user: User | null;
  session: Session | null;
  roles: AppRole[];
  loading: boolean;
  isAdmin: boolean;
  isPro: boolean; // pro OR admin
  hasProAccess: boolean; // same as isPro — semantic alias
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthCtx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadRoles(uid: string | null) {
    if (!uid) {
      setRoles([]);
      return;
    }
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", uid);
    setRoles(((data ?? []) as { role: AppRole }[]).map((r) => r.role));
  }

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      loadRoles(data.session?.user?.id ?? null).finally(() => {
        if (mounted) setLoading(false);
      });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      // defer to avoid deadlock
      setTimeout(() => loadRoles(s?.user?.id ?? null), 0);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const isAdmin = roles.includes("admin");
  const isPro = isAdmin || roles.includes("pro");

  const value: AuthState = {
    user,
    session,
    roles,
    loading,
    isAdmin,
    isPro,
    hasProAccess: isPro,
    signOut: async () => {
      await supabase.auth.signOut();
    },
    refresh: async () => {
      await loadRoles(user?.id ?? null);
    },
  };

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
