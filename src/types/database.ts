// Tipagem das tabelas do Supabase (espelha supabase/schema.sql).
//
// Escrita a mao para nao depender do CLI. Ao alterar o schema.sql,
// ajuste este arquivo — e ele que garante que os services falem com o
// banco usando os nomes e tipos corretos.

/** Tema salvo na tabela `settings` — o app usa sempre `light`. */
export type AppTheme = 'light' | 'dark' | 'gold';

export type AppointmentStatusRow =
  | 'agendado'
  | 'confirmado'
  | 'em_atendimento'
  | 'concluido'
  | 'cancelado';

export type PaymentMethodRow = 'dinheiro' | 'pix' | 'debito' | 'credito' | 'outro';

export type FinancialEntryTypeRow = 'income' | 'expense';

type Timestamps = {
  created_at: string;
  updated_at: string;
};

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Timestamps & {
          id: string;
          name: string;
          email: string | null;
          role: 'owner' | 'staff';
        };
        Insert: {
          id: string;
          name?: string;
          email?: string | null;
          role?: 'owner' | 'staff';
        };
        Update: {
          name?: string;
          email?: string | null;
          role?: 'owner' | 'staff';
        };
        Relationships: [];
      };

      barbers: {
        Row: Timestamps & {
          id: string;
          owner_id: string;
          name: string;
          phone: string;
          specialty: string;
          active: boolean;
          color: string;
          work_start: string;
          work_end: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          phone?: string;
          specialty?: string;
          active?: boolean;
          color?: string;
          work_start?: string;
          work_end?: string;
        };
        Update: {
          name?: string;
          phone?: string;
          specialty?: string;
          active?: boolean;
          color?: string;
          work_start?: string;
          work_end?: string;
        };
        Relationships: [];
      };

      services: {
        Row: Timestamps & {
          id: string;
          owner_id: string;
          name: string;
          description: string | null;
          price: number;
          duration_minutes: number;
          active: boolean;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          description?: string | null;
          price?: number;
          duration_minutes?: number;
          active?: boolean;
        };
        Update: {
          name?: string;
          description?: string | null;
          price?: number;
          duration_minutes?: number;
          active?: boolean;
        };
        Relationships: [];
      };

      clients: {
        Row: Timestamps & {
          id: string;
          owner_id: string;
          name: string;
          whatsapp: string;
          email: string | null;
          birth_date: string | null;
          notes: string | null;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          whatsapp?: string;
          email?: string | null;
          birth_date?: string | null;
          notes?: string | null;
        };
        Update: {
          name?: string;
          whatsapp?: string;
          email?: string | null;
          birth_date?: string | null;
          notes?: string | null;
        };
        Relationships: [];
      };

      recurring_groups: {
        Row: Timestamps & {
          id: string;
          owner_id: string;
          client_id: string | null;
          service_id: string | null;
          barber_id: string | null;
          frequency: string;
          interval_weeks: number;
          selected_weekdays: string[];
          start_date: string;
          end_date: string | null;
          occurrences_count: number | null;
        };
        Insert: {
          id?: string;
          owner_id: string;
          client_id?: string | null;
          service_id?: string | null;
          barber_id?: string | null;
          frequency?: string;
          interval_weeks?: number;
          selected_weekdays?: string[];
          start_date: string;
          end_date?: string | null;
          occurrences_count?: number | null;
        };
        Update: {
          frequency?: string;
          interval_weeks?: number;
          selected_weekdays?: string[];
          end_date?: string | null;
          occurrences_count?: number | null;
        };
        Relationships: [];
      };

      appointments: {
        Row: Timestamps & {
          id: string;
          owner_id: string;
          client_id: string | null;
          service_id: string | null;
          barber_id: string | null;
          recurring_group_id: string | null;
          client_name: string;
          client_whatsapp: string;
          service_name: string;
          barber_name: string;
          date: string;
          start_time: string;
          end_time: string;
          duration_minutes: number;
          price: number;
          status: AppointmentStatusRow;
          payment_method: PaymentMethodRow | null;
          notes: string | null;
          is_recurring: boolean;
          /** Coluna gerada: `date` + `start_time` no fuso da barbearia. */
          starts_at: string;
          /** Coluna gerada: `date` + `end_time` no fuso da barbearia. */
          ends_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          client_id?: string | null;
          service_id?: string | null;
          barber_id?: string | null;
          recurring_group_id?: string | null;
          client_name: string;
          client_whatsapp?: string;
          service_name?: string;
          barber_name?: string;
          date: string;
          start_time: string;
          end_time: string;
          duration_minutes?: number;
          price?: number;
          status?: AppointmentStatusRow;
          payment_method?: PaymentMethodRow | null;
          notes?: string | null;
          is_recurring?: boolean;
        };
        Update: {
          client_id?: string | null;
          service_id?: string | null;
          barber_id?: string | null;
          recurring_group_id?: string | null;
          client_name?: string;
          client_whatsapp?: string;
          service_name?: string;
          barber_name?: string;
          date?: string;
          start_time?: string;
          end_time?: string;
          duration_minutes?: number;
          price?: number;
          status?: AppointmentStatusRow;
          payment_method?: PaymentMethodRow | null;
          notes?: string | null;
          is_recurring?: boolean;
        };
        Relationships: [];
      };

      financial_entries: {
        Row: Timestamps & {
          id: string;
          owner_id: string;
          appointment_id: string | null;
          type: FinancialEntryTypeRow;
          category: string;
          description: string;
          amount: number;
          payment_method: PaymentMethodRow | null;
          occurred_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          appointment_id?: string | null;
          type: FinancialEntryTypeRow;
          category?: string;
          description?: string;
          amount: number;
          payment_method?: PaymentMethodRow | null;
          occurred_at?: string;
        };
        Update: {
          appointment_id?: string | null;
          type?: FinancialEntryTypeRow;
          category?: string;
          description?: string;
          amount?: number;
          payment_method?: PaymentMethodRow | null;
          occurred_at?: string;
        };
        Relationships: [];
      };

      settings: {
        Row: Timestamps & {
          id: string;
          owner_id: string;
          business_name: string;
          owner_name: string;
          whatsapp: string;
          address: string;
          interval_minutes: number;
          theme: AppTheme;
          currency: string;
          timezone: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          business_name?: string;
          owner_name?: string;
          whatsapp?: string;
          address?: string;
          interval_minutes?: number;
          theme?: AppTheme;
          currency?: string;
          timezone?: string;
        };
        Update: {
          business_name?: string;
          owner_name?: string;
          whatsapp?: string;
          address?: string;
          interval_minutes?: number;
          theme?: AppTheme;
          currency?: string;
          timezone?: string;
        };
        Relationships: [];
      };

      working_hours: {
        Row: Timestamps & {
          id: string;
          owner_id: string;
          weekday: number;
          is_open: boolean;
          start_time: string;
          end_time: string;
          break_start: string | null;
          break_end: string | null;
        };
        Insert: {
          id?: string;
          owner_id: string;
          weekday: number;
          is_open?: boolean;
          start_time?: string;
          end_time?: string;
          break_start?: string | null;
          break_end?: string | null;
        };
        Update: {
          is_open?: boolean;
          start_time?: string;
          end_time?: string;
          break_start?: string | null;
          break_end?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];
export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];
