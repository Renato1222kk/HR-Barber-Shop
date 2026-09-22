'use client';

import { CalendarDays, Clock, Scissors, User, Phone, StickyNote } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { computeEndTime } from '@/lib/utils/date';
import { formatDateLong } from '@/lib/utils/format';
import { formatWhatsappDisplay } from '@/lib/utils/whatsapp';
import type { PublicService } from '@/lib/booking/types';
import { StepTitle, Price, formatDuration, ErrorBlock, StickyActionBar } from './ui';

interface ConfirmStepProps {
  service: PublicService;
  date: string;
  time: string;
  name: string;
  whatsapp: string;
  notes: string;
  submitting: boolean;
  error: string | null;
  onConfirm: () => void;
  onEdit: () => void;
}

export function ConfirmStep({
  service,
  date,
  time,
  name,
  whatsapp,
  notes,
  submitting,
  error,
  onConfirm,
  onEdit,
}: ConfirmStepProps) {
  const endTime = computeEndTime(time, service.duration_minutes);

  return (
    <div className="animate-fade-in">
      <StepTitle title="Confirme seu horário" subtitle="Revise os detalhes antes de finalizar." />

      <div className="overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-card">
        {/* Cabeçalho do serviço */}
        <div className="flex items-center justify-between gap-3 border-b border-ink-100 bg-ink-50 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-ink-700 ring-1 ring-ink-200">
              <Scissors className="h-5 w-5" />
            </span>
            <span className="text-base font-semibold text-ink-900">{service.name}</span>
          </div>
          <Price value={service.price} />
        </div>

        {/* Detalhes */}
        <dl className="divide-y divide-ink-100">
          <Row icon={<CalendarDays className="h-4 w-4" />} label="Data">
            {capitalize(formatDateLong(date))}
          </Row>
          <Row icon={<Clock className="h-4 w-4" />} label="Horário">
            {time} – {endTime}
            <span className="ml-2 text-xs font-normal text-ink-400">
              ({formatDuration(service.duration_minutes)})
            </span>
          </Row>
          <Row icon={<User className="h-4 w-4" />} label="Nome">
            {name}
          </Row>
          <Row icon={<Phone className="h-4 w-4" />} label="WhatsApp">
            {formatWhatsappDisplay(whatsapp)}
          </Row>
          {notes && (
            <Row icon={<StickyNote className="h-4 w-4" />} label="Observação">
              {notes}
            </Row>
          )}
        </dl>
      </div>

      {error && (
        <div className="mt-4">
          <ErrorBlock message={error} />
        </div>
      )}

      <StickyActionBar>
        <div className="space-y-2">
          <Button
            type="button"
            size="lg"
            className="w-full"
            loading={submitting}
            onClick={onConfirm}
          >
            {submitting ? 'Reservando seu horário...' : 'Confirmar agendamento'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            disabled={submitting}
            onClick={onEdit}
          >
            Alterar
          </Button>
        </div>
      </StickyActionBar>
    </div>
  );
}

function Row({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 px-5 py-3.5">
      <span className="mt-0.5 text-ink-400">{icon}</span>
      <dt className="w-24 shrink-0 text-sm text-ink-500">{label}</dt>
      <dd className="min-w-0 flex-1 text-right text-sm font-medium text-ink-900">{children}</dd>
    </div>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
