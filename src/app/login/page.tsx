'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Scissors, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthProvider';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import { ErrorState } from '@/components/ui/Misc';

export default function LoginPage() {
  const router = useRouter();
  const { signIn, user, loading, isDemo } = useAuth();
  const [email, setEmail] = useState(isDemo ? 'demo@brunosamad.app' : '');
  const [password, setPassword] = useState(isDemo ? 'demo' : '');
  const [show, setShow] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) router.replace('/dashboard');
  }, [user, loading, router]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const { error } = await signIn(email, password);
    setSubmitting(false);
    if (error) {
      setError(error);
      return;
    }
    router.replace('/dashboard');
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-ink-950 px-5 py-10">
      {/* brilho de fundo */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-gold/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gold text-ink-950 shadow-gold">
            <Scissors className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-semibold text-white">Bruno Samad</h1>
          <p className="text-sm text-gold">Agenda</p>
        </div>

        <form
          onSubmit={onSubmit}
          className="space-y-4 rounded-2xl border border-ink-700/70 bg-ink-850 p-6 shadow-soft"
        >
          {error && <ErrorState message={error} />}

          <Field label="E-mail">
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
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
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
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
                className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-xl text-zinc-500 transition-colors hover:text-zinc-200"
                aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </Field>

          <Button type="submit" size="lg" className="w-full" loading={submitting}>
            Entrar
          </Button>

          {isDemo && (
            <p className="rounded-xl bg-gold/10 px-3 py-2.5 text-center text-xs leading-snug text-gold">
              Modo demonstracao ativo. Toque em <strong>Entrar</strong> para explorar o app com
              dados de exemplo.
            </p>
          )}
        </form>

        <p className="mt-6 text-center text-xs text-zinc-600">
          Bruno Samad Agenda © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
