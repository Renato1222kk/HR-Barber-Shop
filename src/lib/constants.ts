import type { AppointmentStatus } from '@/types';

export const BRAND = {
  name: 'HR Barber Shop',
  short: 'HR Barber',
  initials: 'HR',
  tagline: 'Barber Shop',
  description: 'Sistema de gestão e agendamentos da HR Barber Shop.',
  /** Arte oficial da marca (fica em public/, não no Storage do Supabase). */
  logo: '/hr-barber-shop-logo.jpeg',
} as const;

/** Fuso usado em toda a agenda — a barbearia opera em um único horário. */
export const TIMEZONE = 'America/Sao_Paulo';

/** Rota principal do app: é para onde vai quem acabou de entrar. */
export const HOME_ROUTE = '/agenda';

export const STATUS_META: Record<
  AppointmentStatus,
  { label: string; color: string; dot: string; badge: string; bar: string }
> = {
  // Badges leves: fundo pastel, texto escuro e borda suave — legíveis no branco.
  agendado: {
    label: 'Agendado',
    color: '#2563eb',
    dot: 'bg-blue-500',
    badge: 'bg-blue-50 text-blue-700 border-blue-200',
    bar: 'border-l-blue-500',
  },
  confirmado: {
    label: 'Confirmado',
    color: '#16a34a',
    dot: 'bg-green-500',
    badge: 'bg-green-50 text-green-700 border-green-200',
    bar: 'border-l-green-500',
  },
  em_atendimento: {
    label: 'Em atendimento',
    color: '#9333ea',
    dot: 'bg-purple-500',
    badge: 'bg-purple-50 text-purple-700 border-purple-200',
    bar: 'border-l-purple-500',
  },
  concluido: {
    label: 'Concluído',
    color: '#c59b3d',
    dot: 'bg-gold',
    badge: 'bg-gold-50 text-gold-700 border-gold-200',
    bar: 'border-l-gold',
  },
  cancelado: {
    label: 'Cancelado',
    color: '#6b7280',
    dot: 'bg-ink-400',
    badge: 'bg-ink-100 text-ink-600 border-ink-200',
    bar: 'border-l-ink-400',
  },
};

export const STATUS_ORDER: AppointmentStatus[] = [
  'agendado',
  'confirmado',
  'em_atendimento',
  'concluido',
  'cancelado',
];

// Status que ocupam a agenda do barbeiro (usados na deteccao de conflito).
export const BUSY_STATUSES: AppointmentStatus[] = [
  'agendado',
  'confirmado',
  'em_atendimento',
  'concluido',
];

export const WEEKDAYS = [
  'Domingo',
  'Segunda',
  'Terça',
  'Quarta',
  'Quinta',
  'Sexta',
  'Sábado',
];

export const WEEKDAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
