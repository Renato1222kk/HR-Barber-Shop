'use client';

import { formatCurrency, formatTime } from '@/lib/utils/format';
import { Section } from './FinanceSection';
import type { FinanceReport } from '@/lib/data/finance';

/** "Resumo do dia": os números do dia em uma leitura só. */
export function DaySummary({ report }: { report: FinanceReport }) {
  const first = report.firstAppointment;
  const last = report.lastAppointment;

  const items: { label: string; value: string }[] = [
    {
      label: 'Primeiro atendimento',
      value: first ? `${formatTime(first.start_time)} · ${first.client_name}` : '—',
    },
    {
      label: 'Último atendimento',
      value: last ? `${formatTime(last.start_time)} · ${last.client_name}` : '—',
    },
    { label: 'Clientes atendidos', value: String(report.clients) },
    { label: 'Faturamento', value: formatCurrency(report.serviceRevenue) },
    { label: 'Ticket médio', value: formatCurrency(report.ticketAverage) },
    { label: 'Total de despesas', value: formatCurrency(report.expense) },
    { label: 'Saldo do dia', value: formatCurrency(report.balance) },
    {
      label: 'Serviço mais realizado',
      value: report.topServiceByCount
        ? `${report.topServiceByCount.name} (${report.topServiceByCount.count}x)`
        : '—',
    },
    {
      label: 'Serviço que mais faturou',
      value: report.topServiceByRevenue
        ? `${report.topServiceByRevenue.name} · ${formatCurrency(report.topServiceByRevenue.revenue)}`
        : '—',
    },
  ];

  return (
    <Section title="Resumo do dia">
      <dl className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex items-start justify-between gap-3 border-b border-ink-100 py-2.5 last:border-b-0 sm:last:border-b"
          >
            <dt className="min-w-0 text-sm text-ink-600">{item.label}</dt>
            <dd className="shrink-0 max-w-[60%] break-words text-right text-sm font-semibold text-ink-900">
              {item.value}
            </dd>
          </div>
        ))}
      </dl>
    </Section>
  );
}
