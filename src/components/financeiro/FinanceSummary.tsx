'use client';

import {
  CalendarCheck,
  CalendarRange,
  Clock4,
  Receipt,
  Scissors,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils/format';
import { DeltaBadge, FinanceMetricCard } from './FinanceMetricCard';
import { Sparkline } from './RevenueChart';
import type { FinanceReport } from '@/lib/data/finance';

interface Props {
  report: FinanceReport;
  onOpenDay?: (iso: string) => void;
}

/**
 * Bloco principal do painel, na ordem de importancia: faturamento, saldo,
 * despesas, atendimentos e ticket medio. Tudo do periodo selecionado.
 */
export function FinanceSummary({ report, onOpenDay }: Props) {
  const secondary = buildSecondary(report, onOpenDay);

  return (
    <div className="space-y-3">
      {/* 1. Faturamento — o numero mais importante da tela. */}
      <div className="overflow-hidden rounded-2xl bg-ink-950 p-5 text-white shadow-soft">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-white/60">Faturamento</p>
          <p className="mt-1.5 break-words text-[34px] font-semibold leading-none tracking-tight sm:text-4xl">
            {formatCurrency(report.serviceRevenue)}
          </p>
          <p className="mt-2 text-sm text-white/70">
            {report.completed}{' '}
            {report.completed === 1 ? 'atendimento concluído' : 'atendimentos concluídos'}
          </p>
        </div>

        {/* Sparkline em faixa: nunca disputa espaco com o valor no celular. */}
        {report.series.length > 1 && (
          <Sparkline
            values={report.series.map((s) => s.revenue)}
            className="mt-4 h-8 w-full text-white/70"
          />
        )}

        <div className="mt-4 border-t border-white/10 pt-3">
          <RevenueDelta report={report} />
        </div>
      </div>

      {/* 2 e 3. Saldo e despesas */}
      <div className="grid grid-cols-1 gap-3 xs:grid-cols-2">
        <FinanceMetricCard
          label="Saldo do período"
          value={formatCurrency(report.balance)}
          hint="Receitas − despesas"
          icon={Wallet}
          tone={report.balance < 0 ? 'negative' : 'neutral'}
          delta={report.deltas.balance}
          comparisonLabel={report.comparisonLabel}
        />
        <FinanceMetricCard
          label="Despesas"
          value={formatCurrency(report.expense)}
          hint={
            report.totalIncome > 0
              ? `${Math.round((report.expense / report.totalIncome) * 100)}% da receita`
              : 'Nenhuma despesa lançada'
          }
          icon={TrendingDown}
          tone={report.expense > 0 ? 'negative' : 'neutral'}
          delta={report.deltas.expense}
          comparisonLabel={report.comparisonLabel}
          invertDelta
        />
      </div>

      {/* 4 e 5. Atendimentos e ticket medio */}
      <div className="grid grid-cols-1 gap-3 xs:grid-cols-2">
        <FinanceMetricCard
          label="Atendimentos"
          value={String(report.completed)}
          hint="Concluídos no período"
          icon={CalendarCheck}
          delta={report.deltas.completed}
          comparisonLabel={report.comparisonLabel}
        />
        <FinanceMetricCard
          label="Ticket médio"
          value={formatCurrency(report.ticketAverage)}
          hint="Por atendimento"
          icon={Receipt}
          delta={report.deltas.ticket}
          comparisonLabel={report.comparisonLabel}
        />
      </div>

      {/* Indicadores de apoio */}
      {secondary.length > 0 && (
        <div className="grid grid-cols-1 gap-3 xs:grid-cols-2 lg:grid-cols-4">
          {secondary.map((item) => (
            <FinanceMetricCard key={item.label} {...item} />
          ))}
        </div>
      )}
    </div>
  );
}

function RevenueDelta({ report }: { report: FinanceReport }) {
  const delta = report.deltas.revenue;

  if (delta.percent === null) {
    return (
      <p className="text-xs text-white/60">
        {delta.previous === 0 && delta.current > 0
          ? `Nenhum faturamento no período anterior · ${report.comparisonLabel}`
          : 'Sem dados suficientes para comparação'}
      </p>
    );
  }

  const up = delta.direction === 'up';
  const flat = delta.direction === 'flat';

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
      <span
        className={
          flat
            ? 'inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-1 font-medium text-white/80'
            : up
              ? 'inline-flex items-center gap-1 rounded-full bg-green-500/15 px-2 py-1 font-semibold text-green-300'
              : 'inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-1 font-semibold text-red-300'
        }
      >
        {flat ? '—' : up ? '↑' : '↓'}
        {flat
          ? 'Estável'
          : `${Math.abs(delta.percent).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`}
      </span>
      <span className="text-white/60">
        {report.comparisonLabel} · {formatCurrency(delta.previous)}
      </span>
    </div>
  );
}

type SecondaryCard = Parameters<typeof FinanceMetricCard>[0];

/** Indicadores de apoio mudam conforme o periodo — sem card generico sobrando. */
function buildSecondary(
  report: FinanceReport,
  onOpenDay?: (iso: string) => void
): SecondaryCard[] {
  const cards: SecondaryCard[] = [];

  if (report.pending > 0 || report.range.mode === 'day') {
    cards.push({
      label: 'Pendentes',
      value: String(report.pending),
      hint: 'Ainda não concluídos',
      icon: Clock4,
    });
  }

  if (report.range.mode === 'day') {
    cards.push({
      label: 'Clientes',
      value: String(report.clients),
      hint: 'Atendidos no dia',
      icon: Users,
    });
    if (report.extraIncome > 0) {
      cards.push({
        label: 'Entradas extras',
        value: formatCurrency(report.extraIncome),
        hint: 'Fora da agenda',
        icon: TrendingUp,
        tone: 'positive',
      });
    }
    if (report.topServiceByCount) {
      cards.push({
        label: 'Serviço destaque',
        value: report.topServiceByCount.name,
        hint: `${report.topServiceByCount.count}x · ${formatCurrency(report.topServiceByCount.revenue)}`,
        icon: Scissors,
      });
    }
    return cards;
  }

  cards.push({
    label: 'Média por dia trabalhado',
    value: formatCurrency(report.workedDayAverage),
    hint: `${report.workedDays} de ${report.days} dias com atendimento`,
    icon: CalendarRange,
  });

  const best = report.bestDay;
  if (best) {
    cards.push({
      label: 'Melhor dia',
      value: formatCurrency(best.revenue),
      hint: best.label,
      icon: TrendingUp,
      tone: 'positive',
      onClick: onOpenDay ? () => onOpenDay(best.iso) : undefined,
    });
  }

  cards.push({
    label: 'Média diária',
    value: formatCurrency(report.dailyAverage),
    hint: `Sobre ${report.days} dia(s) do período`,
    icon: Wallet,
  });

  return cards;
}

export { DeltaBadge };
