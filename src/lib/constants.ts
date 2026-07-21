import type { AppointmentStatus } from '@/types';

export const BRAND = {
  name: 'HR Barber Shop',
  short: 'HR Barber',
  initials: 'HR',
  tagline: 'Barber Shop',
  description: 'Gestão de agendamentos, clientes e financeiro da HR Barber Shop.',
} as const;

export const STATUS_META: Record<
  AppointmentStatus,
  { label: string; color: string; dot: string; badge: string; bar: string }
> = {
  agendado: {
    label: 'Agendado',
    color: '#3b82f6',
    dot: 'bg-blue-500',
    badge: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    bar: 'border-l-blue-500',
  },
  confirmado: {
    label: 'Confirmado',
    color: '#22c55e',
    dot: 'bg-green-500',
    badge: 'bg-green-500/15 text-green-400 border-green-500/30',
    bar: 'border-l-green-500',
  },
  em_atendimento: {
    label: 'Em atendimento',
    color: '#a855f7',
    dot: 'bg-purple-500',
    badge: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    bar: 'border-l-purple-500',
  },
  concluido: {
    label: 'Concluído',
    color: '#c9a24b',
    dot: 'bg-gold',
    badge: 'bg-gold/15 text-gold border-gold/30',
    bar: 'border-l-gold',
  },
  cancelado: {
    label: 'Cancelado',
    color: '#6b7280',
    dot: 'bg-gray-500',
    badge: 'bg-gray-500/15 text-gray-400 border-gray-500/30',
    bar: 'border-l-gray-500',
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
