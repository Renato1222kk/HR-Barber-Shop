'use client';

import { ChevronRight } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/format';
import { Section, EmptyLine } from './FinanceSection';
import type { DayBucket } from '@/lib/data/finance';

/** Ranking dos dias que mais faturaram no período. */
export function TopDays({
  days,
  title = 'Melhores dias do período',
  onSelect,
}: {
  days: DayBucket[];
  title?: string;
  onSelect?: (iso: string) => void;
}) {
  return (
    <Section title={title} description="Toque para ver o detalhe do dia">
      {days.length === 0 ? (
        <EmptyLine>Nenhum dia com faturamento neste período.</EmptyLine>
      ) : (
        <ul className="space-y-2">
          {days.map((day, index) => (
            <li key={day.iso}>
              <button
                type="button"
                onClick={() => onSelect?.(day.iso)}
                className="flex w-full items-center gap-3 rounded-xl border border-ink-200 bg-white p-3 text-left transition-colors hover:bg-ink-50 active:bg-ink-100"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ink-100 text-xs font-semibold text-ink-700">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink-900">{day.label}</p>
                  <p className="truncate text-xs text-ink-500">
                    {day.count} atendimento(s)
                    {day.expense > 0 ? ` · ${formatCurrency(day.expense)} em despesas` : ''}
                  </p>
                </div>
                <span className="shrink-0 text-[13px] font-semibold tabular-nums text-ink-900 xs:text-sm">
                  {formatCurrency(day.revenue)}
                </span>
                {/* Em 320px cada pixel conta: a seta some e a data aparece inteira. */}
                <ChevronRight className="hidden h-4 w-4 shrink-0 text-ink-400 xs:block" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}
