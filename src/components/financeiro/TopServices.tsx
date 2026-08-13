'use client';

import { useMemo, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { formatCurrency } from '@/lib/utils/format';
import { Section, EmptyLine, PercentBar } from './FinanceSection';
import type { ServiceSlice } from '@/lib/data/finance';

type SortMode = 'count' | 'revenue';

interface Props {
  services: ServiceSlice[];
  onSelect?: (service: ServiceSlice) => void;
}

/** Serviços do período, alternando entre mais realizados e maior faturamento. */
export function TopServices({ services, onSelect }: Props) {
  const [sort, setSort] = useState<SortMode>('count');

  const ordered = useMemo(() => {
    const list = [...services];
    list.sort((a, b) =>
      sort === 'count'
        ? b.count - a.count || b.revenue - a.revenue
        : b.revenue - a.revenue || b.count - a.count
    );
    return list.slice(0, 8);
  }, [services, sort]);

  const max = ordered.length
    ? Math.max(...ordered.map((s) => (sort === 'count' ? s.count : s.revenue)))
    : 0;

  return (
    <Section
      title="Serviços"
      action={
        <div className="flex rounded-xl border border-ink-200 bg-white p-0.5">
          {(
            [
              { key: 'count', label: 'Mais realizados' },
              { key: 'revenue', label: 'Maior faturamento' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSort(tab.key)}
              className={cn(
                'h-8 whitespace-nowrap rounded-lg px-2.5 text-xs font-semibold transition-colors',
                sort === tab.key ? 'bg-ink-950 text-white' : 'text-ink-600 hover:bg-ink-100'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      }
    >
      {ordered.length === 0 ? (
        <EmptyLine>Nenhum atendimento concluído neste período.</EmptyLine>
      ) : (
        <ul className="space-y-1">
          {ordered.map((service, index) => {
            const metric = sort === 'count' ? service.count : service.revenue;
            const content = (
              <>
                <div className="flex items-center gap-2.5">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-ink-100 text-[11px] font-semibold text-ink-700">
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink-900">
                    {service.name}
                  </span>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-ink-900">
                    {formatCurrency(service.revenue)}
                  </span>
                  {onSelect && <ChevronRight className="h-4 w-4 shrink-0 text-ink-400" />}
                </div>
                <PercentBar percent={max > 0 ? (metric / max) * 100 : 0} />
                <p className="mt-1 text-xs text-ink-500">
                  {service.count} atendimento(s) ·{' '}
                  {service.percent.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% do
                  faturamento
                </p>
              </>
            );

            return (
              <li key={service.name}>
                {onSelect ? (
                  <button
                    type="button"
                    onClick={() => onSelect(service)}
                    className="w-full rounded-xl px-2 py-2 text-left transition-colors hover:bg-ink-50 active:bg-ink-100"
                  >
                    {content}
                  </button>
                ) : (
                  <div className="px-2 py-2">{content}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Section>
  );
}
