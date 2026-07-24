// Tipos do banco (compatíveis com supabase/schema.sql).
// Mantidos à mão para casar com os tipos de domínio em src/types/index.ts.
// owner_id tem DEFAULT auth.uid() no banco, por isso é opcional no Insert.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type Timestamps = {
  created_at: string;
  updated_at: string;
};

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          name: string | null;
          email: string | null;
          role: string;
        } & Timestamps;
        Insert: {
          id: string;
          name?: string | null;
          email?: string | null;
          role?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
        Relationships: [];
      };
      barbers: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          phone: string;
          specialty: string;
          active: boolean;
          work_start: string;
          work_end: string;
          color: string | null;
        } & Timestamps;
        Insert: {
          id?: string;
          owner_id?: string;
          name: string;
          phone?: string;
          specialty?: string;
          active?: boolean;
          work_start?: string;
          work_end?: string;
          color?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['barbers']['Insert']>;
        Relationships: [];
      };
      services: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          description: string | null;
          price: number;
          duration_minutes: number;
          active: boolean;
        } & Timestamps;
        Insert: {
          id?: string;
          owner_id?: string;
          name: string;
          description?: string | null;
          price?: number;
          duration_minutes?: number;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['services']['Insert']>;
        Relationships: [];
      };
      clients: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          whatsapp: string;
          email: string | null;
          birth_date: string | null;
          notes: string | null;
        } & Timestamps;
        Insert: {
          id?: string;
          owner_id?: string;
          name: string;
          whatsapp?: string;
          email?: string | null;
          birth_date?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['clients']['Insert']>;
        Relationships: [];
      };
      appointments: {
        Row: {
          id: string;
          owner_id: string;
          client_id: string | null;
          service_id: string | null;
          barber_id: string | null;
          client_name: string;
          client_whatsapp: string;
          service_name: string;
          barber_name: string;
          date: string;
          start_time: string;
          end_time: string;
          duration_minutes: number;
          price: number;
          status: string;
          payment_method: string | null;
          notes: string | null;
          recurring_group_id: string | null;
          is_recurring: boolean;
          starts_at: string;
          ends_at: string;
        } & Timestamps;
        Insert: {
          id?: string;
          owner_id?: string;
          client_id?: string | null;
          service_id?: string | null;
          barber_id?: string | null;
          client_name: string;
          client_whatsapp?: string;
          service_name?: string;
          barber_name?: string;
          date: string;
          start_time: string;
          end_time: string;
          duration_minutes?: number;
          price?: number;
          status?: string;
          payment_method?: string | null;
          notes?: string | null;
          recurring_group_id?: string | null;
          is_recurring?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['appointments']['Insert']>;
        Relationships: [];
      };
      recurring_groups: {
        Row: {
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
        } & Timestamps;
        Insert: {
          id?: string;
          owner_id?: string;
          client_id?: string | null;
          service_id?: string | null;
          barber_id?: string | null;
          frequency: string;
          interval_weeks?: number;
          selected_weekdays?: string[];
          start_date: string;
          end_date?: string | null;
          occurrences_count?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['recurring_groups']['Insert']>;
        Relationships: [];
      };
      financial_entries: {
        Row: {
          id: string;
          owner_id: string;
          appointment_id: string | null;
          type: string;
          category: string | null;
          description: string | null;
          amount: number;
          payment_method: string | null;
          occurred_at: string;
        } & Timestamps;
        Insert: {
          id?: string;
          owner_id?: string;
          appointment_id?: string | null;
          type: string;
          category?: string | null;
          description?: string | null;
          amount: number;
          payment_method?: string | null;
          occurred_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['financial_entries']['Insert']>;
        Relationships: [];
      };
      settings: {
        Row: {
          id: string;
          owner_id: string;
          business_name: string;
          owner_name: string;
          whatsapp: string;
          address: string | null;
          interval_minutes: number;
          theme: string;
          currency: string;
          timezone: string;
        } & Timestamps;
        Insert: {
          id?: string;
          owner_id?: string;
          business_name?: string;
          owner_name?: string;
          whatsapp?: string;
          address?: string | null;
          interval_minutes?: number;
          theme?: string;
          currency?: string;
          timezone?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['settings']['Insert']>;
        Relationships: [];
      };
      working_hours: {
        Row: {
          id: string;
          owner_id: string;
          barber_id: string | null;
          weekday: number;
          is_open: boolean;
          start_time: string;
          end_time: string;
          break_start: string | null;
          break_end: string | null;
        } & Timestamps;
        Insert: {
          id?: string;
          owner_id?: string;
          barber_id?: string | null;
          weekday: number;
          is_open?: boolean;
          start_time?: string;
          end_time?: string;
          break_start?: string | null;
          break_end?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['working_hours']['Insert']>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

// Atalhos úteis para os services.
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];
export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];
