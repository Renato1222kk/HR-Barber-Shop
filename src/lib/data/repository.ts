'use client';

// Camada única de acesso a dados do app.
// Agora a fonte de dados é o SUPABASE (via services em src/services).
// Este arquivo é apenas a fachada estável usada pelas páginas/componentes,
// além dos helpers puros (conflito e estatísticas de cliente).
import type { Appointment, Client, ClientWithStats } from '@/types';

// ---- Conflito (regra pura reutilizada pela UI e pelos services) ----
export { BARBER_CONFLICT_MESSAGE, findBarberConflict } from './conflict';

// ---- CRUD (delegado aos services do Supabase) ----
export {
  listClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
} from '@/services/client-service';

export {
  listBarbers,
  getBarberById,
  createBarber,
  updateBarber,
  deleteBarber,
} from '@/services/barber-service';

export {
  listServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
} from '@/services/service-service';

export {
  listAppointments,
  getAppointmentById,
  createAppointment,
  updateAppointment,
  deleteAppointment,
  createRecurringAppointments,
  updateAppointmentSeries,
  deleteAppointmentSeries,
} from '@/services/appointment-service';

export { getSettings, updateSettings } from '@/services/settings-service';

export { listWorkingHours, updateWorkingHour } from '@/services/working-hours-service';

export {
  listFinancialEntries,
  getFinancialEntryById,
  createFinancialEntry,
  updateFinancialEntry,
  deleteFinancialEntry,
} from '@/services/financial-service';

// ===================== DERIVADOS =====================
/** Estatísticas por cliente (somente atendimentos concluídos). */
export function computeClientStats(
  clients: Client[],
  appointments: Appointment[]
): ClientWithStats[] {
  return clients.map((client) => {
    const done = appointments.filter(
      (a) => a.client_id === client.id && a.status === 'concluido'
    );
    const total = done.reduce((sum, a) => sum + Number(a.price), 0);
    const last = done
      .map((a) => a.date)
      .sort()
      .at(-1);

    // serviço mais frequente
    const counts: Record<string, number> = {};
    done.forEach((a) => {
      counts[a.service_name] = (counts[a.service_name] || 0) + 1;
    });
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    return {
      ...client,
      appointments_count: done.length,
      total_spent: total,
      last_visit: last ?? null,
      top_service: top,
    };
  });
}
