import type {
  Appointment,
  RecurrenceConfig,
  RecurrenceFrequency,
  RecurringSlot,
} from '@/types';
import { parseDate, toISODate, timeToMinutes } from './format';

// Limite de seguranca para nunca gerar uma lista infinita.
const SAFETY_MAX = 366;

export function resolveIntervalWeeks(
  frequency: RecurrenceFrequency,
  intervalWeeks?: number
): number {
  if (frequency === 'weekly') return 1;
  if (frequency === 'biweekly') return 2;
  if (frequency === 'custom') return Math.max(1, intervalWeeks || 1);
  return 1; // monthly e tratado separadamente
}

interface GenerateParams {
  startDate: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  frequency: RecurrenceFrequency;
  intervalWeeks?: number;
  selectedWeekdays: number[]; // 0..6 (getDay)
  endDate?: string | null;
  occurrencesCount?: number | null;
}

/**
 * Gera a lista de datas/horarios de uma recorrencia.
 * - weekly: toda semana nos dias selecionados.
 * - biweekly: a cada 2 semanas nos dias selecionados.
 * - custom: a cada N semanas (intervalWeeks) nos dias selecionados.
 * - monthly: mesmo dia do mes, todo mes (ignora dias da semana).
 * Para com base na data final (endDate, inclusiva) OU na quantidade (occurrencesCount).
 */
export function generateRecurringDates(params: GenerateParams): RecurringSlot[] {
  const { startDate, startTime, frequency, selectedWeekdays, endDate, occurrencesCount } = params;
  if (!startDate || !startTime) return [];

  const start = parseDate(startDate);
  start.setHours(0, 0, 0, 0);

  const limit = endDate ? parseDate(endDate) : null;
  if (limit) limit.setHours(0, 0, 0, 0);

  const maxCount =
    occurrencesCount && occurrencesCount > 0 ? Math.min(occurrencesCount, SAFETY_MAX) : null;

  // Precisa de pelo menos uma condicao de parada.
  if (!maxCount && !limit) return [];

  const out: RecurringSlot[] = [];

  // ---- Mensal ----
  if (frequency === 'monthly') {
    for (let i = 0; i < SAFETY_MAX; i++) {
      const d = new Date(start.getFullYear(), start.getMonth() + i, start.getDate());
      if (limit && d > limit) break;
      out.push({ date: toISODate(d), time: startTime });
      if (maxCount && out.length >= maxCount) break;
    }
    return out;
  }

  // ---- Semanal / quinzenal / personalizado ----
  const intervalWeeks = resolveIntervalWeeks(frequency, params.intervalWeeks);
  const weekdays = (selectedWeekdays.length ? [...selectedWeekdays] : [start.getDay()])
    .filter((d) => d >= 0 && d <= 6)
    .sort((a, b) => a - b);

  // Domingo da semana da data inicial (ancora).
  const weekStart = new Date(start);
  weekStart.setDate(start.getDate() - start.getDay());

  for (let w = 0; w <= SAFETY_MAX; w += intervalWeeks) {
    // Menor data possivel desta semana ativa (para decidir quando parar).
    const earliest = new Date(weekStart);
    earliest.setDate(weekStart.getDate() + w * 7 + weekdays[0]);
    if (limit && earliest > limit && earliest > start) break;

    for (const wd of weekdays) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + w * 7 + wd);
      if (d < start) continue;
      if (limit && d > limit) continue;
      out.push({ date: toISODate(d), time: startTime });
      if (maxCount && out.length >= maxCount) return out;
    }

    if (out.length >= SAFETY_MAX) break;
  }

  return out;
}

/**
 * Detecta conflitos: slots cujo intervalo [inicio, fim) se sobrepoe a um
 * atendimento ja existente do mesmo barbeiro (ignora cancelados).
 */
export function findConflicts(
  slots: RecurringSlot[],
  durationMinutes: number,
  existing: Appointment[],
  barberId: string | null
): RecurringSlot[] {
  if (!barberId) return [];
  const conflicts: RecurringSlot[] = [];
  for (const slot of slots) {
    const newStart = timeToMinutes(slot.time);
    const newEnd = newStart + durationMinutes;
    const clash = existing.some((a) => {
      if (a.barber_id !== barberId) return false;
      if (a.date !== slot.date) return false;
      if (a.status === 'cancelado') return false;
      const exStart = timeToMinutes(a.start_time);
      const exEnd = timeToMinutes(a.end_time);
      return newStart < exEnd && exStart < newEnd;
    });
    if (clash) conflicts.push(slot);
  }
  return conflicts;
}

// Resumo legivel da regra de recorrencia (para exibir no app, se desejado).
export function describeRecurrence(config: RecurrenceConfig): string {
  const freq: Record<RecurrenceFrequency, string> = {
    weekly: 'Toda semana',
    biweekly: 'A cada 2 semanas',
    monthly: 'Todo mês',
    custom: `A cada ${config.intervalWeeks} semana(s)`,
  };
  return freq[config.frequency];
}
