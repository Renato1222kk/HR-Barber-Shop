// Formatadores de moeda, data e hora (pt-BR).
//
// A manipulacao de datas mora em `./date`. Aqui ficam apenas os
// formatadores de exibicao; `parseDate`, `toISODate`, `addMinutes` e
// `timeToMinutes` sao reexportados de la para que exista uma unica
// implementacao no projeto.

import {
  addMinutesToTime,
  formatLocalDate,
  parseLocalDate,
  timeToMinutes as timeToMinutesImpl,
} from './date';

/** "YYYY-MM-DD" -> Date local (sem passar por UTC). */
export const parseDate = parseLocalDate;

/** Date local -> "YYYY-MM-DD". */
export const toISODate = formatLocalDate;

/** Soma minutos a "HH:mm" -> "HH:mm" (gira apos a meia-noite). */
export const addMinutes = addMinutesToTime;

export const timeToMinutes = timeToMinutesImpl;

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value || 0);
}

export function formatCurrencyShort(value: number): string {
  if (value >= 1000) return `R$ ${(value / 1000).toFixed(1).replace('.', ',')}k`;
  return formatCurrency(value);
}

export function formatDateLong(iso: string): string {
  return parseDate(iso).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  });
}

export function formatDateShort(iso: string): string {
  return parseDate(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

export function formatDateFull(iso: string): string {
  return parseDate(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatTime(time: string): string {
  return time?.slice(0, 5) ?? '';
}

// Diferenca em dias entre uma data ISO e hoje.
export function daysSince(iso: string, today = new Date()): number {
  const a = parseDate(iso).getTime();
  const b = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  return Math.round((b - a) / 86400000);
}

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
