'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select, Textarea } from '@/components/ui/Field';
import { ErrorState } from '@/components/ui/Misc';
import { ScopeDialog } from '@/components/ui/ScopeDialog';
import { RecurrenceSection } from './RecurrenceSection';
import { STATUS_ORDER, STATUS_META } from '@/lib/constants';
import { addMinutes, parseDate, toISODate, formatDateFull, formatTime } from '@/lib/utils/format';
import { errorMessage } from '@/lib/utils/error';
import { generateRecurringDates, findConflicts } from '@/lib/utils/recurrence';
import {
  BARBER_CONFLICT_MESSAGE,
  createAppointment,
  createRecurringAppointments,
  listAppointments,
  listBarbers,
  listClients,
  listServices,
  updateAppointment,
  updateAppointmentSeries,
} from '@/lib/data/repository';
import { emitDataChanged } from '@/lib/events';
import type {
  Appointment,
  AppointmentInput,
  Barber,
  Client,
  EditScope,
  RecurrenceConfig,
  RecurringSlot,
  Service,
} from '@/types';

interface Props {
  open: boolean;
  onClose: () => void;
  appointment?: Appointment | null; // edicao
  defaultDate?: string;
  defaultTime?: string;
}

const empty = (date: string, time: string): AppointmentInput => ({
  client_id: null,
  service_id: null,
  barber_id: null,
  client_name: '',
  client_whatsapp: '',
  service_name: '',
  barber_name: '',
  date,
  start_time: time,
  end_time: addMinutes(time, 40),
  duration_minutes: 40,
  price: 35,
  status: 'agendado',
  notes: null,
});

const defaultRecurrence: RecurrenceConfig = {
  frequency: 'weekly',
  intervalWeeks: 1,
  selectedWeekdays: [],
  endMode: 'date',
  endDate: null,
  occurrencesCount: 10,
};

