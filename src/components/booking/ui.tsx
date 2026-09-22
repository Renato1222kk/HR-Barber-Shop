'use client';

import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { formatCurrency } from '@/lib/utils/format';

/** Título + subtítulo de uma etapa. */
export function StepTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-5">
      <h2 className="text-xl font-semibold tracking-tight text-ink-900 sm:text-2xl">{title}</h2>
      {subtitle && <p className="mt-1.5 text-sm leading-relaxed text-ink-500">{subtitle}</p>}
    </div>
  );
}

/** Preço formatado em destaque discreto. */
export function Price({ value, className }: { value: number; className?: string }) {
  return <span className={cn('font-semibold text-ink-900', className)}>{formatCurrency(value)}</span>;
}

/** Duração legível: "40 min" / "1 h" / "1 h 30 min". */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

/** Estado de carregamento centrado, com rótulo profissional. */
export function LoadingBlock({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-ink-500">
      <Loader2 className="h-7 w-7 animate-spin text-ink-900" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

/** Mensagem de erro amigável (nunca detalhe técnico). */
export function ErrorBlock({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
      <p>{message}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

/**
 * Barra de ação fixa no rodapé (mobile-first). Fica sempre visível acima do
 * teclado/scroll, com o botão principal claramente destacado.
 */
export function StickyActionBar({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 z-10 -mx-4 mt-6 border-t border-ink-100 bg-white/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-white/80 sm:-mx-6 sm:px-6">
      <div className="mx-auto w-full max-w-[640px]">{children}</div>
    </div>
  );
}
