// Formatadores de moeda, data e hora (pt-BR).

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

// Recebe "YYYY-MM-DD" e devolve Date local (evita shift de fuso).
export function parseDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
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

// Soma minutos a "HH:mm" -> "HH:mm"
export function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + minutes;
  const hh = Math.floor((total % 1440) / 60);
  const mm = total % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}
