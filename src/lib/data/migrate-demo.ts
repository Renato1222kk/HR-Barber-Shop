'use client';

// -------------------------------------------------------------------
// Importador dos dados da versao de demonstracao.
//
// A versao antiga do app guardava tudo no localStorage. Este arquivo le
// aquele conteudo uma unica vez e envia para o Supabase, preservando os
// relacionamentos (agendamento -> cliente / servico / barbeiro).
//
// E o unico lugar do projeto que ainda le dados do localStorage.
// -------------------------------------------------------------------

import type { Appointment, Barber, Client, Service } from '@/types';
import { createBarber, listBarbers } from '@/services/barber-service';
import { createService, listServices } from '@/services/service-service';
import { createClient, listClients } from '@/services/client-service';
import { createAppointment, listAppointments } from '@/services/appointment-service';

/** Chave usada pela versao de demonstracao. */
export const LEGACY_STORAGE_KEY = 'hr-barber-shop:demo:v1';
/** Marca local de que a importacao ja foi concluida com sucesso. */
export const MIGRATION_DONE_KEY = 'hr-barber-shop:migracao-concluida';
/** Chave da sessao falsa da demonstracao (limpa junto). */
const LEGACY_SESSION_KEY = 'hr-barber-shop:demo:session';

/** Formato gravado pela versao antiga (campos que ainda importam). */
interface LegacyDatabase {
  barbers: Barber[];
  clients: Omit<Client, 'email'>[];
  services: Service[];
  appointments: Omit<Appointment, 'payment_method'>[];
}

export interface LegacyCounts {
  barbers: number;
  services: number;
  clients: number;
  appointments: number;
  total: number;
}

export interface ImportOutcome {
  imported: number;
  skipped: number;
}

export interface ImportResult {
  barbers: ImportOutcome;
  services: ImportOutcome;
  clients: ImportOutcome;
  appointments: ImportOutcome;
  errors: string[];
}

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function isLegacyDatabase(value: unknown): value is LegacyDatabase {
  if (!value || typeof value !== 'object') return false;
  const db = value as Partial<LegacyDatabase>;
  return (
    Array.isArray(db.barbers) &&
    Array.isArray(db.clients) &&
    Array.isArray(db.services) &&
    Array.isArray(db.appointments)
  );
}

