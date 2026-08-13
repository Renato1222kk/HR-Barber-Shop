'use client';

import { cn } from '@/lib/utils/cn';
import { STATUS_META, paymentMethodLabel } from '@/lib/constants';
import { formatCurrency, formatDateShort, formatTime } from '@/lib/utils/format';
import { EmptyLine } from './FinanceSection';
import type { Appointment } from '@/types';

/**
 * Atendimentos em cards — no celular tabela horizontal e inutilizavel.
 * O mesmo componente serve a visao do dia e aos detalhes em sheet.
 */
export function FinanceAppointmentList({
  appointments,
  emptyLabel = 'Nenhum atendimento neste período.',
  showDate,
}: {
  appointments: Appointment[];
  emptyLabel?: string;
  showDate?: boolean;
}) {
  if (appointments.length === 0) return <EmptyLine>{emptyLabel}</EmptyLine>;

  return (
    <ul className="space-y-2">
      {appointments.map((a) => {
        const meta = STATUS_META[a.status];
        return (
          <li
            key={a.id}
            className="flex items-start gap-3 rounded-xl border border-ink-200 bg-white p-3"
          >
            <div className="flex w-14 shrink-0 flex-col items-center rounded-lg bg-ink-50 px-1 py-2 text-center">
              <span className="text-sm font-semibold text-ink-900">
                {formatTime(a.start_time)}
              </span>
              {showDate && (
                <span className="text-[10px] text-ink-500">{formatDateShort(a.date)}</span>
              )}
            </div>

            {/* Nome e valor dividem a primeira linha; servico, pagamento e
                status ficam abaixo — no celular de 320px so assim o nome
                do cliente aparece inteiro. */}
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <p className="min-w-0 truncate text-sm font-semibold text-ink-900">
                  {a.client_name}
                </p>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-ink-900">
                  {formatCurrency(a.price)}
                </span>
              </div>
              <p className="truncate text-xs text-ink-600">{a.service_name}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                <span
                  className={cn(
                    'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium',
                    meta.badge
                  )}
                >
                  {meta.label}
                </span>
                <span className="text-xs text-ink-400">
                  {paymentMethodLabel(a.payment_method)}
                </span>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