function addDaysISO(iso: string, days: number): string {
  const d = parseDate(iso);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

export function AppointmentModal({ open, onClose, appointment, defaultDate, defaultTime }: Props) {
  const isEdit = Boolean(appointment);
  const [form, setForm] = useState<AppointmentInput>(
    empty(defaultDate ?? toISODate(new Date()), defaultTime ?? '09:00')
  );
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Recorrencia
  const [recurrenceOn, setRecurrenceOn] = useState(false);
  const [rec, setRec] = useState<RecurrenceConfig>(defaultRecurrence);
  const [step, setStep] = useState<'form' | 'conflicts'>('form');
  const [conflicts, setConflicts] = useState<RecurringSlot[]>([]);
  const [scopeOpen, setScopeOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setStep('form');
    setConflicts([]);
    setScopeOpen(false);
    setRecurrenceOn(false);
    setRec(defaultRecurrence);
    listClients().then(setClients).catch(() => setClients([]));
    listServices().then(setServices).catch(() => setServices([]));
    listBarbers().then(setBarbers).catch(() => setBarbers([]));
    if (appointment) {
      const { id, created_at, ...rest } = appointment;
      setForm(rest);
    } else {
      setForm(empty(defaultDate ?? toISODate(new Date()), defaultTime ?? '09:00'));
    }
  }, [open, appointment, defaultDate, defaultTime]);

  const activeServices = useMemo(
    () => services.filter((s) => s.active || s.id === form.service_id),
    [services, form.service_id]
  );

  const activeBarbers = useMemo(
    () => barbers.filter((b) => b.active || b.id === form.barber_id),
    [barbers, form.barber_id]
  );

  // Previa da recorrencia (recalcula ao mudar config / data / horario).
  const preview = useMemo<RecurringSlot[]>(() => {
    if (!recurrenceOn) return [];
    return generateRecurringDates({
      startDate: form.date,
      startTime: form.start_time,
      frequency: rec.frequency,
      intervalWeeks: rec.intervalWeeks,
      selectedWeekdays: rec.selectedWeekdays,
      endDate: rec.endMode === 'date' ? rec.endDate : null,
      occurrencesCount: rec.endMode === 'count' ? rec.occurrencesCount : null,
    });
  }, [recurrenceOn, rec, form.date, form.start_time]);

  const set = (patch: Partial<AppointmentInput>) => setForm((f) => ({ ...f, ...patch }));
  const setRecPatch = (patch: Partial<RecurrenceConfig>) => setRec((r) => ({ ...r, ...patch }));

  const onSelectService = (serviceId: string) => {
    const svc = services.find((s) => s.id === serviceId);
    if (!svc) {
      set({ service_id: null, service_name: '' });
      return;
    }
    set({
      service_id: svc.id,
      service_name: svc.name,
      duration_minutes: svc.duration_minutes,
      price: svc.price,
      end_time: addMinutes(form.start_time, svc.duration_minutes),
    });
  };

  const onSelectBarber = (barberId: string) => {
    const barber = barbers.find((b) => b.id === barberId);
    set({ barber_id: barber?.id ?? null, barber_name: barber?.name ?? '' });
  };

  const onSelectClientName = (name: string) => {
    const match = clients.find((c) => c.name.toLowerCase() === name.toLowerCase());
    if (match) {
      set({ client_name: match.name, client_id: match.id, client_whatsapp: match.whatsapp });
    } else {
      set({ client_name: name, client_id: null });
    }
  };

  const onChangeTimeOrDuration = (patch: Partial<AppointmentInput>) => {
    const next = { ...form, ...patch };
    set({ ...patch, end_time: addMinutes(next.start_time, next.duration_minutes) });
  };

  const toggleRecurrence = (v: boolean) => {
    setRecurrenceOn(v);
    if (v) {
      setRec((r) => ({
        ...r,
        selectedWeekdays: r.selectedWeekdays.length
          ? r.selectedWeekdays
          : [parseDate(form.date).getDay()],
        endDate: r.endDate ?? addDaysISO(form.date, 90),
      }));
    }
  };

  const validate = (): boolean => {
    if (!form.client_name.trim()) {
      setError('Informe o nome do cliente.');
      return false;
    }
    if (!form.service_id) {
      setError('Selecione um serviço.');
      return false;
    }
    if (!form.barber_id) {
      setError('Selecione um barbeiro.');
      return false;
    }
    return true;
  };

  const finish = async (action: () => Promise<unknown>) => {
    setSaving(true);
    setError(null);
    try {
      await action();
      emitDataChanged();
      onClose();
    } catch (e) {
      setError(errorMessage(e, 'Erro ao salvar agendamento.'));
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    setError(null);
    if (!validate()) return;

    // --- Edicao ---
    if (isEdit && appointment) {
      if (appointment.is_recurring && appointment.recurring_group_id) {
        setScopeOpen(true);
        return;
      }
      return finish(() => updateAppointment(appointment.id, form));
    }

    // --- Novo agendamento unico ---
    if (!recurrenceOn) {
      return finish(() => createAppointment(form));
    }

    // --- Novo agendamento recorrente ---
    if (preview.length === 0) {
      setError('Configure a recorrência: nenhuma data foi gerada.');
      return;
    }
    setSaving(true);
    try {
      const existing = await listAppointments({
        from: preview[0].date,
        to: preview[preview.length - 1].date,
      });
      const conf = findConflicts(preview, form.duration_minutes, existing, form.barber_id);
      if (conf.length > 0) {
        setConflicts(conf);
        setStep('conflicts');
        setSaving(false);
        return;
      }
      await createRecurringAppointments(form, rec, preview);
      emitDataChanged();
      onClose();
    } catch (e) {
      setError(errorMessage(e, 'Erro ao criar agendamentos.'));
    } finally {
      setSaving(false);
    }
  };

  const createOnlyFree = async () => {
    const conflictKeys = new Set(conflicts.map((c) => `${c.date}_${c.time}`));
    const free = preview.filter((s) => !conflictKeys.has(`${s.date}_${s.time}`));
    if (free.length === 0) {
      setError('Nenhum horário livre para criar.');
      return;
    }
    await finish(() => createRecurringAppointments(form, rec, free));
  };

  const applyEditScope = async (scope: EditScope) => {
    if (!appointment) return;
    setSaving(true);
    setError(null);
    try {
      await updateAppointment(appointment.id, form);
      if (scope === 'series' && appointment.recurring_group_id) {
        await updateAppointmentSeries(appointment.recurring_group_id, form);
      }
      emitDataChanged();
      setScopeOpen(false);
      onClose();
    } catch (e) {
      setError(errorMessage(e, 'Erro ao salvar.'));
    } finally {
      setSaving(false);
    }
  };

  const freeCount = preview.length - conflicts.length;

  const title =
    step === 'conflicts'
      ? 'Conflitos encontrados'
      : isEdit
      ? 'Editar agendamento'
      : 'Novo agendamento';

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        size="lg"
        title={title}
        fullScreenOnMobile
        footer={
          step === 'conflicts' ? (
            <>
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => setStep('form')}
                disabled={saving}
              >
                Voltar
              </Button>
              <Button className="flex-1" onClick={createOnlyFree} loading={saving}>
                Criar apenas livres ({freeCount})
              </Button>
            </>
          ) : (
            <>
              <Button variant="secondary" className="flex-1" onClick={onClose} disabled={saving}>
                Cancelar
              </Button>
              <Button className="flex-1" onClick={handleSubmit} loading={saving}>
                {isEdit
                  ? 'Salvar'
                  : recurrenceOn
                  ? `Agendar ${preview.length || ''}`.trim()
                  : 'Agendar'}
              </Button>
            </>
          )
        }
      >
        {step === 'conflicts' ? (
          <ConflictView conflicts={conflicts} freeCount={freeCount} error={error} />
        ) : (
          <div className="space-y-6">
            {error && <ErrorState message={error} />}

            {/* Secao 1 - Cliente */}
            <FormSection title="Cliente">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Cliente">
                  <Input
                    list="clients-list"
                    placeholder="Nome do cliente"
                    value={form.client_name}
                    onChange={(e) => onSelectClientName(e.target.value)}
                  />
                  <datalist id="clients-list">
                    {clients.map((c) => (
                      <option key={c.id} value={c.name} />
                    ))}
                  </datalist>
                </Field>

                <Field label="WhatsApp" hint="Apenas números, com DDD">
                  <Input
                    inputMode="numeric"
                    placeholder="11988887777"
                    value={form.client_whatsapp}
                    onChange={(e) => set({ client_whatsapp: e.target.value })}
                  />
                </Field>
              </div>
            </FormSection>

            {/* Secao 2 - Atendimento */}
            <FormSection title="Atendimento" divider>
              <Field label="Serviço">
                <Select
                  value={form.service_id ?? ''}
                  onChange={(e) => onSelectService(e.target.value)}
                >
                  <option value="">Selecione um serviço</option>
                  {activeServices.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} — {s.duration_minutes} min — R$ {s.price}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Barbeiro">
                <Select
                  value={form.barber_id ?? ''}
                  onChange={(e) => onSelectBarber(e.target.value)}
                >
                  <option value="">Selecione um barbeiro</option>
                  {activeBarbers.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Status">
                <Select
                  value={form.status}
                  onChange={(e) => set({ status: e.target.value as AppointmentInput['status'] })}
                >
                  {STATUS_ORDER.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_META[s].label}
                    </option>
                  ))}
                </Select>
              </Field>
            </FormSection>

            {/* Secao 3 - Data e horario */}
            <FormSection title="Data e horário" divider>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Data">
                  <Input
                    type="date"
                    value={form.date}
                    onChange={(e) => set({ date: e.target.value })}
                  />
                </Field>
                <Field label="Horário">
                  <Input
                    type="time"
                    value={form.start_time}
                    onChange={(e) => onChangeTimeOrDuration({ start_time: e.target.value })}
                  />
                </Field>
              </div>
              <Field label="Término" hint="Calculado automaticamente">
                <Input value={form.end_time} disabled />
              </Field>
            </FormSection>

            {/* Secao 4 - Valores */}
            <FormSection title="Valores" divider>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Duração (min)">
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={5}
                    step={5}
                    value={form.duration_minutes}
                    onChange={(e) =>
                      onChangeTimeOrDuration({ duration_minutes: Number(e.target.value) || 0 })
                    }
                  />
                </Field>
                <Field label="Valor (R$)">
                  <Input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step={5}
                    value={form.price}
                    onChange={(e) => set({ price: Number(e.target.value) || 0 })}
                  />
                </Field>
              </div>
            </FormSection>

            {/* Secao 5 - Extras */}
            <FormSection title="Extras" divider>
              <Field label="Observação">
                <Textarea
                  placeholder="Preferências, detalhes do corte..."
                  value={form.notes ?? ''}
                  onChange={(e) => set({ notes: e.target.value || null })}
                />
              </Field>

              {/* Recorrencia (apenas em novos agendamentos) */}
              {!isEdit && (
                <RecurrenceSection
                  enabled={recurrenceOn}
                  onToggle={toggleRecurrence}
                  config={rec}
                  onChange={setRecPatch}
                  preview={preview}
                />
              )}

              {isEdit && appointment?.is_recurring && (
                <p className="rounded-xl bg-gold/10 px-4 py-2.5 text-xs text-gold">
                  Este agendamento faz parte de uma série recorrente. Ao salvar, você escolhe
                  aplicar só a ele ou a toda a série.
                </p>
              )}
            </FormSection>
          </div>
        )}
      </Modal>

      <ScopeDialog
        open={scopeOpen}
        title="O que deseja alterar?"
        loading={saving}
        onChoose={applyEditScope}
        onClose={() => setScopeOpen(false)}
      />
    </>
  );
}

