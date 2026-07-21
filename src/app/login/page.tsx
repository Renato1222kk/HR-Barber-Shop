'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Eye, EyeOff, PlayCircle } from 'lucide-react';
import { useAuth, DEMO_CREDENTIALS } from '@/lib/auth/AuthProvider';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import { ErrorState } from '@/components/ui/Misc';
import { LogoMark } from '@/components/brand/Logo';
import { BRAND } from '@/lib/constants';

export default function LoginPage() {
  const router = useRouter();
  const { signIn, signInAsDemo, user, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
    const result = await signIn(email, password);
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.replace('/dashboard');
  };

  const enterDemo = () => {
    signInAsDemo();
    router.replace('/dashboard');
  };

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-ink-950 px-5 py-10">
      {/* Brilho de fundo */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-gold/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <LogoMark size="lg" className="mb-4" />
          <h1 className="text-2xl font-semibold tracking-tight text-white">{BRAND.initials}</h1>
          <p className="mt-1 text-xs font-medium uppercase tracking-[0.28em] text-gold">
            {BRAND.tagline}
          </p>
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

          <div className="flex items-center gap-3 pt-1">
            <span className="h-px flex-1 bg-ink-700" />
            <span className="text-[11px] uppercase tracking-wider text-zinc-600">ou</span>
            <span className="h-px flex-1 bg-ink-700" />
          </div>

          <Button type="button" variant="outline" size="lg" className="w-full" onClick={enterDemo}>
            <PlayCircle className="h-4 w-4" />
            Entrar na demonstração
          </Button>

          <p className="rounded-xl bg-ink-900 px-3 py-2.5 text-center text-[11px] leading-relaxed text-zinc-500">
            Acesso de demonstração:{' '}
            <span className="text-zinc-300">{DEMO_CREDENTIALS.email}</span> · senha{' '}
            <span className="text-zinc-300">{DEMO_CREDENTIALS.password}</span>
          </p>
        </form>

        <p className="mt-6 text-center text-xs text-zinc-600">
          {BRAND.name} © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
