'use client';

import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/lib/utils/format';
import { FinanceAppointmentList } from './FinanceAppointmentList';
import type { Appointment } from '@/types';

export interface BreakdownData {
  title: string;
  subtitle: string;
  total: number;
  count: number;
  appointments: Appointment[];
  /** Linhas extras de contexto (percentual, ticket, etc.). */
  facts: { label: string; value: string }[];
}

/**
 * Detalhe ao tocar em um servico ou forma de pagamento: quanto, quantos e
 * quais atendimentos formaram aquele numero.
 */
export function BreakdownSheet({
  data,
  onClose,
}: {
  data: BreakdownData | null;
  onClose: () => void;
}) {
  if (!data) return null;

  return (
    <Modal
      open={Boolean(data)}
      onClose={onClose}
      title={data.title}
      size="lg"
      fullScreenOnMobile
      footer={
        <Button variant="secondary" className="flex-1" onClick={onClose}>
          Fechar
        </Button>
      }
    >
      <div className="space-y-5">
        <div className="rounded-2xl border border-ink-200 bg-ink-50 p-4">
          <p className="text-xs font-medium text-ink-500">{data.subtitle}</p>
          <p className="mt-1 break-words text-3xl font-semibold tracking-tight text-ink-900">
            {formatCurrency(data.total)}
          </p>
          <p className="mt-1 text-sm text-ink-600">{data.count} atendimento(s)</p>
        </div>

        {data.facts.length > 0 && (
          <dl className="divide-y divide-ink-100">
            {data.facts.map((fact) => (
              <div key={fact.label} className="flex items-center justify-between gap-3 py-2.5">
                <dt className="text-sm text-ink-600">{fact.label}</dt>
                <dd className="text-sm font-semibold text-ink-900">{fact.value}</dd>
              </div>
            ))}
          </dl>
        )}

        <div>
          <h3 className="mb-2 text-sm font-semibold text-ink-900">Atendimentos</h3>
          <FinanceAppointmentList
            appointments={data.appointments}
            emptyLabel="Nenhum atendimento concluído com este filtro."
            showDate
          />
        </div>
      </div>
    </Modal>
  );
}
