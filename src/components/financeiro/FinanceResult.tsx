'use client';

import { formatCurrency } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';
import { Section, ResultRow } from './FinanceSection';
import { DeltaBadge } from './FinanceMetricCard';
import type { FinanceReport } from '@/lib/data/finance';

/**
 * Resultado financeiro do periodo em quatro linhas: de onde veio o
 * dinheiro, o que saiu e o que sobrou. Sem jargao e sem repetir receita.
 */
export function FinanceResult({ report }: { report: FinanceReport }) {
  const negative = report.balance < 0;

  return (
    <Section title="Resultado financeiro" description="Tudo do período selecionado">
      <div className="divide-y divide-ink-100">
        <ResultRow
          label="Receita de serviços"
          hint={`${report.completed} atendimento(s) concluído(s)`}
          value={formatCurrency(report.serviceRevenue)}
          tone="positive"
        />
        <ResultRow
          label="Entradas extras"
          hint="Lançamentos fora da agenda"
          value={formatCurrency(report.extraIncome)}
          tone={report.extraIncome > 0 ? 'positive' : 'neutral'}
        />
        <ResultRow
          label="Despesas"
          hint={
            report.totalIncome > 0
              ? `${Math.round((report.expense / report.totalIncome) * 100)}% da receita do período`
              : 'Nenhuma despesa lançada'
          }
          value={report.expense > 0 ? `− ${formatCurrency(report.expense)}` : formatCurrency(0)}
          tone={report.expense > 0 ? 'negative' : 'neutral'}
        />
      </div>

      <div className="mt-3 rounded-2xl border border-ink-200 bg-ink-50 p-4">
        <p className="text-xs font-medium text-ink-500">Saldo do período</p>
        <p
          className={cn(
            'mt-1 break-words text-3xl font-semibold leading-tight tracking-tight',
            negative ? 'text-red-600' : 'text-ink-900'
          )}
        >
          {formatCurrency(report.balance)}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
          <DeltaBadge delta={report.deltas.balance} label={report.comparisonLabel} />
        </div>
        <p className="mt-2 text-xs leading-snug text-ink-500">
          {formatCurrency(report.serviceRevenue)} em serviços +{' '}
          {formatCurrency(report.extraIncome)} de entradas extras −{' '}
          {formatCurrency(report.expense)} de despesas.
        </p>
      </div>
    </Section>
  );
}
