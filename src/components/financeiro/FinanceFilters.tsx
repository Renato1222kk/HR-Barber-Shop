'use client';

import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils/cn';
import {
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  STATUS_META,
  STATUS_ORDER,
} from '@/lib/constants';
import { EMPTY_FILTERS, type FinanceFilters as Filters } from '@/lib/data/finance';
import type { AppointmentStatus, PaymentMethod } from '@/types';

interface Props {
  open: boolean;
  filters: Filters;
  services: string[];
  onClose: () => void;
  onApply: (filters: Filters) => void;
}

/**
 * Filtros avancados em bottom sheet — no celular, um painel lateral seria
 * inutilizavel. Sem filtro de barbeiro: a barbearia tem um profissional.
 */
export function FinanceFilters({ open, filters, services, onClose, onApply }: Props) {
  const [draft, setDraft] = useState<Filters>(filters);

  useEffect(() => {
    if (open) setDraft(filters);
  }, [open, filters]);

  const toggle = <T extends string>(list: T[], value: T): T[] =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Filtros"
      footer={
        <>
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => setDraft(EMPTY_FILTERS)}
          >
            Limpar
          </Button>
          <Button className="flex-1" onClick={() => onApply(draft)}>
            Aplicar filtros
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <Group title="Serviço" empty="Nenhum serviço no período.">
          {services.map((service) => (
            <Chip
              key={service}
              active={draft.services.includes(service)}
              onClick={() => setDraft((d) => ({ ...d, services: toggle(d.services, service) }))}
            >
              {service}
            </Chip>
          ))}
        </Group>

        <Group title="Forma de pagamento">
          {PAYMENT_METHODS.map((method: PaymentMethod) => (
            <Chip
              key={method}
              active={draft.payments.includes(method)}
              onClick={() => setDraft((d) => ({ ...d, payments: toggle(d.payments, method) }))}
            >
              {PAYMENT_METHOD_LABELS[method]}
            </Chip>
          ))}
        </Group>

        <Group title="Status do atendimento">
          {STATUS_ORDER.map((status: AppointmentStatus) => (
            <Chip
              key={status}
              active={draft.statuses.includes(status)}
              onClick={() => setDraft((d) => ({ ...d, statuses: toggle(d.statuses, status) }))}
            >
              {STATUS_META[status].label}
            </Chip>
          ))}
        </Group>

        <p className="text-xs leading-snug text-ink-500">
          Os filtros valem para todos os blocos da tela. O faturamento continua contando apenas
          atendimentos concluídos.
        </p>
      </div>
    </Modal>
  );
}

function Group({
  title,
  empty,
  children,
}: {
  title: string;
  empty?: string;
  children: React.ReactNode;
}) {
  const isEmpty = Array.isArray(children) && children.length === 0;
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">{title}</p>
      {isEmpty ? (
        <p className="text-sm text-ink-400">{empty}</p>
      ) : (
        <div className="flex flex-wrap gap-2">{children}</div>
      )}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'h-10 max-w-full truncate rounded-full border px-3.5 text-sm font-medium transition-colors',
        active
          ? 'border-ink-950 bg-ink-950 text-white'
          : 'border-ink-200 bg-white text-ink-700 hover:bg-ink-100'
      )}
    >
      {children}
    </button>
  );
}
