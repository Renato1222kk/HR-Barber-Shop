// Tipos centrais do dominio - HR Barber Shop
//
// Sao os tipos usados pela interface. O formato das tabelas do banco fica
// em `src/types/database.ts`; os services fazem a ponte entre os dois.

export type AppointmentStatus =
  | 'agendado'
  | 'confirmado'
  | 'em_atendimento'
  | 'concluido'
  | 'cancelado';

export type PaymentMethod = 'dinheiro' | 'pix' | 'debito' | 'credito' | 'outro';

export interface Client {
  id: string;
  name: string;
  whatsapp: string;
  email: string | null;
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
  payment_method: PaymentMethod | null;
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

/**
 * O aplicativo tem um unico tema oficial (claro). `dark` e `gold` continuam
 * no tipo apenas para nao quebrar linhas antigas gravadas no Supabase.
 */
export type AppTheme = 'light' | 'dark' | 'gold';

export interface Settings {
  business_name: string;
  owner_name: string;
  whatsapp: string;
  address: string;
  interval_minutes: number;
  theme: AppTheme;
}

// ===================== FINANCEIRO =====================
/**
 * Lancamento manual de caixa. O faturamento dos atendimentos continua
 * saindo dos agendamentos concluidos; esta tabela cobre o que nao passa
 * pela agenda (venda de produtos, aluguel, insumos...).
 */
export type FinancialEntryType = 'income' | 'expense';

export interface FinancialEntry {
  id: string;
  appointment_id: string | null;
  type: FinancialEntryType;
  category: string;
  description: string;
  amount: number;
  payment_method: PaymentMethod | null;
  occurred_at: string; // YYYY-MM-DD
  created_at: string;
}

export type FinancialEntryInput = Omit<FinancialEntry, 'id' | 'created_at'>;

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
