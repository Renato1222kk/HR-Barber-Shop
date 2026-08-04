// =====================================================================
// Datas da agenda — ponto unico de verdade.
//
// A tabela `appointments` guarda data e horario SEPARADOS:
//   date       -> coluna `date`  ("YYYY-MM-DD")
//   start_time -> coluna `time`  ("HH:mm")
//   end_time   -> coluna `time`  ("HH:mm")
//
// Sao horarios de parede: a barbearia opera sempre em America/Sao_Paulo.
// Por isso uma data escolhida pelo usuario NUNCA passa por UTC. O padrao
// `new Date(iso).toISOString().split('T')[0]` esta proibido aqui — ele
// desloca o dia em qualquer fuso negativo (America/Sao_Paulo e -03), o que
// faz "2026-08-15" virar "2026-08-14" ao salvar.
//
// Regra pratica: string YYYY-MM-DD entra e sai inalterada; `Date` so
// aparece quando o calendario precisa posicionar um card na tela.
// =====================================================================

import { TIMEZONE } from '@/lib/constants';

/** Data pura no formato do banco: "YYYY-MM-DD". */
export type ISODate = string;

/** Horario de parede no formato da interface: "HH:mm". */
export type HHmm = string;

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const MINUTES_IN_DAY = 24 * 60;

// ---------------------------------------------------------------------
// Validacao
// ---------------------------------------------------------------------

/**
 * Confere o formato E a existencia da data. Rejeita "2026-02-31" e
 * "2026-13-01", que passariam por uma checagem apenas de regex.
 */
export function isValidISODate(value: unknown): value is ISODate {
  if (typeof value !== 'string' || !ISO_DATE_RE.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  if (m < 1 || m > 12 || d < 1) return false;
  // Dia 0 do mes seguinte = ultimo dia deste mes.
  return d <= new Date(y, m, 0).getDate();
}

export function isValidTime(value: unknown): value is HHmm {
  return typeof value === 'string' && TIME_RE.test(value);
}

// ---------------------------------------------------------------------
// Date local <-> string
// ---------------------------------------------------------------------

/**
 * `Date` (interpretado no fuso local do navegador) -> "YYYY-MM-DD".
 *
 * Le os componentes locais, nunca os UTC. E o inverso exato de
 * `parseLocalDate`, entao `formatLocalDate(parseLocalDate(x)) === x`.
 */
export function formatLocalDate(date: Date): ISODate {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * "YYYY-MM-DD" -> `Date` a meia-noite LOCAL.
 *
 * `new Date("2026-08-15")` seria interpretado como UTC pelo ECMAScript e
 * viraria 14/08 21:00 no Brasil. Montar pelos componentes evita isso.
 */
export function parseLocalDate(iso: ISODate): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 0, 0, 0, 0);
}

// ---------------------------------------------------------------------
// "Hoje" estavel entre servidor e navegador
// ---------------------------------------------------------------------

/**
 * Hoje em America/Sao_Paulo, independente do fuso da maquina.
 *
 * O componente da agenda e renderizado tambem no servidor (Next.js), que
 * normalmente roda em UTC. Usar `new Date()` direto faria o HTML do
 * servidor e o do navegador discordarem entre 21h e 24h — erro de
 * hidratacao e dia de "hoje" destacado errado. O locale `en-CA` produz
 * exatamente YYYY-MM-DD.
 */
