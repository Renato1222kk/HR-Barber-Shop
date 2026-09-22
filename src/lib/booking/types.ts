// Tipos compartilhados entre as rotas de API do agendamento publico e a
// interface de /agendar. Espelham exatamente o que as funcoes RPC
// devolvem — nada de owner_id ou dados internos.

export interface PublicService {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: number;
}

export interface PublicWorkingHour {
  weekday: number; // 0 = domingo
  is_open: boolean;
  start_time: string; // HH:mm
  end_time: string; // HH:mm
}

export interface PublicSettings {
  business_name: string;
  whatsapp: string;
  address: string;
  working_hours: PublicWorkingHour[];
}

export interface AvailabilityResult {
  slots: string[]; // ["09:00", "09:40", ...]
  next_available_date: string | null; // YYYY-MM-DD quando nao ha vaga no dia
}

export interface CreateBookingInput {
  serviceId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  name: string;
  whatsapp: string;
  notes?: string;
}

export interface CreateBookingResult {
  id: string;
  date: string; // YYYY-MM-DD
  start_time: string; // HH:mm
  end_time: string; // HH:mm
  service_name: string;
  duration_minutes: number;
  price: number;
  client_name: string;
  client_whatsapp: string;
}
