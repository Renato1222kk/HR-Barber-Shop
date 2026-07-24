'use client';

// Importador ÚNICO dos antigos dados de demonstração (localStorage -> Supabase).
// Lê a base local legada, mapeia relacionamentos, evita duplicados e só limpa
// os dados antigos após concluir com sucesso.
import type { Appointment, Barber, Client, Service, Settings } from '@/types';
import type { DemoDatabase } from './demo-data';
import { STORAGE_KEY } from './demo-storage';
import {
  listBarbers,
  createBarber,
  listServices,
  createService,
  listClients,
  createClient,
  createAppointment,
  updateSettings,
  updateWorkingHour,
} from './repository';

const MIGRATION_FLAG = 'hr-barber-shop:migrated:v1';

export interface LegacyCounts {
  barbers: number;
  services: number;
  clients: number;
  appointments: number;
}

export interface MigrationResult {
  barbers: { imported: number; reused: number };
  services: { imported: number; reused: number };
  clients: { imported: number; reused: number };
  appointments: { imported: number; skipped: number };
}

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

/** Lê a base legada crua do localStorage, sem recriar dados de demonstração. */
function readLegacy(): DemoDatabase | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<DemoDatabase>;
    if (
      Array.isArray(parsed.barbers) &&
      Array.isArray(parsed.services) &&
      Array.isArray(parsed.clients) &&
      Array.isArray(parsed.appointments)
    ) {
      return parsed as DemoDatabase;
    }
  } catch {
    // Base corrompida: ignora.
  }
  return null;
}

export function isMigrationDone(): boolean {
  if (!isBrowser()) return false;
  return window.localStorage.getItem(MIGRATION_FLAG) === 'true';
}

/** Detecta a presença de dados antigos e retorna as quantidades encontradas. */
export function detectLegacyData(): { present: boolean; counts: LegacyCounts } {
  const db = readLegacy();
  if (!db) {
    return { present: false, counts: { barbers: 0, services: 0, clients: 0, appointments: 0 } };
  }
  return {
    present: true,
    counts: {
      barbers: db.barbers.length,
      services: db.services.length,
      clients: db.clients.length,
      appointments: db.appointments.length,
    },
  };
}

const norm = (s: string) => s.trim().toLowerCase();
const digits = (s: string) => (s || '').replace(/\D/g, '');

/**
 * Executa a importação na ordem correta (barbeiros → serviços → clientes →
 * agendamentos), preservando os relacionamentos por meio de mapas de id.
 */
export async function migrateLegacyData(): Promise<MigrationResult> {
  const db = readLegacy();
  if (!db) {
    throw new Error('Nenhum dado de demonstração encontrado neste navegador.');
  }

  const result: MigrationResult = {
    barbers: { imported: 0, reused: 0 },
    services: { imported: 0, reused: 0 },
    clients: { imported: 0, reused: 0 },
    appointments: { imported: 0, skipped: 0 },
  };

  // ---- BARBEIROS ----
  const barberMap = new Map<string, string>(); // oldId -> newId
  const existingBarbers = await listBarbers();
  for (const b of db.barbers as Barber[]) {
    const match = existingBarbers.find((x) => norm(x.name) === norm(b.name));
    if (match) {
      barberMap.set(b.id, match.id);
      result.barbers.reused += 1;
      continue;
    }
    const created = await createBarber({
      name: b.name,
      phone: b.phone,
      specialty: b.specialty,
      active: b.active,
      work_start: b.work_start,
      work_end: b.work_end,
    });
    barberMap.set(b.id, created.id);
    result.barbers.imported += 1;
  }

  // ---- SERVIÇOS ----
  const serviceMap = new Map<string, string>();
  const existingServices = await listServices();
  for (const s of db.services as Service[]) {
    const match = existingServices.find((x) => norm(x.name) === norm(s.name));
    if (match) {
      serviceMap.set(s.id, match.id);
      result.services.reused += 1;
      continue;
    }
    const created = await createService({
      name: s.name,
      description: s.description,
      duration_minutes: s.duration_minutes,
      price: s.price,
      active: s.active,
    });
    serviceMap.set(s.id, created.id);
    result.services.imported += 1;
  }

  // ---- CLIENTES ----
  const clientMap = new Map<string, string>();
  const existingClients = await listClients();
  for (const c of db.clients as Client[]) {
    const match = existingClients.find(
      (x) =>
        norm(x.name) === norm(c.name) ||
        (digits(c.whatsapp).length > 0 && digits(x.whatsapp) === digits(c.whatsapp))
    );
    if (match) {
      clientMap.set(c.id, match.id);
      result.clients.reused += 1;
      continue;
    }
    const created = await createClient({
      name: c.name,
      whatsapp: c.whatsapp,
      birth_date: c.birth_date,
      notes: c.notes,
    });
    clientMap.set(c.id, created.id);
    result.clients.imported += 1;
  }

  // ---- AGENDAMENTOS ----
  for (const a of db.appointments as Appointment[]) {
    try {
      await createAppointment({
        client_id: a.client_id ? clientMap.get(a.client_id) ?? null : null,
        service_id: a.service_id ? serviceMap.get(a.service_id) ?? null : null,
        barber_id: a.barber_id ? barberMap.get(a.barber_id) ?? null : null,
        client_name: a.client_name,
        client_whatsapp: a.client_whatsapp,
        service_name: a.service_name,
        barber_name: a.barber_name,
        date: a.date,
        start_time: a.start_time,
        end_time: a.end_time,
        duration_minutes: a.duration_minutes,
        price: a.price,
        status: a.status,
        notes: a.notes,
      });
      result.appointments.imported += 1;
    } catch {
      // Conflitos de horário ou registros já existentes são apenas pulados.
      result.appointments.skipped += 1;
    }
  }

  // ---- CONFIGURAÇÕES E HORÁRIOS (best-effort) ----
  try {
    if (db.settings) {
      const s = db.settings as Settings;
      await updateSettings({
        business_name: s.business_name,
        owner_name: s.owner_name,
        whatsapp: s.whatsapp,
        interval_minutes: s.interval_minutes,
        theme: s.theme,
      });
    }
    if (Array.isArray(db.workingHours)) {
      for (const h of db.workingHours) {
        await updateWorkingHour(h.weekday, h);
      }
    }
  } catch {
    // Configurações são opcionais na migração.
  }

  return result;
}

/** Marca a migração como concluída e remove a base antiga do navegador. */
export function finalizeMigration(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(MIGRATION_FLAG, 'true');
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem('hr-barber-shop:demo:session');
  } catch {
    // Sem storage: nada a limpar.
  }
}