/** Le o banco antigo do navegador (ou `null` se nao houver nada valido). */
export function readLegacyData(): LegacyDatabase | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isLegacyDatabase(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function isMigrationDone(): boolean {
  if (!isBrowser()) return false;
  try {
    return window.localStorage.getItem(MIGRATION_DONE_KEY) === 'true';
  } catch {
    return false;
  }
}

/** Quantos registros existem para importar. `null` quando nao ha nada. */
export function countLegacyData(): LegacyCounts | null {
  const db = readLegacyData();
  if (!db) return null;

  const counts: LegacyCounts = {
    barbers: db.barbers.length,
    services: db.services.length,
    clients: db.clients.length,
    appointments: db.appointments.length,
    total: 0,
  };
  counts.total = counts.barbers + counts.services + counts.clients + counts.appointments;
  return counts.total > 0 ? counts : null;
}

/** Apaga os dados antigos e marca a migracao como concluida. */
export function clearLegacyData(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
    window.localStorage.removeItem(LEGACY_SESSION_KEY);
    window.localStorage.setItem(MIGRATION_DONE_KEY, 'true');
  } catch {
    // Storage indisponivel: nada a fazer, a importacao ja terminou.
  }
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function digitsOf(value: string): string {
  return (value ?? '').replace(/\D/g, '');
}

/**
 * Importa os dados antigos na ordem correta (barbeiros, servicos,
 * clientes e por fim agendamentos, que dependem dos tres).
 *
 * Nada e apagado aqui: quem limpa o localStorage e `clearLegacyData()`,
 * chamado somente depois de a importacao terminar sem erro.
 */
export async function importLegacyData(): Promise<ImportResult> {
  const legacy = readLegacyData();
  const result: ImportResult = {
    barbers: { imported: 0, skipped: 0 },
    services: { imported: 0, skipped: 0 },
    clients: { imported: 0, skipped: 0 },
    appointments: { imported: 0, skipped: 0 },
    errors: [],
  };
  if (!legacy) return result;

  // De-para entre o id antigo (local) e o id novo (uuid do Supabase).
  const barberIds = new Map<string, string>();
  const serviceIds = new Map<string, string>();
  const clientIds = new Map<string, string>();

  // ---------------- Barbeiros ----------------
  const existingBarbers = await listBarbers();
  const barberByName = new Map(existingBarbers.map((b) => [normalize(b.name), b.id]));

  for (const barber of legacy.barbers) {
    const key = normalize(barber.name);
    const already = barberByName.get(key);
    if (already) {
      barberIds.set(barber.id, already);
      result.barbers.skipped += 1;
      continue;
    }
    try {
      const created = await createBarber({
        name: barber.name,
        phone: barber.phone ?? '',
        specialty: barber.specialty ?? '',
        active: barber.active ?? true,
        work_start: barber.work_start ?? '09:00',
        work_end: barber.work_end ?? '19:00',
      });
      barberIds.set(barber.id, created.id);
      barberByName.set(key, created.id);
      result.barbers.imported += 1;
    } catch (error) {
      result.errors.push(`Barbeiro "${barber.name}": ${(error as Error).message}`);
    }
  }

  // ---------------- Servicos ----------------
  const existingServices = await listServices();
  const serviceByName = new Map(existingServices.map((s) => [normalize(s.name), s.id]));

  for (const service of legacy.services) {
    const key = normalize(service.name);
    const already = serviceByName.get(key);
    if (already) {
      serviceIds.set(service.id, already);
      result.services.skipped += 1;
      continue;
    }
    try {
      const created = await createService({
        name: service.name,
        description: service.description ?? null,
        duration_minutes: service.duration_minutes || 30,
        price: service.price || 0,
        active: service.active ?? true,
      });
      serviceIds.set(service.id, created.id);
      serviceByName.set(key, created.id);
      result.services.imported += 1;
    } catch (error) {
      result.errors.push(`Serviço "${service.name}": ${(error as Error).message}`);
    }
  }

  // ---------------- Clientes ----------------
  const existingClients = await listClients();
  const clientByName = new Map(existingClients.map((c) => [normalize(c.name), c.id]));
  const clientByPhone = new Map(
    existingClients.filter((c) => digitsOf(c.whatsapp)).map((c) => [digitsOf(c.whatsapp), c.id])
  );

  for (const client of legacy.clients) {
    const nameKey = normalize(client.name);
    const phoneKey = digitsOf(client.whatsapp);
    const already = clientByName.get(nameKey) ?? (phoneKey ? clientByPhone.get(phoneKey) : undefined);
    if (already) {
      clientIds.set(client.id, already);
      result.clients.skipped += 1;
      continue;
    }
    try {
      const created = await createClient({
        name: client.name,
        whatsapp: client.whatsapp ?? '',
        email: null,
        birth_date: client.birth_date ?? null,
        notes: client.notes ?? null,
      });
      clientIds.set(client.id, created.id);
      clientByName.set(nameKey, created.id);
      if (phoneKey) clientByPhone.set(phoneKey, created.id);
      result.clients.imported += 1;
    } catch (error) {
      result.errors.push(`Cliente "${client.name}": ${(error as Error).message}`);
    }
  }

  // ---------------- Agendamentos ----------------
  // Assinatura de duplicidade: mesma data, horario, barbeiro e cliente.
  const existingAppointments = await listAppointments();
  const signature = (a: {
    date: string;
    start_time: string;
    barber_name: string;
    client_name: string;
  }) =>
    [a.date, a.start_time.slice(0, 5), normalize(a.barber_name), normalize(a.client_name)].join('|');

  const seen = new Set(existingAppointments.map(signature));

  for (const appointment of legacy.appointments) {
    if (seen.has(signature(appointment))) {
      result.appointments.skipped += 1;
      continue;
    }
    try {
      await createAppointment({
        client_id: appointment.client_id ? clientIds.get(appointment.client_id) ?? null : null,
        service_id: appointment.service_id ? serviceIds.get(appointment.service_id) ?? null : null,
        barber_id: appointment.barber_id ? barberIds.get(appointment.barber_id) ?? null : null,
        client_name: appointment.client_name,
        client_whatsapp: appointment.client_whatsapp ?? '',
        service_name: appointment.service_name ?? '',
        barber_name: appointment.barber_name ?? '',
        date: appointment.date,
        start_time: appointment.start_time.slice(0, 5),
        end_time: appointment.end_time.slice(0, 5),
        duration_minutes: appointment.duration_minutes || 30,
        price: appointment.price || 0,
        status: appointment.status,
        payment_method: null,
        notes: appointment.notes ?? null,
      });
      seen.add(signature(appointment));
      result.appointments.imported += 1;
    } catch (error) {
      // Conflito de horario ou registro invalido: segue para o proximo em
      // vez de interromper a importacao inteira.
      result.appointments.skipped += 1;
      result.errors.push(
        `Agendamento de ${appointment.client_name} em ${appointment.date} às ` +
          `${appointment.start_time}: ${(error as Error).message}`
      );
    }
  }

  return result;
}
