'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';
import { Card } from '@/components/ui/Card';

/** Bloco padrao do painel: titulo, acao opcional e conteudo. */
export function Section({
  title,
  description,
  action,
  children,
  className,
  flush,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Remove o respiro lateral — usado pelos graficos, que ocupam a largura toda. */
  flush?: boolean;
}) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 pb-3 pt-4 sm:px-5 sm:pt-5">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-ink-900">{title}</h2>
          {description && <p className="mt-0.5 text-xs text-ink-500">{description}</p>}
        </div>
        {action}
      </div>
      <div className={flush ? 'px-1 pb-4 sm:px-2 sm:pb-5' : 'px-4 pb-4 sm:px-5 sm:pb-5'}>
        {children}
      </div>
    </Card>
  );
}

/** Barra de proporcao usada em serviços, pagamentos e categorias. */
export function PercentBar({
  percent,
  tone = 'ink',
}: {
  percent: number;
  tone?: 'ink' | 'red' | 'green';
}) {
  return (
    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
      <div
        className={cn(
          'h-full rounded-full transition-all',
          tone === 'red' ? 'bg-red-500' : tone === 'green' ? 'bg-green-500' : 'bg-ink-900'
        )}
        style={{ width: `${Math.max(2, Math.min(100, percent))}%` }}
      />
    </div>
  );
}

export function EmptyLine({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-ink-200 px-4 py-8 text-center text-sm text-ink-500">
      {children}
    </p>
  );
}

/** Linha "rotulo à esquerda, valor à direita" do resultado financeiro. */
export function ResultRow({
  label,
  value,
  hint,
  tone = 'neutral',
  strong,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: 'neutral' | 'positive' | 'negative';
  strong?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-2.5">
      <div className="min-w-0">
        <p className={cn('text-sm', strong ? 'font-semibold text-ink-900' : 'text-ink-700')}>
          {label}
        </p>
        {hint && <p className="mt-0.5 text-xs text-ink-500">{hint}</p>}
      </div>
      <p
        className={cn(
          'shrink-0 text-right text-sm font-semibold tabular-nums',
          tone === 'positive'
            ? 'text-green-600'
            : tone === 'negative'
              ? 'text-red-600'
              : 'text-ink-900'
        )}
      >
        {value}
      </p>
    </div>
  );
}
