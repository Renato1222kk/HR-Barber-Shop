// =====================================================================
// Geracao de evento de calendario (.ics) sem dependencia externa.
//
// A barbearia opera em America/Sao_Paulo (offset fixo -03, sem horario de
// verao). Para maxima compatibilidade, o evento e gravado como horario
// local com o fuso declarado — o app de calendario mostra exatamente o
// horario de parede escolhido, sem deslocar o dia.
// =====================================================================

import { TIMEZONE } from '@/lib/constants';

interface CalendarEvent {
  title: string;
  description?: string;
  location?: string;
  date: string; // YYYY-MM-DD
  start: string; // HH:mm
  end: string; // HH:mm
}

/** "2026-09-25" + "15:00" -> "20260925T150000". */
function toLocalStamp(date: string, time: string): string {
  const d = date.replace(/-/g, '');
  const t = `${time.replace(/:/g, '')}00`;
  return `${d}T${t}`;
}

/** Escapa os caracteres reservados do formato iCalendar. */
function escapeICS(value: string): string {
  return value.replace(/[\\;,]/g, (m) => `\\${m}`).replace(/\n/g, '\\n');
}

/** Monta o conteudo de um arquivo .ics para um unico evento. */
export function buildICS(event: CalendarEvent): string {
  const uid = `${toLocalStamp(event.date, event.start)}-${Math.abs(
    hashString(event.title + event.date + event.start)
  )}@hr-barber-shop`;

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//HR Barber Shop//Agendamento//PT-BR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTART;TZID=${TIMEZONE}:${toLocalStamp(event.date, event.start)}`,
    `DTEND;TZID=${TIMEZONE}:${toLocalStamp(event.date, event.end)}`,
    `SUMMARY:${escapeICS(event.title)}`,
    event.description ? `DESCRIPTION:${escapeICS(event.description)}` : '',
    event.location ? `LOCATION:${escapeICS(event.location)}` : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean);

  return lines.join('\r\n');
}

/** Dispara o download de um .ics no navegador. */
export function downloadICS(event: CalendarEvent, filename = 'agendamento.ics'): void {
  const blob = new Blob([buildICS(event)], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}
