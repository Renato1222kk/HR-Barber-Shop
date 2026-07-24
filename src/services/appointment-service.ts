'use client';

// Service de AGENDAMENTOS — inclui detecção de conflito e recorrência.
import type {
  Appointment,
  AppointmentInput,
  RecurrenceConfig,
  RecurringGroup,
  RecurringSlot,
} from '@/types';
import { BUSY_STATUSES } from '@/lib/constants';
import { addMinutes } from '@/lib/utils/format';
import {
  BARBER_CONFLICT_MESSAGE,
  findBarberConflict,
  type ConflictQuery,
} from '@/lib/data/conflict';
import { db, PG_EXCLUSION_VIOLATION, toError } from './_shared';
import { mapAppointment } from './mappers';
import { ensureClient } from './client-service';

// ---------------------------------------------------------------------
// Leitura
// ---------------------------------------------------------------------
export async function listAppointments(range?: {
  from?: string;
  to?: string;
}): Promise<Appointment[]> {
  let query = db().from('appointments').select('*');
  if (range?.from) query = query.gte('date', range.from);
  if (range?.to) query = query.lte('date', range.to);

  const { data, error } = await query.order('date').order('start_time');
  if (error) throw toError(error, 'Falha ao carregar agendamentos.');
  return (data ?? []).map(mapAppointment);
}

export async function getAppointmentById(id: string): Promise<Appointment | null> {
  const { data, error } = await db()
    .from('appointments')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw toError(error, 'Falha ao carregar o agendamento.');
  return data ? mapAppointment(data) : null;
}

// ---------------------------------------------------------------------
// Conflito (pré-checagem amigável; o banco garante via exclusion constraint)
// ---------------------------------------------------------------------
async function assertNoConflict(query: ConflictQuery): Promise<void> {
  if (!query.barberId) return;
  const { data, error } = await db()
    .from('appointments')
    .select('*')
    .eq('barber_id', query.barberId)
    .eq('date', query.date);
  if (error) throw toError(error, 'Falha ao verificar disponibilidade.');
  const clash = findBarberConflict((data ?? []).map(mapAppointment), query);
  if (clash) throw new Error(BARBER_CONFLICT_MESSAGE);
}

/** Traduz a violação da exclusion constraint do banco em mensagem amigável. */
function translateConflict(error: { code?: string; message?: string }): Error {
  if (
    error.code === PG_EXCLUSION_VIOLATION ||
    error.message?.toLowerCase().includes('appointments_no_overlap')
  ) {
    return new Error(BARBER_CONFLICT_MESSAGE);
  }
  return toError(error as never, 'Falha ao salvar o agendamento.');
}

function buildInsert(input: AppointmentInput, clientId: string | null) {
  return {
    client_id: clientId,
    service_id: input.service_id,
    barber_id: input.barber_id,
    client_name: input.client_name,
    client_whatsapp: input.client_whatsapp,
    service_name: input.service_name,
    barber_name: input.barber_name,
    date: input.date,
    start_time: input.start_time,
    end_time: input.end_time,
    duration_minutes: input.duration_minutes,
    price: input.price,
    status: input.status,
    notes: input.notes,
  };
}

// ---------------------------------------------------------------------
// Escrita
// ---------------------------------------------------------------------
export async function createAppointment(input: AppointmentInput): Promise<Appointment> {
  if (BUSY_STATUSES.includes(input.status)) {
    await assertNoConflict({
      barberId: input.barber_id,
      date: input.date,
      startTime: input.start_time,
      durationMinutes: input.duration_minutes,
    });
  }

  const clientId =
    input.client_id || (await ensureClient(input.client_name, input.client_whatsapp));

  const { data, error } = await db()
    .from('appointments')
    .insert(buildInsert(input, clientId))
    .select('*')
    .single();
  if (error) throw translateConflict(error);
  return mapAppointment(data);
}

export async function updateAppointment(
  id: string,
  input: Partial<AppointmentInput>
): Promise<void> {
  const current = await getAppointmentById(id);
  if (!current) return;

  const next = { ...current, ...input };
  if (BUSY_STATUSES.includes(next.status)) {
    await assertNoConflict({
      barberId: next.barber_id,
      date: next.date,
      startTime: next.start_time,
      durationMinutes: next.duration_minutes,
      ignoreId: id,
    });
  }

  const { error } = await db().from('appointments').update(input).eq('id', id);
  if (error) throw translateConflict(error);
}

export async function deleteAppointment(id: string): Promise<void> {
  const { error } = await db().from('appointments').delete().eq('id', id);
  if (error) throw toError(error, 'Falha ao remover o agendamento.');
}

// ---------------------------------------------------------------------
// Recorrência
// ---------------------------------------------------------------------
export async function createRecurringAppointments(
  base: AppointmentInput,
  config: RecurrenceConfig,
  slots: RecurringSlot[]
): Promise<Appointment[]> {
  if (!slots.length) return [];

  const clientId =
    base.client_id || (await ensureClient(base.client_name, base.client_whatsapp));

  // 1) Cria o grupo da série.
  const { data: group, error: groupError } = await db()
    .from('recurring_groups')
    .insert({
      client_id: clientId,
      service_id: base.service_id,
      barber_id: base.barber_id,
      frequency: config.frequency,
      interval_weeks: config.intervalWeeks,
      selected_weekdays: config.selectedWeekdays.map(String),
      start_date: slots[0].date,
      end_date: config.endMode === 'date' ? config.endDate : null,
      occurrences_count:
        config.endMode === 'count' ? config.occurrencesCount : slots.length,
    })
    .select('*')
    .single();
  if (groupError) throw toError(groupError, 'Falha ao criar a série recorrente.');

  const typedGroup = group as RecurringGroup;

  // 2) Cria os agendamentos da série.
  const rows = slots.map((slot) => ({
    ...buildInsert(
      {
        ...base,
        date: slot.date,
        start_time: slot.time,
        end_time: addMinutes(slot.time, base.duration_minutes),
      },
      clientId
    ),
    recurring_group_id: typedGroup.id,
    is_recurring: true,
  }));

  const { data, error } = await db().from('appointments').insert(rows).select('*');
  if (error) throw translateConflict(error);
  return (data ?? []).map(mapAppointment);
}

export async function updateAppointmentSeries(
  groupId: string,
  patch: Partial<AppointmentInput>
): Promise<void> {
  // Data/horário são próprios de cada ocorrência: não se aplicam à série.
  const shared = { ...patch };
  delete shared.date;
  delete shared.start_time;
  delete shared.end_time;

  const { error } = await db()
    .from('appointments')
    .update(shared)
    .eq('recurring_group_id', groupId);
  if (error) throw translateConflict(error);
}

export async function deleteAppointmentSeries(groupId: string): Promise<void> {
  const { error: apptError } = await db()
    .from('appointments')
    .delete()
    .eq('recurring_group_id', groupId);
  if (apptError) throw toError(apptError, 'Falha ao remover a série.');

  const { error: groupError } = await db()
    .from('recurring_groups')
    .delete()
    .eq('id', groupId);
  if (groupError) throw toError(groupError, 'Falha ao remover a série.');
}
