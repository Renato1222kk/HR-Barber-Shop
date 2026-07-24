'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthProvider';
import { LogoImage } from '@/components/brand/Logo';
import { Spinner, ErrorState } from '@/components/ui/Misc';
import { SUPABASE_SETUP_MESSAGE } from '@/lib/supabase/env';

/**
 * Protege as rotas privadas no cliente: enquanto a sessão carrega mostra um
 * loader (sem piscar entre login e dashboard) e, sem sessão, manda ao login.
 * O middleware já faz a proteção no servidor — aqui é a segunda camada.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user, loading, configured } = useAuth();

  useEffect(() => {
    if (configured && !loading && !user) {
      router.replace('/login');
    }
  }, [configured, loading, user, router]);

  if (!configured) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-ink-950 px-6">
        <div className="w-full max-w-md">
          <ErrorState message={SUPABASE_SETUP_MESSAGE} />
        </div>
      </div>
    );
  }

  if (loading || !user) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-ink-950">
        <LogoImage size="lg" priority />
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  return <>{children}</>;
}
