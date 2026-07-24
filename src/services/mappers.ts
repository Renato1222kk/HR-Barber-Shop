// Conversão entre linhas do banco (Tables) e os tipos de domínio do app.
// Mantém o formato que a UI e os cálculos já esperam (ex.: horas "HH:mm").
import type { Tables } from '@/types/database';
import type {
  Appointment,
  AppointmentStatus,
  Barber,
  Client,
  RecurringGroup,
  Service,
  Settings,
  WorkingHour,
} from '@/types';
import { toHm, toHmOrNull, toNum } from './_shared';

export function mapClient(row: Tables<'clients'>): Client {
  return {
    id: row.id,
    name: row.name,
    whatsapp: row.whatsapp ?? '',
    birth_date: row.birth_date,
    notes: row.notes,
    created_at: row.created_at,
  };
}

export function mapBarber(row: Tables<'barbers'>): Barber {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone ?? '',
    specialty: row.specialty ?? '',
    active: row.active,
    work_start: toHm(row.work_start) || '09:00',
    work_end: toHm(row.work_end) || '19:00',
    created_at: row.created_at,
  };
}

export function mapService(row: Tables<'services'>): Service {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    duration_minutes: row.duration_minutes,
    price: toNum(row.price),
    active: row.active,
    created_at: row.created_at,
  };
}

export function mapAppointment(row: Tables<'appointments'>): Appointment {
  return {
    id: row.id,
    client_id: row.client_id,
    service_id: row.service_id,
    barber_id: row.barber_id,
    client_name: row.client_name,
    client_whatsapp: row.client_whatsapp ?? '',
    service_name: row.service_name ?? '',
    barber_name: row.barber_name ?? '',
    date: row.date,
    start_time: toHm(row.start_time),
    end_time: toHm(row.end_time),
    duration_minutes: row.duration_minutes,
    price: toNum(row.price),
    status: row.status as AppointmentStatus,
    notes: row.notes,
    created_at: row.created_at,
    recurring_group_id: row.recurring_group_id,
    is_recurring: row.is_recurring,
  };
}

export function mapRecurringGroup(row: Tables<'recurring_groups'>): RecurringGroup {
  return {
    id: row.id,
    client_id: row.client_id,
    service_id: row.service_id,
    barber_id: row.barber_id,
    frequency: row.frequency,
    interval_weeks: row.interval_weeks,
    selected_weekdays: row.selected_weekdays ?? [],
    start_date: row.start_date,
    end_date: row.end_date,
    occurrences_count: row.occurrences_count,
    created_at: row.created_at,
  };
}

export function mapSettings(row: Tables<'settings'>): Settings {
  return {
    business_name: row.business_name,
    owner_name: row.owner_name,
    whatsapp: row.whatsapp ?? '',
    interval_minutes: row.interval_minutes,
    theme: (row.theme === 'gold' ? 'gold' : 'dark') as Settings['theme'],
  };
}

export function mapWorkingHour(row: Tables<'working_hours'>): WorkingHour {
  return {
    id: row.id,
    weekday: row.weekday,
    is_open: row.is_open,
    start_time: toHm(row.start_time) || '09:00',
    end_time: toHm(row.end_time) || '19:00',
    break_start: toHmOrNull(row.break_start),
    break_end: toHmOrNull(row.break_end),
  };
}
