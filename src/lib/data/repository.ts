'use client';

// Camada unica de acesso a dados (modo demonstracao).
// Tudo e lido e gravado no localStorage do navegador atraves de demo-storage.
// A API continua assincrona para manter a mesma forma de uso nas paginas.
import type {
  Appointment,
  AppointmentInput,
  Barber,
  BarberInput,
  Client,
  ClientInput,
  ClientWithStats,
  RecurrenceConfig,
  RecurringGroup,
  RecurringSlot,
  Service,
  ServiceInput,
  Settings,
  WorkingHour,
} from '@/types';
import { BUSY_STATUSES } from '@/lib/constants';
import { addMinutes, timeToMinutes } from '@/lib/utils/format';
import { genId, nowISO, readDb, resetDb, writeDb } from './demo-storage';

export const BARBER_CONFLICT_MESSAGE =
  'Este barbeiro já possui um atendimento nesse horário.';

// ===================== CLIENTES =====================
export async function listClients(): Promise<Client[]> {
  return [...readDb().clients].sort((a, b) => a.name.localeCompare(b.name));
}

export async function createClient(input: ClientInput): Promise<Client> {
  return writeDb((db) => {
    const client: Client = { ...input, id: genId('c'), created_at: nowISO() };
    db.clients.push(client);
    return client;
  });
}

export async function updateClient(id: string, input: Partial<ClientInput>): Promise<void> {
  writeDb((db) => {
    const client = db.clients.find((c) => c.id === id);
    if (!client) return;
    Object.assign(client, input);
    // Mantem os agendamentos coerentes com o cadastro.
    db.appointments.forEach((a) => {
      if (a.client_id !== id) return;
      a.client_name = client.name;
      a.client_whatsapp = client.whatsapp;
    });
  });
}

export async function deleteClient(id: string): Promise<void> {
  writeDb((db) => {
    db.clients = db.clients.filter((c) => c.id !== id);
  });
}

// Garante que o cliente exista (cria se necessario) e retorna o id.
async function ensureClient(name: string, whatsapp: string): Promise<string | null> {
  const digits = whatsapp.replace(/\D/g, '');
  const existing = readDb().clients.find(
    (c) =>
      c.name.trim().toLowerCase() === name.trim().toLowerCase() ||
      (digits.length > 0 && c.whatsapp.replace(/\D/g, '') === digits)
  );
  if (existing) return existing.id;
  const created = await createClient({ name, whatsapp, birth_date: null, notes: null });
  return created.id;
}

// ===================== BARBEIROS =====================
export async function listBarbers(): Promise<Barber[]> {
  return [...readDb().barbers].sort((a, b) => a.name.localeCompare(b.name));
}

export async function createBarber(input: BarberInput): Promise<Barber> {
  return writeDb((db) => {
    const barber: Barber = { ...input, id: genId('b'), created_at: nowISO() };
    db.barbers.push(barber);
    return barber;
  });
}

export async function updateBarber(id: string, input: Partial<BarberInput>): Promise<void> {
  writeDb((db) => {
    const barber = db.barbers.find((b) => b.id === id);
    if (!barber) return;
    Object.assign(barber, input);
    db.appointments.forEach((a) => {
      if (a.barber_id === id) a.barber_name = barber.name;
    });
  });
}

export async function deleteBarber(id: string): Promise<void> {
  writeDb((db) => {
    db.barbers = db.barbers.filter((b) => b.id !== id);
  });
}

// ===================== SERVICOS =====================
export async function listServices(): Promise<Service[]> {
  return [...readDb().services].sort((a, b) => a.name.localeCompare(b.name));
}

export async function createService(input: ServiceInput): Promise<Service> {
  return writeDb((db) => {
    const service: Service = { ...input, id: genId('s'), created_at: nowISO() };
    db.services.push(service);
    return service;
  });
}

export async function updateService(id: string, input: Partial<ServiceInput>): Promise<void> {
  writeDb((db) => {
    const service = db.services.find((s) => s.id === id);
    if (service) Object.assign(service, input);
  });
}

export async function deleteService(id: string): Promise<void> {
  writeDb((db) => {
    db.services = db.services.filter((s) => s.id !== id);
  });
}

// ===================== CONFLITO DE HORARIO =====================
interface ConflictQuery {
  barberId: string | null;
  date: string;
  startTime: string;
  durationMinutes: number;
  ignoreId?: string;
  ignoreGroupId?: string;
}

/** Verifica se o barbeiro ja tem um atendimento que se sobrepoe ao intervalo informado. */
export function findBarberConflict(
  appointments: Appointment[],
  { barberId, date, startTime, durationMinutes, ignoreId, ignoreGroupId }: ConflictQuery
): Appointment | null {
  if (!barberId) return null;
  const start = timeToMinutes(startTime);
  const end = start + Math.max(1, durationMinutes);

  return (
    appointments.find((a) => {
      if (a.barber_id !== barberId) return false;
      if (a.date !== date) return false;
      if (a.id === ignoreId) return false;
      if (ignoreGroupId && a.recurring_group_id === ignoreGroupId) return false;
      if (!BUSY_STATUSES.includes(a.status)) return false;
      const otherStart = timeToMinutes(a.start_time);
      const otherEnd = timeToMinutes(a.end_time || addMinutes(a.start_time, a.duration_minutes));
      return start < otherEnd && otherStart < end;
    }) ?? null
  );
}

