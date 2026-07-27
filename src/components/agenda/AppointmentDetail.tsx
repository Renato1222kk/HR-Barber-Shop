'use client';

import { useState } from 'react';
import {
  Pencil,
  Trash2,
  Clock,
  Calendar,
  Scissors,
  StickyNote,
  Repeat,
  UserCog,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ScopeDialog } from '@/components/ui/ScopeDialog';
import { ErrorState } from '@/components/ui/Misc';
import { WhatsAppButton } from '@/components/WhatsAppButton';
import { cn } from '@/lib/utils/cn';
import { STATUS_META, STATUS_ORDER } from '@/lib/constants';
import { formatCurrency, formatDateFull, formatTime } from '@/lib/utils/format';
import { errorMessage } from '@/lib/utils/error';
import { confirmationMessage } from '@/lib/utils/whatsapp';
import {
  removeAppointment,
  removeAppointmentSeries,
  updateAppointment,
} from '@/services';
import { emitDataChanged } from '@/lib/events';
import type { Appointment, AppointmentStatus, EditScope } from '@/types';

interface Props {
  appointment: Appointment | null;
  onClose: () => void;
  onEdit: (a: Appointment) => void;
}

export function AppointmentDetail({ appointment: a, onClose, onEdit }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [scopeOpen, setScopeOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!a) return null;

  const isRecurring = Boolean(a.is_recurring && a.recurring_group_id);

  const changeStatus = async (status: AppointmentStatus) => {
    if (status === a.status) return;
    setBusy(true);
    setError(null);
    try {
      await updateAppointment(a.id, { status });
      emitDataChanged();
      onClose();
    } catch (e) {
      setError(errorMessage(e, 'Não foi possível alterar o status.'));
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    setBusy(true);
    setError(null);
    try {
      await removeAppointment(a.id);
      emitDataChanged();
      setConfirming(false);
      onClose();
    } catch (e) {
      setError(errorMessage(e, 'Não foi possível excluir o agendamento.'));
      setConfirming(false);
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteScope = async (scope: EditScope) => {
    setBusy(true);
    setError(null);
    try {
      if (scope === 'series' && a.recurring_group_id) {
        await removeAppointmentSeries(a.recurring_group_id);
      } else {
        await removeAppointment(a.id);
      }
      emitDataChanged();
      setScopeOpen(false);
      onClose();
    } catch (e) {
      setError(errorMessage(e, 'Não foi possível excluir o agendamento.'));
      setScopeOpen(false);
    } finally {
      setBusy(false);
    }
  };

  const onDeleteClick = () => (isRecurring ? setScopeOpen(true) : setConfirming(true));

  return (
    <>
      <Modal open={Boolean(a)} onClose={onClose} title="Detalhes do agendamento">
        <div className="space-y-5">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold text-ink-900">{a.client_name}</h3>
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-ink-900">{formatCurrency(a.price)}</p>
                {isRecurring && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-gold-200 bg-gold-50 px-2 py-0.5 text-[10px] font-medium text-gold-700">
                    <Repeat className="h-3 w-3" /> Recorrente
                  </span>
                )}
              </div>
            </div>
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium',
                STATUS_META[a.status].badge
              )}
            >
              <span className={cn('h-1.5 w-1.5 rounded-full', STATUS_META[a.status].dot)} />
              {STATUS_META[a.status].label}
            </span>
          </div>

          {error && <ErrorState message={error} />}

          <div className="space-y-2.5 rounded-xl border border-ink-200 bg-ink-50 p-4 text-sm">
            <Row icon={Scissors} label={a.service_name} />
            {a.barber_name && <Row icon={UserCog} label={a.barber_name} />}
            <Row icon={Calendar} label={formatDateFull(a.date)} />
            <Row
              icon={Clock}
              label={`${formatTime(a.start_time)} – ${formatTime(a.end_time)} (${a.duration_minutes} min)`}
            />
            {a.notes && <Row icon={StickyNote} label={a.notes} />}
          </div>

          {/* Mudar status */}
          <div>
            <p className="mb-2 text-xs font-medium text-ink-600">Alterar status</p>
            <div className="flex flex-wrap gap-2">
              {STATUS_ORDER.map((s) => {
                const active = s === a.status;
                return (
                  <button
                    key={s}
                    disabled={busy}
                    onClick={() => changeStatus(s)}
                    className={cn(
                      'rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50',
                      active
                        ? STATUS_META[s].badge
                        : 'border-ink-200 text-ink-600 hover:border-ink-300 hover:text-ink-900'
                    )}
                  >
                    {STATUS_META[s].label}
                  </button>
                );
              })}
            </div>
          </div>

          {a.client_whatsapp && (
            <WhatsAppButton
              number={a.client_whatsapp}
              message={confirmationMessage({
                name: a.client_name,
                date: a.date,
                time: a.start_time,
                service: a.service_name,
              })}
              label="Confirmar pelo WhatsApp"
              className="w-full"
            />
          )}

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => onEdit(a)}>
              <Pencil className="h-4 w-4" />
              Editar
            </Button>
            <Button variant="danger" className="flex-1" onClick={onDeleteClick}>
              <Trash2 className="h-4 w-4" />
              Excluir
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirming}
        title="Excluir agendamento?"
        description={`O agendamento de ${a.client_name} será removido.`}
        loading={busy}
        onConfirm={handleDelete}
        onClose={() => setConfirming(false)}
      />

      <ScopeDialog
        open={scopeOpen}
        title="O que deseja excluir?"
        description="Este agendamento faz parte de uma série recorrente."
        oneLabel="Apenas este agendamento"
        seriesLabel="Toda a série"
        loading={busy}
        onChoose={handleDeleteScope}
        onClose={() => setScopeOpen(false)}
      />
    </>
  );
}

function Row({ icon: Icon, label }: { icon: typeof Clock; label: string }) {
  return (
    <div className="flex items-center gap-2.5 text-ink-700">
      <Icon className="h-4 w-4 shrink-0 text-ink-500" />
      <span>{label}</span>
    </div>
  );
}
