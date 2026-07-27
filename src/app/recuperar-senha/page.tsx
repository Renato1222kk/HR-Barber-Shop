'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Mail, MailCheck } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthProvider';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import { ErrorState } from '@/components/ui/Misc';
import { ConfigNotice } from '@/components/ui/ConfigNotice';
import { LogoMark } from '@/components/brand/Logo';
import { BRAND } from '@/lib/constants';

export default function RecuperarSenhaPage() {
  const { requestPasswordReset, configError } = useAuth();
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError(null);
    const result = await requestPasswordReset(email);
    setSending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setSent(true);
  };

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-ink-50 px-5 py-10">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-ink-200/40 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <LogoMark size="lg" priority className="mb-4" />
          <h1 className="text-xl font-semibold tracking-tight text-ink-900">Recuperar senha</h1>
          <p className="mt-1.5 text-sm text-ink-500">
            Enviamos um link para você criar uma senha nova.
          </p>
        </div>

        {configError ? (
          <ConfigNotice message={configError} />
        ) : sent ? (
          <div className="space-y-4 rounded-2xl border border-ink-200 bg-white p-6 text-center shadow-soft">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-green-600">
              <MailCheck className="h-7 w-7" />
            </div>
            <p className="text-sm leading-relaxed text-ink-700">
              Se existir uma conta com <span className="text-ink-900">{email}</span>, o link de
              recuperação chegará em instantes. Confira também o spam.
            </p>
            <Link href="/login" className="block">
              <Button variant="outline" className="w-full">
                Voltar para o login
              </Button>
            </Link>
          </div>
        ) : (
          <form
            onSubmit={onSubmit}
            className="space-y-4 rounded-2xl border border-ink-200 bg-white p-6 shadow-soft"
          >
            {error && <ErrorState message={error} />}

            <Field label="E-mail da conta">
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

            <Button type="submit" size="lg" className="w-full" loading={sending}>
              Enviar link de recuperação
            </Button>

            <Link
              href="/login"
              className="flex items-center justify-center gap-1.5 pt-1 text-xs font-medium text-ink-600 hover:text-ink-900"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Voltar para o login
            </Link>
          </form>
        )}

        <p className="mt-6 text-center text-xs text-ink-400">
          {BRAND.name} © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
