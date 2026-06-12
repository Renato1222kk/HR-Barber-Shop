'use client';

// Camada unica de acesso a dados.
// - Com Supabase configurado: le/grava no banco (com RLS por usuario).
// - Sem Supabase: usa um store em memoria (modo demonstracao).
import type {
  Appointment,
  AppointmentInput,
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
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { addMinutes } from '@/lib/utils/format';
import { demoStore, genId, nowISO } from './store';
import { mockWorkingHours } from './mock';

async function userId(): Promise<string | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb.auth.getUser();
  return data.user?.id ?? null;
}

// ===================== CLIENTES =====================
export async function listClients(): Promise<Client[]> {
  if (!isSupabaseConfigured) {
    return [...demoStore().clients].sort((a, b) => a.name.localeCompare(b.name));
  }
  const sb = getSupabase()!;
  const { data, error } = await sb.from('clients').select('*').order('name');
  if (error) throw error;
  return (data as Client[]) ?? [];
}

export async function createClient(input: ClientInput): Promise<Client> {
  if (!isSupabaseConfigured) {
    const client: Client = { ...input, id: genId('c'), created_at: nowISO() };
    demoStore().clients.push(client);
    return client;
  }
  const sb = getSupabase()!;
  const uid = await userId();
  const { data, error } = await sb
    .from('clients')
    .insert({ ...input, user_id: uid })
    .select()
    .single();
  if (error) throw error;
  return data as Client;
}

export async function updateClient(id: string, input: Partial<ClientInput>): Promise<void> {
  if (!isSupabaseConfigured) {
    const c = demoStore().clients.find((x) => x.id === id);
    if (c) Object.assign(c, input);
    return;
  }
  const sb = getSupabase()!;
  const { error } = await sb.from('clients').update(input).eq('id', id);
  if (error) throw error;
}

export async function deleteClient(id: string): Promise<void> {
  if (!isSupabaseConfigured) {
    const s = demoStore();
    s.clients = s.clients.filter((c) => c.id !== id);
    return;
  }
  const sb = getSupabase()!;
  const { error } = await sb.from('clients').delete().eq('id', id);
  if (error) throw error;
}

// Garante que o cliente exista (cria se necessario) e retorna o id.
async function ensureClient(name: string, whatsapp: string): Promise<string | null> {
  const clients = await listClients();
  const existing = clients.find(
    (c) =>
      c.name.trim().toLowerCase() === name.trim().toLowerCase() ||
      (whatsapp && c.whatsapp && c.whatsapp.replace(/\D/g, '') === whatsapp.replace(/\D/g, ''))
  );
  if (existing) return existing.id;
  const created = await createClient({ name, whatsapp, birth_date: null, notes: null });
  return created.id;
}

// ===================== SERVICOS =====================
export async function listServices(): Promise<Service[]> {
  if (!isSupabaseConfigured) {
    return [...demoStore().services].sort((a, b) => a.name.localeCompare(b.name));
  }
  const sb = getSupabase()!;
  const { data, error } = await sb.from('services').select('*').order('name');
  if (error) throw error;
  return (data as Service[]) ?? [];
}

export async function createService(input: ServiceInput): Promise<Service> {
  if (!isSupabaseConfigured) {
    const service: Service = { ...input, id: genId('s'), created_at: nowISO() };
    demoStore().services.push(service);
    return service;
  }
  const sb = getSupabase()!;
  const uid = await userId();
  const { data, error } = await sb
    .from('services')
    .insert({ ...input, user_id: uid })
    .select()
    .single();
  if (error) throw error;
  return data as Service;
}

export async function updateService(id: string, input: Partial<ServiceInput>): Promise<void> {
  if (!isSupabaseConfigured) {
    const s = demoStore().services.find((x) => x.id === id);
    if (s) Object.assign(s, input);
    return;
  }
  const sb = getSupabase()!;
  const { error } = await sb.from('services').update(input).eq('id', id);
  if (error) throw error;
}

export async function deleteService(id: string): Promise<void> {
  if (!isSupabaseConfigured) {
    const s = demoStore();
    s.services = s.services.filter((x) => x.id !== id);
    return;
  }
  const sb = getSupabase()!;
  const { error } = await sb.from('services').delete().eq('id', id);
  if (error) throw error;
}

