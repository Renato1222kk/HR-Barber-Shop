'use client';

// Service de HORÁRIOS DE FUNCIONAMENTO (7 linhas por usuário, uma por dia).
import type { WorkingHour } from '@/types';
import { db, toError } from './_shared';
import { mapWorkingHour } from './mappers';

const DEFAULT_HOURS: Omit<WorkingHour, 'id'>[] = [
  { weekday: 0, is_open: false, start_time: '09:00', end_time: '19:00', break_start: null, break_end: null },
  { weekday: 1, is_open: true, start_time: '09:00', end_time: '19:00', break_start: '12:00', break_end: '13:00' },
  { weekday: 2, is_open: true, start_time: '09:00', end_time: '19:00', break_start: '12:00', break_end: '13:00' },
  { weekday: 3, is_open: true, start_time: '09:00', end_time: '19:00', break_start: '12:00', break_end: '13:00' },
  { weekday: 4, is_open: true, start_time: '09:00', end_time: '20:00', break_start: '12:00', break_end: '13:00' },
  { weekday: 5, is_open: true, start_time: '09:00', end_time: '20:00', break_start: '12:00', break_end: '13:00' },
  { weekday: 6, is_open: true, start_time: '08:00', end_time: '17:00', break_start: null, break_end: null },
];

export async function listWorkingHours(): Promise<WorkingHour[]> {
  const { data, error } = await db().from('working_hours').select('*').order('weekday');
  if (error) throw toError(error, 'Falha ao carregar os horários.');

  if (!data || data.length === 0) {
    // Primeira vez: cria a grade padrão para este usuário.
    const { data: created, error: seedError } = await db()
      .from('working_hours')
      .insert(DEFAULT_HOURS.map((h) => ({ ...h })))
      .select('*');
    if (seedError) throw toError(seedError, 'Falha ao inicializar os horários.');
    return (created ?? []).map(mapWorkingHour).sort((a, b) => a.weekday - b.weekday);
  }

  return data.map(mapWorkingHour);
}

export async function updateWorkingHour(
  weekday: number,
  input: Partial<WorkingHour>
): Promise<void> {
  const patch = {
    is_open: input.is_open,
    start_time: input.start_time,
    end_time: input.end_time,
    break_start: input.break_start,
    break_end: input.break_end,
  };
  const { error } = await db().from('working_hours').update(patch).eq('weekday', weekday);
  if (error) throw toError(error, 'Falha ao salvar os horários.');
}
