'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthProvider';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import { ErrorState, Spinner } from '@/components/ui/Misc';
import { ConfigNotice } from '@/components/ui/ConfigNotice';
import { LogoMark } from '@/components/brand/Logo';
import { BRAND } from '@/lib/constants';

/** Mensagens vindas do link de e-mail (rota /auth/callback). */
const CALLBACK_ERRORS: Record<string, string> = {
  'link-invalido': 'O link utilizado não é válido. Solicite a recuperação novamente.',
  'link-expirado': 'Este link expirou. Solicite a recuperação de senha novamente.',
  configuracao: 'O aplicativo ainda não foi conectado ao Supabase.',
};

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn, user, loading, configError } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(
    () => CALLBACK_ERRORS[searchParams.get('erro') ?? ''] ?? null
  );

  const redirectTo = searchParams.get('redirect') || '/dashboard';

  // Quem já tem sessão não vê a tela de login.
  useEffect(() => {
    if (!loading && user) router.replace(redirectTo);
  }, [user, loading, router, redirectTo]);

  // Enquanto a sessão é lida (ou o redirecionamento acontece), mostra só o
  // indicador: evita a tela piscar entre login e dashboard.
  if (loading || user) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-ink-50">
        <LogoMark size="lg" priority />
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const result = await signIn(email, password);
    if (result.error) {
      setError(result.error);
      setSubmitting(false);
      return;
    }
    router.replace(redirectTo);
  };

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-ink-50 px-5 py-10">
      {/* Halo bem suave atras do cartao — mantem o fundo praticamente branco. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-ink-200/40 blur-3xl"
      />

      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          {/* Versao grande e centralizada da marca. */}
          <LogoMark size="xl" priority className="mb-5 shadow-soft" />
          <h1 className="text-2xl font-semibold tracking-tight text-ink-900">{BRAND.name}</h1>
          <p className="mt-1.5 text-xs font-medium uppercase tracking-[0.28em] text-ink-500">
            {BRAND.tagline}
          </p>
        </div>

        {configError ? (
          <ConfigNotice message={configError} />
        ) : (
          <form
            onSubmit={onSubmit}
            className="space-y-4 rounded-2xl border border-ink-200 bg-white p-6 shadow-soft"
          >
            {error && <ErrorState message={error} />}

            <Field label="E-mail">
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
                <Input
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="seu@email.com"
                  className="pl-11"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </Field>

            <Field label="Senha">
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
                <Input
                  type={show ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="pl-11 pr-12"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-xl text-ink-500 transition-colors hover:text-ink-900"
                  aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </Field>

            <Button type="submit" size="lg" className="w-full" loading={submitting}>
              Entrar
            </Button>

            <div className="pt-1 text-center">
              <Link
                href="/recuperar-senha"
                className="text-xs font-medium text-ink-600 transition-colors hover:text-ink-900 hover:underline"
              >
                Esqueci minha senha
              </Link>
            </div>
          </form>
        )}

        <p className="mt-6 text-center text-xs text-ink-400">
          {BRAND.name} © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-ink-50">
          <LogoMark size="lg" />
          <Spinner className="h-6 w-6" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
