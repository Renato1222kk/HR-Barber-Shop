// Regra pura de conflito de horário do barbeiro (sem acesso a dados).
// Usada tanto pelo service (pré-checagem) quanto pela UI.
import type { Appointment } from '@/types';
import { BUSY_STATUSES } from '@/lib/constants';
import { addMinutes, timeToMinutes } from '@/lib/utils/format';

export const BARBER_CONFLICT_MESSAGE =
  'Este barbeiro já possui um atendimento nesse horário.';

export interface ConflictQuery {
  barberId: string | null;
  date: string;
  startTime: string;
  durationMinutes: number;
  ignoreId?: string;
  ignoreGroupId?: string;
}

/** Verifica se o barbeiro já tem um atendimento que se sobrepõe ao intervalo. */
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
      const otherEnd = timeToMinutes(a.end_time || addMinutes(a.start_time, a.duration_minutes));
      return start < otherEnd && otherStart < end;
    }) ?? null
  );
}