// ===================== AGENDAMENTOS =====================
export async function listAppointments(range?: {
  from?: string;
  to?: string;
}): Promise<Appointment[]> {
  if (!isSupabaseConfigured) {
    let list = [...demoStore().appointments];
    if (range?.from) list = list.filter((a) => a.date >= range.from!);
    if (range?.to) list = list.filter((a) => a.date <= range.to!);
    return list.sort((a, b) =>
      a.date === b.date ? a.start_time.localeCompare(b.start_time) : a.date.localeCompare(b.date)
    );
  }
  const sb = getSupabase()!;
  let q = sb.from('appointments').select('*');
  if (range?.from) q = q.gte('date', range.from);
  if (range?.to) q = q.lte('date', range.to);
  const { data, error } = await q.order('date').order('start_time');
  if (error) throw error;
  return (data as Appointment[]) ?? [];
}

export async function createAppointment(input: AppointmentInput): Promise<Appointment> {
  // Cria/relaciona o cliente automaticamente.
  const clientId = input.client_id || (await ensureClient(input.client_name, input.client_whatsapp));
  const payload = { ...input, client_id: clientId };

  if (!isSupabaseConfigured) {
    const appt: Appointment = { ...payload, id: genId('a'), created_at: nowISO() };
    demoStore().appointments.push(appt);
    return appt;
  }
  const sb = getSupabase()!;
  const uid = await userId();
  const { data, error } = await sb
    .from('appointments')
    .insert({ ...payload, user_id: uid })
    .select()
    .single();
  if (error) throw error;
  return data as Appointment;
}

export async function updateAppointment(
  id: string,
  input: Partial<AppointmentInput>
): Promise<void> {
  if (!isSupabaseConfigured) {
    const a = demoStore().appointments.find((x) => x.id === id);
    if (a) Object.assign(a, input);
    return;
  }
  const sb = getSupabase()!;
  const { error } = await sb.from('appointments').update(input).eq('id', id);
  if (error) throw error;
}

export async function deleteAppointment(id: string): Promise<void> {
  if (!isSupabaseConfigured) {
    const s = demoStore();
    s.appointments = s.appointments.filter((a) => a.id !== id);
    return;
  }
  const sb = getSupabase()!;
  const { error } = await sb.from('appointments').delete().eq('id', id);
  if (error) throw error;
}

// ===================== AGENDAMENTO RECORRENTE =====================
export async function createRecurringAppointments(
  base: AppointmentInput,
  config: RecurrenceConfig,
  slots: RecurringSlot[]
): Promise<Appointment[]> {
  if (!slots.length) return [];

  // Resolve o cliente uma unica vez para toda a serie.
  const clientId =
    base.client_id || (await ensureClient(base.client_name, base.client_whatsapp));

  const groupBase = {
    client_id: clientId,
    service_id: base.service_id,
    frequency: config.frequency,
    interval_weeks: config.intervalWeeks,
    selected_weekdays: config.selectedWeekdays.map(String),
    start_date: slots[0].date,
    end_date: config.endMode === 'date' ? config.endDate : null,
    occurrences_count: config.endMode === 'count' ? config.occurrencesCount : slots.length,
  };

  const buildAppt = (slot: RecurringSlot, groupId: string): AppointmentInput => ({
    ...base,
    client_id: clientId,
    date: slot.date,
    start_time: slot.time,
    end_time: addMinutes(slot.time, base.duration_minutes),
    recurring_group_id: groupId,
    is_recurring: true,
  });

  if (!isSupabaseConfigured) {
    const store = demoStore();
    const group: RecurringGroup = {
      ...groupBase,
      id: genId('rg'),
      created_at: nowISO(),
    };
    store.recurringGroups.push(group);
    const created = slots.map((slot) => {
      const appt: Appointment = {
        ...buildAppt(slot, group.id),
        id: genId('a'),
        created_at: nowISO(),
      };
      store.appointments.push(appt);
      return appt;
    });
    return created;
  }

  const sb = getSupabase()!;
  const uid = await userId();

  const { data: group, error: gErr } = await sb
    .from('appointment_recurring_groups')
    .insert({ ...groupBase, user_id: uid })
    .select()
    .single();
  if (gErr) throw gErr;

  const rows = slots.map((slot) => ({ ...buildAppt(slot, group.id), user_id: uid }));
  const { data, error } = await sb.from('appointments').insert(rows).select();
  if (error) throw error;
  return (data as Appointment[]) ?? [];
}