function FormSection({
  title,
  children,
  divider,
}: {
  title: string;
  children: ReactNode;
  divider?: boolean;
}) {
  return (
    <section className={cn('space-y-4', divider && 'border-t border-ink-700/60 pt-6')}>
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">{title}</h3>
      {children}
    </section>
  );
}

function ConflictView({
  conflicts,
  freeCount,
  error,
}: {
  conflicts: RecurringSlot[];
  freeCount: number;
  error: string | null;
}) {
  return (
    <div className="space-y-4">
      {error && <ErrorState message={error} />}
      <div className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-300">
        <AlertTriangle className="h-5 w-5 shrink-0" />
        <p className="text-sm font-medium">{BARBER_CONFLICT_MESSAGE}</p>
      </div>

      <p className="text-xs text-zinc-400">
        Os horários abaixo já possuem atendimento e <strong>não serão sobrescritos</strong>:
      </p>

      <ul className="max-h-56 space-y-1.5 overflow-y-auto">
        {conflicts.map((c, i) => (
          <li
            key={`${c.date}-${i}`}
            className="flex items-center gap-2.5 rounded-lg bg-ink-900 px-3 py-2.5 text-sm text-zinc-300"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
            {formatDateFull(c.date)} às {formatTime(c.time)}
          </li>
        ))}
      </ul>

      <p className="rounded-xl bg-gold/10 px-4 py-2.5 text-sm text-gold">
        {freeCount > 0
          ? `${freeCount} horário(s) livre(s) serão criados.`
          : 'Nenhum horário livre restante.'}
      </p>
    </div>
  );
}
