'use client';

import type {
  Appointment,
  AppointmentInput,
  RecurrenceConfig,
  RecurringGroup,
  RecurringSlot,
} from '@/types';
import type { Tables, TablesInsert } from '@/types/database';
import { BUSY_STATUSES } from '@/lib/constants';
import {
  addMinutesToTime,
  computeEndTime,
  databaseDateToCalendar,
  formatTimeForDatabase,
  isValidISODate,
  timeToMinutes,
} from '@/lib/utils/date';
import {
  BARBER_CONFLICT_MESSAGE,
  db,
  fetchAllPages,
  requireOwnerId,
  run,
  toHHmm,
  toNumber,
} from './base';
import { ensureClient } from './client-service';

export { BARBER_CONFLICT_MESSAGE };

// Precisa ser um literal unico: o Supabase deriva o tipo do retorno a
// partir do texto do select, e uma string concatenada perderia essa
// informacao.
const COLUMNS =
  'id, client_id, service_id, barber_id, recurring_group_id, client_name, client_whatsapp, service_name, barber_name, date, start_time, end_time, duration_minutes, price, status, payment_method, notes, is_recurring, created_at';

type Row = Omit<Tables<'appointments'>, 'owner_id' | 'updated_at' | 'starts_at' | 'ends_at'>;

function toAppointment(row: Row): Appointment {
  return {
    id: row.id,
    client_id: row.client_id,
    service_id: row.service_id,
    barber_id: row.barber_id,
    client_name: row.client_name,
    client_whatsapp: row.client_whatsapp ?? '',
    service_name: row.service_name ?? '',
    barber_name: row.barber_name ?? '',
    // A coluna e do tipo `date`: o PostgREST devolve "YYYY-MM-DD" pronto.
    // A normalizacao so garante que nada alem disso chegue ao calendario.
    date: databaseDateToCalendar(row.date) ?? row.date,
    start_time: toHHmm(row.start_time),
    end_time: toHHmm(row.end_time),
    duration_minutes: row.duration_minutes,
    price: toNumber(row.price),
    status: row.status,
    payment_method: row.payment_method,
    notes: row.notes,
    created_at: row.created_at,
    recurring_group_id: row.recurring_group_id,
    is_recurring: row.is_recurring,
  };
}

export const INVALID_DATE_MESSAGE =
  'Escolha uma data válida para o agendamento.';
export const INVALID_TIME_MESSAGE =
  'Escolha um horário válido para o agendamento.';

function toRowPayload(input: AppointmentInput) {
  // Ultima barreira antes do Supabase. A data escolhida pelo usuario e
  // gravada exatamente como veio — sem conversao para UTC e sem cair para
  // hoje. Uma data invalida vira erro, nunca um agendamento no dia errado.
  if (!isValidISODate(input.date)) throw new Error(INVALID_DATE_MESSAGE);

  const startTime = formatTimeForDatabase(input.start_time);
  if (!startTime) throw new Error(INVALID_TIME_MESSAGE);

  // O banco exige duracao positiva e preco nao negativo. Ajustar aqui evita
  // que um campo digitado em branco vire um erro tecnico de constraint.
  const duration = Math.max(1, Math.round(input.duration_minutes) || 1);
  const price = Math.max(0, Number(input.price) || 0);

  return {
    client_id: input.client_id,
    service_id: input.service_id,
    barber_id: input.barber_id,
    client_name: input.client_name.trim(),
    client_whatsapp: input.client_whatsapp ?? '',
    service_name: input.service_name ?? '',
    barber_name: input.barber_name ?? '',
    date: input.date,
    start_time: startTime,
    end_time: computeEndTime(startTime, duration),
    duration_minutes: duration,
    price,
    status: input.status,
    payment_method: input.payment_method,
    notes: input.notes,
  };
}

// ===================== LEITURA =====================
export async function listAppointments(range?: {
  from?: string;
  to?: string;
}): Promise<Appointment[]> {
  return run('Erro ao carregar os agendamentos.', async () => {
    const rows = await fetchAllPages<Row>((from, to) => {
      let query = db().from('appointments').select(COLUMNS);
      if (range?.from) query = query.gte('date', range.from);
      if (range?.to) query = query.lte('date', range.to);
      return query
        .order('date', { ascending: true })
        .order('start_time', { ascending: true })
        .range(from, to);
    });
    return rows.map(toAppointment);
  });
}

export async function getAppointmentById(id: string): Promise<Appointment | null> {
  return run('Erro ao carregar o agendamento.', async () => {
    const { data, error } = await db()
      .from('appointments')
      .select(COLUMNS)
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data ? toAppointment(data) : null;
  });
}