// Aplica um patch a todos os agendamentos de uma serie (exceto data/horario,
// que sao proprios de cada ocorrencia).
export async function updateAppointmentSeries(
  groupId: string,
  patch: Partial<AppointmentInput>
): Promise<void> {
  const { date, start_time, end_time, ...shared } = patch;
  if (!isSupabaseConfigured) {
    demoStore()
      .appointments.filter((a) => a.recurring_group_id === groupId)
      .forEach((a) => Object.assign(a, shared));
    return;
  }
  const sb = getSupabase()!;
  const { error } = await sb
    .from('appointments')
    .update(shared)
    .eq('recurring_group_id', groupId);
  if (error) throw error;
}

export async function deleteAppointmentSeries(groupId: string): Promise<void> {
  if (!isSupabaseConfigured) {
    const s = demoStore();
    s.appointments = s.appointments.filter((a) => a.recurring_group_id !== groupId);
    s.recurringGroups = s.recurringGroups.filter((g) => g.id !== groupId);
    return;
  }
  const sb = getSupabase()!;
  const { error } = await sb
    .from('appointments')
    .delete()
    .eq('recurring_group_id', groupId);
  if (error) throw error;
  await sb.from('appointment_recurring_groups').delete().eq('id', groupId);
}

// ===================== SETTINGS =====================
export async function getSettings(): Promise<Settings> {
  if (!isSupabaseConfigured) return { ...demoStore().settings };
  const sb = getSupabase()!;
  const { data, error } = await sb.from('settings').select('*').limit(1).maybeSingle();
  if (error) throw error;
  return (
    (data as Settings) ?? {
      business_name: 'Bruno Samad',
      barber_name: 'Bruno Samad',
      whatsapp: '',
      interval_minutes: 10,
      theme: 'dark',
    }
  );
}

export async function updateSettings(input: Partial<Settings>): Promise<void> {
  if (!isSupabaseConfigured) {
    Object.assign(demoStore().settings, input);
    return;
  }
  const sb = getSupabase()!;
  const uid = await userId();
  const { error } = await sb
    .from('settings')
    .upsert({ ...input, user_id: uid }, { onConflict: 'user_id' });
  if (error) throw error;
}

// ===================== WORKING HOURS =====================
export async function listWorkingHours(): Promise<WorkingHour[]> {
  if (!isSupabaseConfigured) {
    return [...demoStore().workingHours].sort((a, b) => a.weekday - b.weekday);
  }
  const sb = getSupabase()!;
  const { data, error } = await sb.from('working_hours').select('*').order('weekday');
  if (error) throw error;
  const rows = (data as WorkingHour[]) ?? [];
  return rows.length ? rows : mockWorkingHours;
}

export async function updateWorkingHour(
  weekday: number,
  input: Partial<WorkingHour>
): Promise<void> {
  if (!isSupabaseConfigured) {
    const w = demoStore().workingHours.find((x) => x.weekday === weekday);
    if (w) Object.assign(w, input);
    return;
  }
  const sb = getSupabase()!;
  const uid = await userId();
  const { error } = await sb
    .from('working_hours')
    .upsert({ ...input, weekday, user_id: uid }, { onConflict: 'user_id,weekday' });
  if (error) throw error;
}

// ===================== DERIVADOS =====================
export function computeClientStats(
  clients: Client[],
  appointments: Appointment[]
): ClientWithStats[] {
  return clients.map((client) => {
    const appts = appointments.filter(
      (a) => a.client_id === client.id && a.status === 'atendido'
    );
    const total = appts.reduce((sum, a) => sum + Number(a.price), 0);
    const last = appts
      .map((a) => a.date)
      .sort()
      .at(-1);

    // servico mais frequente
    const counts: Record<string, number> = {};
    appts.forEach((a) => {
      counts[a.service_name] = (counts[a.service_name] || 0) + 1;
    });
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    return {
      ...client,
      appointments_count: appts.length,
      total_spent: total,
      last_visit: last ?? null,
      top_service: top,
    };
  });
}