function assertNoConflict(query: ConflictQuery): void {
  const clash = findBarberConflict(readDb().appointments, query);
  if (clash) throw new Error(BARBER_CONFLICT_MESSAGE);
}

// ===================== AGENDAMENTOS =====================
export async function listAppointments(range?: {
  from?: string;
  to?: string;
}): Promise<Appointment[]> {
  let list = [...readDb().appointments];
  if (range?.from) list = list.filter((a) => a.date >= range.from!);
  if (range?.to) list = list.filter((a) => a.date <= range.to!);
  return list.sort((a, b) =>
    a.date === b.date ? a.start_time.localeCompare(b.start_time) : a.date.localeCompare(b.date)
  );
}

export async function createAppointment(input: AppointmentInput): Promise<Appointment> {
  if (BUSY_STATUSES.includes(input.status)) {
    assertNoConflict({
      barberId: input.barber_id,
      date: input.date,
      startTime: input.start_time,
      durationMinutes: input.duration_minutes,
    });
  }

  // Cria/relaciona o cliente automaticamente.
  const clientId =
    input.client_id || (await ensureClient(input.client_name, input.client_whatsapp));

  return writeDb((db) => {
    const appointment: Appointment = {
      ...input,
      client_id: clientId,
      id: genId('a'),
      created_at: nowISO(),
    };
    db.appointments.push(appointment);
    return appointment;
  });
}

export async function updateAppointment(
  id: string,
  input: Partial<AppointmentInput>
): Promise<void> {
  const current = readDb().appointments.find((a) => a.id === id);
  if (!current) return;

  const next = { ...current, ...input };
  if (BUSY_STATUSES.includes(next.status)) {
    assertNoConflict({
      barberId: next.barber_id,
      date: next.date,
      startTime: next.start_time,
      durationMinutes: next.duration_minutes,
      ignoreId: id,
    });
  }

  writeDb((db) => {
    const appointment = db.appointments.find((a) => a.id === id);
    if (appointment) Object.assign(appointment, input);
  });
}

export async function deleteAppointment(id: string): Promise<void> {
  writeDb((db) => {
    db.appointments = db.appointments.filter((a) => a.id !== id);
  });
}

// ===================== AGENDAMENTO RECORRENTE =====================
export async function createRecurringAppointments(
  base: AppointmentInput,
  config: RecurrenceConfig,
  slots: RecurringSlot[]
): Promise<Appointment[]> {
  if (!slots.length) return [];

  // Resolve o cliente uma unica vez para toda a serie.
  const clientId = base.client_id || (await ensureClient(base.client_name, base.client_whatsapp));

  return writeDb((db) => {
    const group: RecurringGroup = {
      id: genId('rg'),
      client_id: clientId,
      service_id: base.service_id,
      barber_id: base.barber_id,
      frequency: config.frequency,
      interval_weeks: config.intervalWeeks,
      selected_weekdays: config.selectedWeekdays.map(String),
      start_date: slots[0].date,
      end_date: config.endMode === 'date' ? config.endDate : null,
      occurrences_count: config.endMode === 'count' ? config.occurrencesCount : slots.length,
      created_at: nowISO(),
    };
    db.recurringGroups.push(group);

    return slots.map((slot) => {
      const appointment: Appointment = {
        ...base,
        client_id: clientId,
        date: slot.date,
        start_time: slot.time,
        end_time: addMinutes(slot.time, base.duration_minutes),
        recurring_group_id: group.id,
        is_recurring: true,
        id: genId('a'),
        created_at: nowISO(),
      };
      db.appointments.push(appointment);
      return appointment;
    });
  });
}

// Aplica um patch a todos os agendamentos de uma serie (exceto data/horario,
// que sao proprios de cada ocorrencia).
export async function updateAppointmentSeries(
  groupId: string,
  patch: Partial<AppointmentInput>
): Promise<void> {
  const shared = { ...patch };
  delete shared.date;
  delete shared.start_time;
  delete shared.end_time;

  writeDb((db) => {
    db.appointments
      .filter((a) => a.recurring_group_id === groupId)
      .forEach((a) => Object.assign(a, shared));
  });
}

export async function deleteAppointmentSeries(groupId: string): Promise<void> {
  writeDb((db) => {
    db.appointments = db.appointments.filter((a) => a.recurring_group_id !== groupId);
    db.recurringGroups = db.recurringGroups.filter((g) => g.id !== groupId);
  });
}

// ===================== SETTINGS =====================
export async function getSettings(): Promise<Settings> {
  return { ...readDb().settings };
}

export async function updateSettings(input: Partial<Settings>): Promise<void> {
  writeDb((db) => {
    Object.assign(db.settings, input);
  });
}

// ===================== HORARIOS DE FUNCIONAMENTO =====================
export async function listWorkingHours(): Promise<WorkingHour[]> {
  return [...readDb().workingHours].sort((a, b) => a.weekday - b.weekday);
}

export async function updateWorkingHour(
  weekday: number,
  input: Partial<WorkingHour>
): Promise<void> {
  writeDb((db) => {
    const hour = db.workingHours.find((h) => h.weekday === weekday);
    if (hour) Object.assign(hour, input);
  });
}

// ===================== DEMONSTRACAO =====================
/** Descarta as alteracoes locais e restaura os dados iniciais. */
export async function restoreDemoData(): Promise<void> {
  resetDb();
}

// ===================== DERIVADOS =====================
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

    // servico mais frequente
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
