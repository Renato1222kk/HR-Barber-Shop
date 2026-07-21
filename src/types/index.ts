// Tipos centrais do dominio - HR Barber Shop

export type AppointmentStatus =
  | 'agendado'
  | 'confirmado'
  | 'em_atendimento'
  | 'concluido'
  | 'cancelado';

export interface Client {
  id: string;
  name: string;
  whatsapp: string;
  birth_date: string | null;
  notes: string | null;
  created_at: string;
}

export interface Barber {
  id: string;
  name: string;
  phone: string;
  specialty: string;
  active: boolean;
  work_start: string; // HH:mm
  work_end: string; // HH:mm
  created_at: string;
}

export interface Service {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: number;
  active: boolean;
  created_at: string;
}

export interface Appointment {
  id: string;
  client_id: string | null;
  service_id: string | null;
  barber_id: string | null;
  client_name: string;
  client_whatsapp: string;
  service_name: string;
  barber_name: string;
  date: string; // YYYY-MM-DD
  start_time: string; // HH:mm
  end_time: string; // HH:mm
  duration_minutes: number;
  price: number;
  status: AppointmentStatus;
  notes: string | null;
  created_at: string;
  // Recorrencia (opcionais p/ manter compatibilidade com agendamento unico)
  recurring_group_id?: string | null;
  is_recurring?: boolean;
}

// ===================== RECORRENCIA =====================
export type RecurrenceFrequency = 'weekly' | 'biweekly' | 'monthly' | 'custom';
export type RecurrenceEndMode = 'date' | 'count';

export interface RecurrenceConfig {
  frequency: RecurrenceFrequency;
  intervalWeeks: number; // usado quando frequency = 'custom'
  selectedWeekdays: number[]; // 0 = domingo ... 6 = sabado (getDay)
  endMode: RecurrenceEndMode;
  endDate: string | null; // YYYY-MM-DD
  occurrencesCount: number | null;
}

export interface RecurringSlot {
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
}

export interface RecurringGroup {
  id: string;
  client_id: string | null;
  service_id: string | null;
  barber_id: string | null;
  frequency: string;
  interval_weeks: number;
  selected_weekdays: string[];
  start_date: string;
  end_date: string | null;
  occurrences_count: number | null;
  created_at: string;
}

export type EditScope = 'one' | 'series';

export interface WorkingHour {
  id: string;
  weekday: number; // 0 = domingo ... 6 = sabado
  is_open: boolean;
  start_time: string;
  end_time: string;
  break_start: string | null;
  break_end: string | null;
}

export interface Settings {
  business_name: string;
  owner_name: string;
  whatsapp: string;
  interval_minutes: number;
  theme: 'dark' | 'gold';
}

// Cliente enriquecido para listagens
export interface ClientWithStats extends Client {
  appointments_count: number;
  total_spent: number;
  last_visit: string | null;
  top_service: string | null;
}

// Payloads de criacao/edicao
export type ClientInput = Omit<Client, 'id' | 'created_at'>;
export type ServiceInput = Omit<Service, 'id' | 'created_at'>;
export type BarberInput = Omit<Barber, 'id' | 'created_at'>;
export type AppointmentInput = Omit<Appointment, 'id' | 'created_at'>;
