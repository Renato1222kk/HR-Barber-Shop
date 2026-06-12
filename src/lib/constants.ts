import type { AppointmentStatus } from '@/types';

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
  atendido: {
    label: 'Atendido',
    color: '#c9a24b',
    dot: 'bg-gold',
    badge: 'bg-gold/15 text-gold border-gold/30',
    bar: 'border-l-gold',
  },
  faltou: {
    label: 'Faltou',
    color: '#ef4444',
    dot: 'bg-red-500',
    badge: 'bg-red-500/15 text-red-400 border-red-500/30',
    bar: 'border-l-red-500',
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
  'atendido',
  'faltou',
  'cancelado',
];

export const WEEKDAYS = [
  'Domingo',
  'Segunda',
  'Terca',
  'Quarta',
  'Quinta',
  'Sexta',
  'Sabado',
];

export const WEEKDAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
