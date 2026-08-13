'use client';

import { useMemo } from 'react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils/cn';
import { formatCurrency } from '@/lib/utils/format';
import { paymentMethodLabel } from '@/lib/constants';
import { buildDayDetails, type FinanceFilters } from '@/lib/data/finance';
import type { ISODate } from '@/lib/utils/date';
import type { Appointment, FinancialEntry } from '@/types';
import { FinanceAppointmentList } from './FinanceAppointmentList';

interface Props {
  iso: ISODate | null;
  appointments: Appointment[];
  entries: FinancialEntry[];
  filters: FinanceFilters;
  today: ISODate;
  onClose: () => void;
  /** Leva o painel inteiro para este dia. */
  onFocusDay: (iso: ISODate) => void;
}

/**
 * Detalhe de um dia: abre ao tocar em uma coluna do grafico, num dos
 * melhores dias ou num atendimento do extrato.
 */
export function DayDetailsSheet({
  iso,
  appointments,
  entries,
  filters,
  today,
  onClose,
  onFocusDay,
}: Props) {
  const details = useMemo(
    () => (iso ? buildDayDetails({ appointments, entries, filters, iso }, today) : null),
    [iso, appointments, entries, filters, today]
  );

  if (!details) return null;

  const entryMovements = details.movements.filter((m) => m.source === 'entry');

  return (
    <Modal
      open={Boolean(iso)}
      onClose={onClose}
      title={details.title}
      size="lg"
      fullScreenOnMobile
      footer={
        <>
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            Fechar
          </Button>
          <Button
            className="flex-1"
            onClick={() => {
              onFocusDay(details.iso);
              onClose();
            }}
          >
            Abrir no painel
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <Metric label="Faturamento" value={formatCurrency(details.revenue)} />
          <Metric label="Atendimentos" value={String(details.completed)} />
          <Metric label="Ticket médio" value={formatCurrency(details.ticketAverage)} />
          <Metric
            label="Despesas"
            value={formatCurrency(details.expense)}
            tone={details.expense > 0 ? 'negative' : 'neutral'}
          />
          <div className="col-span-2 rounded-xl border border-ink-200 bg-ink-50 p-4">
            <p className="text-xs font-medium text-ink-500">Saldo do dia</p>
            <p
              className={cn(
                'mt-1 break-words text-2xl font-semibold tracking-tight',
                details.balance < 0 ? 'text-red-600' : 'text-ink-900'
              )}
            >
              {formatCurrency(details.balance)}
            </p>
            {details.extraIncome > 0 && (
              <p className="mt-1 text-xs text-ink-500">
                Inclui {formatCurrency(details.extraIncome)} de entradas extras.
              </p>
            )}
          </div>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold text-ink-900">Atendimentos do dia</h3>
          <FinanceAppointmentList
            appointments={details.appointments}
            emptyLabel="Nenhum atendimento neste dia."
          />
        </div>

        {entryMovements.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-semibold text-ink-900">Lançamentos do dia</h3>
            <ul className="space-y-2">
              {entryMovements.map((movement) => {
                const income = movement.type === 'income';
                return (
                  <li
                    key={movement.id}
                    className="flex items-center gap-3 rounded-xl border border-ink-200 p-3"
                  >
                    <span
                      className={cn(
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                        income ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                      )}
                    >
                      {income ? (
                        <ArrowUpRight className="h-4 w-4" />
                      ) : (
                        <ArrowDownRight className="h-4 w-4" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink-900">
                        {movement.description}
                      </p>
                      <p className="truncate text-xs text-ink-500">
                        {movement.categoryLabel} · {paymentMethodLabel(movement.paymentMethod)}
                      </p>
                    </div>
                    <span
                      className={cn(
                        'shrink-0 text-sm font-semibold tabular-nums',
                        income ? 'text-green-600' : 'text-red-600'
                      )}
                    >
                      {income ? '+' : '−'} {formatCurrency(movement.amount)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </Modal>
  );
}

function Metric({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  tone?: 'neutral' | 'negative';
}) {
  return (
    <div className="rounded-xl border border-ink-200 p-3">
      <p className="text-xs text-ink-500">{label}</p>
      <p
        className={cn(
          'mt-1 break-words text-lg font-semibold tracking-tight',
          tone === 'negative' ? 'text-red-600' : 'text-ink-900'
        )}
      >
        {value}
      </p>
    </div>
  );
}
