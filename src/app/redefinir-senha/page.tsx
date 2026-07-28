'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthProvider';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import { ErrorState, Spinner } from '@/components/ui/Misc';
import { ConfigNotice } from '@/components/ui/ConfigNotice';
import { LogoMark } from '@/components/brand/Logo';
import { BRAND, HOME_ROUTE } from '@/lib/constants';

const MIN_LENGTH = 6;

export default function RedefinirSenhaPage() {
  const router = useRouter();
  const { updatePassword, user, loading, configError } = useAuth();

  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < MIN_LENGTH) {
      setError(`A senha precisa ter pelo menos ${MIN_LENGTH} caracteres.`);
      return;
    }
    if (password !== confirmation) {
      setError('As senhas não são iguais.');
      return;
    }
    setSaving(true);
    setError(null);
    const result = await updatePassword(password);
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.replace(HOME_ROUTE);
  };

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-ink-50 px-5 py-10">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-ink-200/40 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <LogoMark size="lg" priority className="mb-4" />
          <h1 className="text-xl font-semibold tracking-tight text-ink-900">Nova senha</h1>
          <p className="mt-1.5 text-sm text-ink-500">
            Escolha uma senha com pelo menos {MIN_LENGTH} caracteres.
          </p>
        </div>

        {configError ? (
          <ConfigNotice message={configError} />
        ) : loading ? (
          <div className="flex justify-center py-10">
            <Spinner className="h-7 w-7" />
          </div>
        ) : !user ? (
          // Sem sessão o link já expirou ou foi aberto fora do e-mail.
          <div className="space-y-4 rounded-2xl border border-ink-200 bg-white p-6 text-center shadow-soft">
            <p className="text-sm leading-relaxed text-ink-700">
              Este link de recuperação não é mais válido. Solicite um novo para redefinir a
              senha.
            </p>
            <Link href="/recuperar-senha" className="block">
              <Button className="w-full">Solicitar novo link</Button>
            </Link>
          </div>
        ) : (
          <form
            onSubmit={onSubmit}
            className="space-y-4 rounded-2xl border border-ink-200 bg-white p-6 shadow-soft"
          >
            {error && <ErrorState message={error} />}

            <Field label="Nova senha">
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
                <Input
                  type={show ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
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

            <Field label="Confirmar nova senha">
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
                <Input
                  type={show ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  placeholder="••••••••"
                  className="pl-11"
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                />
              </div>
            </Field>

            <Button type="submit" size="lg" className="w-full" loading={saving}>
              Salvar nova senha
            </Button>
          </form>
        )}

        <p className="mt-6 text-center text-xs text-ink-400">
          {BRAND.name} © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