export function todayISO(now: Date = new Date()): ISODate {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** Horario de parede atual da barbearia ("HH:mm"), estavel entre servidor e cliente. */
export function nowTimeInShopTZ(now: Date = new Date()): HHmm {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(now);
}

// ---------------------------------------------------------------------
// Formulario <-> banco
// ---------------------------------------------------------------------

/**
 * Valor cru de um `<input type="date">` -> data pronta para o Supabase.
 *
 * Devolve `null` quando o campo esta vazio ou invalido. Quem chama decide
 * o que fazer — o que NAO pode acontecer e trocar por hoje em silencio,
 * gravando o atendimento no dia errado.
 */
export function dateInputToDatabase(value: string | null | undefined): ISODate | null {
  if (!value) return null;
  const trimmed = value.trim();
  return isValidISODate(trimmed) ? trimmed : null;
}

/**
 * Data vinda do Supabase -> data usada pelo calendario.
 *
 * A coluna e do tipo `date`, entao o PostgREST ja devolve "YYYY-MM-DD".
 * Se algum dia vier um timestamp completo, corta no "T" em vez de
 * converter para `Date` (converter deslocaria o dia).
 */
export function databaseDateToCalendar(value: string | null | undefined): ISODate | null {
  if (!value) return null;
  const iso = value.slice(0, 10);
  return isValidISODate(iso) ? iso : null;
}

/** Normaliza o horario para "HH:mm" ("09:00:00" e "9:5" viram "09:00" e "09:05"). */
export function formatTimeForDatabase(value: string | null | undefined): HHmm | null {
  if (!value) return null;
  const [rawH, rawM] = value.trim().split(':');
  const h = Number(rawH);
  const m = Number(rawM ?? 0);
  if (!Number.isInteger(h) || !Number.isInteger(m)) return null;
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * (data, horario) -> `Date` local, para o FullCalendar posicionar o card.
 *
 * O calendario trabalha com objetos `Date` do navegador; como a barbearia
 * so tem um fuso, o horario de parede e o horario local da tela.
 */
export function combineDateAndTime(date: ISODate, time: HHmm): Date {
  const base = parseLocalDate(date);
  const [h, m] = time.split(':').map(Number);
  base.setHours(h || 0, m || 0, 0, 0);
  return base;
}

/** Inverso de `combineDateAndTime`: `Date` -> { date, time }. */
export function splitDateAndTime(value: Date): { date: ISODate; time: HHmm } {
  return {
    date: formatLocalDate(value),
    time: `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`,
  };
}

// ---------------------------------------------------------------------
// Aritmetica de horario
// ---------------------------------------------------------------------

export function timeToMinutes(time: HHmm): number {
  const [h, m] = time.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function minutesToTime(total: number): HHmm {
  const clamped = ((total % MINUTES_IN_DAY) + MINUTES_IN_DAY) % MINUTES_IN_DAY;
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Soma minutos a "HH:mm". Gira apos a meia-noite (23:50 + 20min = 00:10). */
export function addMinutesToTime(time: HHmm, minutes: number): HHmm {
  return minutesToTime(timeToMinutes(time) + Math.round(minutes));
}

/**
 * Termino a partir do inicio e da duracao, sem virar o dia.
 *
 * A agenda e sempre de um unico dia: um atendimento que passaria da
 * meia-noite para em 23:59, mantendo `end_time > start_time` (exigencia da
 * constraint `appointments_time_order`).
 */
export function computeEndTime(startTime: HHmm, durationMinutes: number): HHmm {
  const start = timeToMinutes(startTime);
  const end = start + Math.max(1, Math.round(durationMinutes) || 1);
  return end >= MINUTES_IN_DAY ? '23:59' : minutesToTime(end);
}

/** Duracao em minutos entre dois horarios do mesmo dia. */
export function durationBetween(startTime: HHmm, endTime: HHmm): number {
  return timeToMinutes(endTime) - timeToMinutes(startTime);
}

/** Soma dias a uma data ISO sem passar por UTC. */
export function addDaysISO(iso: ISODate, days: number): ISODate {
  const d = parseLocalDate(iso);
  d.setDate(d.getDate() + days);
  return formatLocalDate(d);
}

/** Arredonda "HH:mm" para o multiplo de `step` minutos mais proximo (para baixo). */
export function snapTimeToStep(time: HHmm, step: number): HHmm {
  if (step <= 1) return time;
  const total = timeToMinutes(time);
  return minutesToTime(Math.floor(total / step) * step);
}
