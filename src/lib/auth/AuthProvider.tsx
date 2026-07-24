'use client';

// Autenticação real via Supabase Auth (@supabase/ssr).
// Cuida de login, logout, persistência/atualização de sessão e recuperação
// de senha. Se o Supabase não estiver configurado, expõe `configured: false`
// para que a UI mostre uma mensagem amigável em vez de quebrar.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { User } from '@supabase/supabase-js';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { isSupabaseConfigured } from '@/lib/supabase/env';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  configured: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<{ error: string | null }>;
  updatePassword: (password: string) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function toAuthUser(user: User | null): AuthUser | null {
  if (!user) return null;
  const meta = user.user_metadata ?? {};
  const name =
    (typeof meta.name === 'string' && meta.name) ||
    (typeof meta.full_name === 'string' && meta.full_name) ||
    user.email?.split('@')[0] ||
    'Usuário';
  return { id: user.id, name, email: user.email ?? '' };
}

// Traduz os erros mais comuns do Supabase Auth para português.
function translateAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials')) return 'E-mail ou senha incorretos.';
  if (m.includes('email not confirmed')) return 'Confirme seu e-mail antes de entrar.';
  if (m.includes('rate limit') || m.includes('too many'))
    return 'Muitas tentativas. Aguarde alguns instantes e tente novamente.';
  if (m.includes('should be at least') || m.includes('password'))
    return 'A senha precisa ter pelo menos 6 caracteres.';
  return message;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = isSupabaseConfigured();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }

    const supabase = getSupabaseBrowserClient();
    let active = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setUser(toAuthUser(data.user));
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(toAuthUser(session?.user ?? null));
      setLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [configured]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      if (!configured) return { error: 'Supabase não configurado.' };
      const { error } = await getSupabaseBrowserClient().auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      return { error: error ? translateAuthError(error.message) : null };
    },
    [configured]
  );

  const signOut = useCallback(async () => {
    if (!configured) return;
    await getSupabaseBrowserClient().auth.signOut();
    setUser(null);
  }, [configured]);

  const requestPasswordReset = useCallback(
    async (email: string) => {
      if (!configured) return { error: 'Supabase não configurado.' };
      const redirectTo =
        typeof window !== 'undefined'
          ? `${window.location.origin}/redefinir-senha`
          : undefined;
      const { error } = await getSupabaseBrowserClient().auth.resetPasswordForEmail(
        email.trim(),
        { redirectTo }
      );
      return { error: error ? translateAuthError(error.message) : null };
    },
    [configured]
  );

  const updatePassword = useCallback(
    async (password: string) => {
      if (!configured) return { error: 'Supabase não configurado.' };
      const { error } = await getSupabaseBrowserClient().auth.updateUser({ password });
      return { error: error ? translateAuthError(error.message) : null };
    },
    [configured]
  );

  const value = useMemo(
    () => ({
      user,
      loading,
      configured,
      signIn,
      signOut,
      requestPasswordReset,
      updatePassword,
    }),
    [user, loading, configured, signIn, signOut, requestPasswordReset, updatePassword]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}
