'use client';

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { ChevronRight } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/format';
import { Section, EmptyLine, PercentBar } from './FinanceSection';
import type { PaymentSlice } from '@/lib/data/finance';

// Escala grafite: cor so quando significa algo — aqui a hierarquia e o peso.
const SLICE_COLORS = ['#111827', '#374151', '#6b7280', '#9ca3af', '#d1d5db', '#e5e7eb'];

interface Props {
  payments: PaymentSlice[];
  total: number;
  onSelect?: (slice: PaymentSlice) => void;
}

/** Como o dinheiro entrou no periodo (atendimentos + receitas avulsas). */
export function PaymentMethods({ payments, total, onSelect }: Props) {
  const slices = payments.filter((p) => p.value > 0);

  return (
    <Section title="Formas de pagamento" description="Sobre o valor recebido no período">
      {slices.length === 0 ? (
        <EmptyLine>Nenhum recebimento neste período.</EmptyLine>
      ) : (
        <div className="space-y-4 sm:flex sm:items-center sm:gap-6 sm:space-y-0">
          <div className="relative mx-auto h-[170px] w-[170px] shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={slices}
                  dataKey="value"
                  nameKey="label"
                  innerRadius={54}
                  outerRadius={82}
                  paddingAngle={2}
                  stroke="#ffffff"
                  strokeWidth={2}
                >
                  {slices.map((slice, i) => (
                    <Cell key={slice.method} fill={SLICE_COLORS[i % SLICE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: 12,
                    fontSize: 12,
                    padding: '8px 10px',
                  }}
                  formatter={(value: number, name) => [formatCurrency(value), name]}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[10px] font-medium uppercase tracking-wide text-ink-400">
                Recebido
              </span>
              <span className="px-2 text-center text-sm font-semibold leading-tight text-ink-900">
                {formatCurrency(total)}
              </span>
            </div>
          </div>

          <ul className="min-w-0 flex-1 space-y-1">
            {slices.map((slice, i) => {
              const row = (
                <>
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: SLICE_COLORS[i % SLICE_COLORS.length] }}
                    />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink-900">
                      {slice.label}
                    </span>
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-ink-900">
                      {formatCurrency(slice.value)}
                    </span>
                    {onSelect && <ChevronRight className="h-4 w-4 shrink-0 text-ink-400" />}
                  </div>
                  <PercentBar percent={slice.percent} />
                  <p className="mt-1 text-xs text-ink-500">
                    {slice.percent.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% ·{' '}
                    {slice.count} recebimento(s)
                  </p>
                </>
              );

              return (
                <li key={slice.method}>
                  {onSelect ? (
                    <button
                      type="button"
                      onClick={() => onSelect(slice)}
                      className="w-full rounded-xl px-2 py-2 text-left transition-colors hover:bg-ink-50 active:bg-ink-100"
                    >
                      {row}
                    </button>
                  ) : (
                    <div className="px-2 py-2">{row}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </Section>
  );
}