// ===================== CONFLITO DE HORARIO =====================
interface ConflictQuery {
  barberId: string | null;
  date: string;
  startTime: string;
  durationMinutes: number;
  ignoreId?: string;
  ignoreGroupId?: string;
}

/**
 * Procura, em uma lista ja carregada, um atendimento do mesmo barbeiro
 * que se sobreponha ao intervalo informado. Usado pelas telas para avisar
 * antes de gravar — a garantia definitiva e a constraint do banco.
 */
export function findBarberConflict(
  appointments: Appointment[],
  { barberId, date, startTime, durationMinutes, ignoreId, ignoreGroupId }: ConflictQuery
): Appointment | null {
  if (!barberId) return null;
  const start = timeToMinutes(startTime);
  const end = start + Math.max(1, durationMinutes);

  return (
    appointments.find((a) => {
      if (a.barber_id !== barberId) return false;
      if (a.date !== date) return false;
      if (a.id === ignoreId) return false;
      if (ignoreGroupId && a.recurring_group_id === ignoreGroupId) return false;
      if (!BUSY_STATUSES.includes(a.status)) return false;
      const otherStart = timeToMinutes(a.start_time);
      const otherEnd = timeToMinutes(
        a.end_time || addMinutesToTime(a.start_time, a.duration_minutes)
      );
      return start < otherEnd && otherStart < end;
    }) ?? null
  );
}

/**
 * Consulta o dia do barbeiro no Supabase e recusa a gravacao se houver
 * sobreposicao. E uma checagem antecipada, por uma mensagem melhor: a
 * constraint `appointments_no_barber_overlap` continua sendo o que
 * impede duas gravacoes simultaneas de passarem.
 */
async function assertNoConflict(query: ConflictQuery): Promise<void> {
  if (!query.barberId) return;

  const { data, error } = await db()
    .from('appointments')
    .select(COLUMNS)
    .eq('barber_id', query.barberId)
    .eq('date', query.date)
    .neq('status', 'cancelado');
  if (error) throw error;

  const clash = findBarberConflict((data ?? []).map(toAppointment), query);
  if (clash) throw new Error(BARBER_CONFLICT_MESSAGE);
}

// ===================== ESCRITA =====================
export async function createAppointment(input: AppointmentInput): Promise<Appointment> {
  return run('Erro ao salvar o agendamento.', async () => {
    const owner_id = await requireOwnerId();

    if (BUSY_STATUSES.includes(input.status)) {
      await assertNoConflict({
        barberId: input.barber_id,
        date: input.date,
        startTime: input.start_time,
        durationMinutes: input.duration_minutes,
      });
    }

    // Agendar por nome tambem cadastra o cliente.
    const client_id =
      input.client_id || (await ensureClient(input.client_name, input.client_whatsapp));

    const { data, error } = await db()
      .from('appointments')
      .insert({ ...toRowPayload(input), owner_id, client_id })
      .select(COLUMNS)
      .single();
    if (error) throw error;
    return toAppointment(data);
  });
}

export async function updateAppointment(
  id: string,
  input: Partial<AppointmentInput>
): Promise<void> {
  return run('Erro ao atualizar o agendamento.', async () => {
    const current = await getAppointmentById(id);
    if (!current) throw new Error('Agendamento não encontrado.');

    const next: Appointment = { ...current, ...input };
    if (BUSY_STATUSES.includes(next.status)) {
      await assertNoConflict({
        barberId: next.barber_id,
        date: next.date,
        startTime: next.start_time,
        durationMinutes: next.duration_minutes,
        ignoreId: id,
      });
    }

    const { id: _id, created_at: _createdAt, ...rest } = next;
    const { error } = await db()
      .from('appointments')
      .update(toRowPayload(rest))
      .eq('id', id);
    if (error) throw error;
  });
}

/**
 * Move ou redimensiona um atendimento — o que o arraste e a alca de
 * redimensionamento do calendario fazem.
 *
 * Grava SOMENTE data, horarios e duracao. Cliente, WhatsApp, servico,
 * preco, status, barbeiro, owner_id e observacoes ficam intocados, porque
 * nem sequer entram no UPDATE.
 */
