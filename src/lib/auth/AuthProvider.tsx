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
import { useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { describeMissingEnv } from '@/lib/supabase/env';

// -------------------------------------------------------------------
// Autenticacao real via Supabase Auth.
// A sessao vive em cookies (@supabase/ssr), entao o middleware consegue
// proteger as rotas privadas antes mesmo da pagina renderizar.
// -------------------------------------------------------------------

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

interface AuthResult {
  error: string | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  /** true ate a sessao inicial ser lida — evita piscar entre login e dashboard. */
  loading: boolean;
  /** Mensagem de configuracao quando faltam as variaveis do Supabase. */
  configError: string | null;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<AuthResult>;
  updatePassword: (password: string) => Promise<AuthResult>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function toAuthUser(user: User | null): AuthUser | null {
  if (!user) return null;
  const metadata = user.user_metadata as { name?: string; full_name?: string } | undefined;
  const email = user.email ?? '';
  return {
    id: user.id,
    name: metadata?.name || metadata?.full_name || email.split('@')[0] || 'HR Barber Shop',
    email,
  };
}

/** Traduz os erros do Supabase Auth para mensagens diretas em portugues. */
function translateAuthError(message: string): string {
  const normalized = message.toLowerCase();
  if (normalized.includes('invalid login credentials')) return 'E-mail ou senha incorretos.';
  if (normalized.includes('email not confirmed')) {
    return 'E-mail ainda não confirmado. Verifique sua caixa de entrada.';
  }
  if (normalized.includes('rate limit') || normalized.includes('too many')) {
    return 'Muitas tentativas seguidas. Aguarde um minuto e tente de novo.';
  }
  if (normalized.includes('should be at least') || normalized.includes('password')) {
    return 'A senha precisa ter pelo menos 6 caracteres.';
  }
  if (normalized.includes('failed to fetch')) {
    return 'Não foi possível conectar ao servidor. Verifique sua internet.';
  }
  return message;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();
  const configError = supabase ? null : describeMissingEnv()?.message ?? null;

  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let active = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!active) return;
        setUser(toAuthUser(data.session?.user ?? null));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(toAuthUser(session?.user ?? null));
      setLoading(false);
      // Sincroniza os Server Components com o cookie de sessao novo.
      router.refresh();
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase, router]);

  const signIn = useCallback(
    async (email: string, password: string): Promise<AuthResult> => {
      if (!supabase) return { error: configError };
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      return { error: error ? translateAuthError(error.message) : null };
    },
    [supabase, configError]
  );

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setUser(null);
    // Descarta as paginas guardadas pelo service worker: o proximo usuario
    // deste aparelho nao deve reabrir a casca do painel offline.
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.controller?.postMessage('clear-pages-cache');
    }
  }, [supabase]);

  const requestPasswordReset = useCallback(
    async (email: string): Promise<AuthResult> => {
      if (!supabase) return { error: configError };
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        // O link do e-mail cai nesta rota, que troca o código pela sessão
        // e leva para a tela de nova senha.
        redirectTo: `${window.location.origin}/auth/callback?next=/redefinir-senha`,
      });
      return { error: error ? translateAuthError(error.message) : null };
    },
    [supabase, configError]
  );

  const updatePassword = useCallback(
    async (password: string): Promise<AuthResult> => {
      if (!supabase) return { error: configError };
      const { error } = await supabase.auth.updateUser({ password });
      return { error: error ? translateAuthError(error.message) : null };
    },
    [supabase, configError]
  );

  const value = useMemo(
    () => ({
      user,
      loading,
      configError,
      signIn,
      signOut,
      requestPasswordReset,
      updatePassword,
    }),
    [user, loading, configError, signIn, signOut, requestPasswordReset, updatePassword]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}
