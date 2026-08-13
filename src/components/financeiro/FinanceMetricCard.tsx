'use client';

import type { LucideIcon } from 'lucide-react';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { Card } from '@/components/ui/Card';
import type { Delta } from '@/lib/data/finance';

export type MetricTone = 'neutral' | 'positive' | 'negative';

const TONE_VALUE: Record<MetricTone, string> = {
  neutral: 'text-ink-900',
  positive: 'text-green-700',
  negative: 'text-red-700',
};

const TONE_ICON: Record<MetricTone, string> = {
  neutral: 'bg-ink-100 text-ink-600',
  positive: 'bg-green-50 text-green-600',
  negative: 'bg-red-50 text-red-600',
};

interface MetricProps {
  label: string;
  value: string;
  hint?: string;
  icon?: LucideIcon;
  tone?: MetricTone;
  delta?: Delta;
  comparisonLabel?: string;
  /** Para despesas: crescer é ruim, cair é bom. */
  invertDelta?: boolean;
  onClick?: () => void;
  className?: string;
}

/**
 * Card de indicador do painel.
 *
 * O valor nunca e truncado: quebra a linha e reduz o corpo em telas
 * estreitas em vez de virar "R$ 1.234,0...".
 */
export function FinanceMetricCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'neutral',
  delta,
  comparisonLabel,
  invertDelta,
  onClick,
  className,
}: MetricProps) {
  const content = (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="min-w-0 text-xs font-medium text-ink-500">{label}</p>
        {Icon && (
          <span
            className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl',
              TONE_ICON[tone]
            )}
          >
            <Icon className="h-4 w-4" />
          </span>
        )}
      </div>

      <p
        className={cn(
          'break-words text-[22px] font-semibold leading-tight tracking-tight',
          TONE_VALUE[tone]
        )}
      >
        {value}
      </p>

      {hint && <p className="text-xs leading-snug text-ink-500">{hint}</p>}
      {delta && <DeltaBadge delta={delta} label={comparisonLabel} invert={invertDelta} />}
    </>
  );

  const shell = cn(
    'flex min-w-0 flex-col gap-2 p-4 text-left transition-shadow',
    onClick && 'cursor-pointer hover:shadow-soft active:bg-ink-50',
    className
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="min-w-0 text-left">
        <Card className={cn(shell, 'h-full w-full')}>{content}</Card>
      </button>
    );
  }

  return <Card className={shell}>{content}</Card>;
}

/**
 * Comparacao com o periodo anterior. Quando o anterior foi zero nao existe
 * percentual possivel — a tela diz isso em vez de inventar um numero.
 */
export function DeltaBadge({
  delta,
  label,
  className,
  invert,
}: {
  delta: Delta;
  label?: string;
  className?: string;
  /** Para despesas: subir e ruim, cair e bom. */
  invert?: boolean;
  }) {
  if (delta.percent === null) {
    return (
      <p className={cn('text-[11px] leading-snug text-ink-400', className)}>
        {delta.current > 0 ? 'Sem dados no período anterior' : 'Sem dados suficientes para comparação'}
      </p>
    );
  }

  const up = delta.direction === 'up';
  const flat = delta.direction === 'flat';
  const good = invert ? !up : up;
  const Icon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight;

  return (
    <p
      className={cn(
        'inline-flex flex-wrap items-center gap-1 text-[11px] font-medium leading-snug',
        flat ? 'text-ink-500' : good ? 'text-green-600' : 'text-red-600',
        className
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      {flat
        ? 'Estável'
        : `${Math.abs(delta.percent).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`}
      {label && <span className="font-normal text-ink-500">{label}</span>}
    </p>
  );
}