export async function rescheduleAppointment(
  id: string,
  next: { date: string; start_time: string; duration_minutes: number }
): Promise<void> {
  return run('Erro ao mover o agendamento.', async () => {
    if (!isValidISODate(next.date)) throw new Error(INVALID_DATE_MESSAGE);
    const startTime = formatTimeForDatabase(next.start_time);
    if (!startTime) throw new Error(INVALID_TIME_MESSAGE);

    const duration = Math.max(1, Math.round(next.duration_minutes) || 1);
    const endTime = computeEndTime(startTime, duration);
    if (timeToMinutes(endTime) <= timeToMinutes(startTime)) {
      throw new Error('O término precisa ser depois do início.');
    }

    const current = await getAppointmentById(id);
    if (!current) throw new Error('Agendamento não encontrado.');

    // Um cancelado nao ocupa a agenda, entao tambem nao precisa competir
    // por horario. `ignoreId` impede que ele conflite consigo mesmo.
    if (BUSY_STATUSES.includes(current.status)) {
      await assertNoConflict({
        barberId: current.barber_id,
        date: next.date,
        startTime,
        durationMinutes: duration,
        ignoreId: id,
      });
    }

    const { error } = await db()
      .from('appointments')
      .update({
        date: next.date,
        start_time: startTime,
        end_time: endTime,
        duration_minutes: duration,
      })
      .eq('id', id);
    if (error) throw error;
  });
}

export async function removeAppointment(id: string): Promise<void> {
  return run('Erro ao excluir o agendamento.', async () => {
    const { error } = await db().from('appointments').delete().eq('id', id);
    if (error) throw error;
  });
}

// ===================== SERIES RECORRENTES =====================
export async function createRecurringAppointments(
  base: AppointmentInput,
  config: RecurrenceConfig,
  slots: RecurringSlot[]
): Promise<Appointment[]> {
  if (!slots.length) return [];

  return run('Erro ao criar os agendamentos recorrentes.', async () => {
    const owner_id = await requireOwnerId();
    const client_id =
      base.client_id || (await ensureClient(base.client_name, base.client_whatsapp));

    const { data: group, error: groupError } = await db()
      .from('recurring_groups')
      .insert({
        owner_id,
        client_id,
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
      .select('id')
      .single();
    if (groupError) throw groupError;

    const payload: TablesInsert<'appointments'>[] = slots.map((slot) => ({
      ...toRowPayload({ ...base, date: slot.date, start_time: slot.time }),
      owner_id,
      client_id,
      recurring_group_id: group.id,
      is_recurring: true,
    }));

    // Um unico INSERT: ou entra a serie inteira, ou nada entra.
    const { data, error } = await db().from('appointments').insert(payload).select(COLUMNS);
    if (error) {
      // Sem os agendamentos, o grupo nao serve para nada.
      await db().from('recurring_groups').delete().eq('id', group.id);
      throw error;
    }
    return (data ?? []).map(toAppointment);
  });
}

/**
 * Aplica um patch a toda a serie. Data e horario ficam de fora: sao
 * proprios de cada ocorrencia.
 */
export async function updateAppointmentSeries(
  groupId: string,
  patch: Partial<AppointmentInput>
): Promise<void> {
  return run('Erro ao atualizar a série.', async () => {
    const shared = {
      ...(patch.client_id !== undefined ? { client_id: patch.client_id } : {}),
      ...(patch.service_id !== undefined ? { service_id: patch.service_id } : {}),
      ...(patch.barber_id !== undefined ? { barber_id: patch.barber_id } : {}),
      ...(patch.client_name !== undefined ? { client_name: patch.client_name.trim() } : {}),
      ...(patch.client_whatsapp !== undefined
        ? { client_whatsapp: patch.client_whatsapp }
        : {}),
      ...(patch.service_name !== undefined ? { service_name: patch.service_name } : {}),
      ...(patch.barber_name !== undefined ? { barber_name: patch.barber_name } : {}),
      ...(patch.price !== undefined ? { price: patch.price } : {}),
      ...(patch.status !== undefined ? { status: patch.status } : {}),
      ...(patch.payment_method !== undefined ? { payment_method: patch.payment_method } : {}),
      ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
    };
    if (Object.keys(shared).length === 0) return;

    const { error } = await db()
      .from('appointments')
      .update(shared)
      .eq('recurring_group_id', groupId);
    if (error) throw error;
  });
}

export async function removeAppointmentSeries(groupId: string): Promise<void> {
  return run('Erro ao excluir a série.', async () => {
    const { error } = await db()
      .from('appointments')
      .delete()
      .eq('recurring_group_id', groupId);
    if (error) throw error;

    const { error: groupError } = await db()
      .from('recurring_groups')
      .delete()
      .eq('id', groupId);
    if (groupError) throw groupError;
  });
}

export async function listRecurringGroups(): Promise<RecurringGroup[]> {
  return run('Erro ao carregar as séries recorrentes.', async () => {
    const { data, error } = await db()
      .from('recurring_groups')
      .select(
        'id, client_id, service_id, barber_id, frequency, interval_weeks, selected_weekdays, start_date, end_date, occurrences_count, created_at'
      )
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  });
}
