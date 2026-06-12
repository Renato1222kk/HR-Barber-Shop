'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase/client';

interface AuthUser {
  id: string;
  email: string | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  isDemo: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const DEMO_USER: AuthUser = { id: 'demo-user', email: 'demo@brunosamad.app' };

export function AuthProvider({ children }: { children: ReactNode }) {
  const isDemo = !isSupabaseConfigured;
  const [user, setUser] = useState<AuthUser | null>(isDemo ? DEMO_USER : null);
  const [loading, setLoading] = useState(!isDemo);

  useEffect(() => {
    if (isDemo) return;
    const sb = getSupabase();
    if (!sb) return;

    sb.auth.getSession().then(({ data }) => {
      const u = data.session?.user;
      setUser(u ? { id: u.id, email: u.email ?? null } : null);
      setLoading(false);
    });

    const { data: sub } = sb.auth.onAuthStateChange((_event, session) => {
      const u = session?.user;
      setUser(u ? { id: u.id, email: u.email ?? null } : null);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, [isDemo]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      if (isDemo) {
        setUser(DEMO_USER);
        return { error: null };
      }
      const sb = getSupabase();
      if (!sb) return { error: 'Supabase nao configurado.' };
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) return { error: traduzErro(error.message) };
      return { error: null };
    },
    [isDemo]
  );

  const signOut = useCallback(async () => {
    if (isDemo) {
      setUser(null);
      return;
    }
    const sb = getSupabase();
    await sb?.auth.signOut();
    setUser(null);
  }, [isDemo]);

  const value = useMemo(
    () => ({ user, loading, isDemo, signIn, signOut }),
    [user, loading, isDemo, signIn, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}

function traduzErro(msg: string): string {
  if (/invalid login credentials/i.test(msg)) return 'E-mail ou senha incorretos.';
  if (/email not confirmed/i.test(msg)) return 'Confirme seu e-mail antes de entrar.';
  return msg;
}
