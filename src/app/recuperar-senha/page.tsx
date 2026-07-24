'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Mail, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthProvider';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import { ErrorState } from '@/components/ui/Misc';
import { LogoImage } from '@/components/brand/Logo';
import { BRAND } from '@/lib/constants';
import { SUPABASE_SETUP_MESSAGE } from '@/lib/supabase/env';

export default function RecuperarSenhaPage() {
  const { requestPasswordReset, configured } = useAuth();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const result = await requestPasswordReset(email);
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setSent(true);
  };

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-ink-950 px-5 py-10">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-gold/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <LogoImage size="lg" priority className="mb-4" />
          <h1 className="text-2xl font-semibold tracking-tight text-white">Recuperar senha</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Enviaremos um link para redefinir sua senha.
          </p>
        </div>

        <div className="rounded-2xl border border-ink-700/70 bg-ink-850 p-6 shadow-soft">
          {!configured ? (
            <ErrorState message={SUPABASE_SETUP_MESSAGE} />
          ) : sent ? (
            <div className="flex flex-col items-center gap-3 text-center">
              <CheckCircle2 className="h-10 w-10 text-green-500" />
              <p className="text-sm text-zinc-300">
                Se existir uma conta com <span className="text-white">{email}</span>, você
                receberá um e-mail com o link de redefinição.
              </p>
              <Link href="/login" className="mt-2 text-sm font-medium text-gold hover:underline">
                Voltar para o login
              </Link>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
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
              <Button type="submit" size="lg" className="w-full" loading={submitting}>
                Enviar link de recuperação
              </Button>
              <Link
                href="/login"
                className="flex items-center justify-center gap-1.5 text-xs font-medium text-zinc-400 transition-colors hover:text-gold"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Voltar para o login
              </Link>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-zinc-600">
          {BRAND.name} © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
