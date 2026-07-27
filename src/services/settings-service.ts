'use client';

import type { Settings, WorkingHour } from '@/types';
import type { Tables } from '@/types/database';
import { db, requireOwnerId, run, toHHmm } from './base';

const SETTINGS_COLUMNS =
  'business_name, owner_name, whatsapp, address, interval_minutes, theme';

const HOURS_COLUMNS = 'id, weekday, is_open, start_time, end_time, break_start, break_end';

/** Padroes usados quando o usuario ainda nao tem linha de configuracao. */
const DEFAULT_SETTINGS: Settings = {
  business_name: 'HR Barber Shop',
  owner_name: '',
  whatsapp: '',
  address: '',
  interval_minutes: 10,
  // Tema oficial e unico do aplicativo.
  theme: 'light',
};

const DEFAULT_HOURS: Omit<WorkingHour, 'id'>[] = [
  { weekday: 0, is_open: false, start_time: '09:00', end_time: '19:00', break_start: null, break_end: null },
  { weekday: 1, is_open: true, start_time: '09:00', end_time: '19:00', break_start: null, break_end: null },
  { weekday: 2, is_open: true, start_time: '09:00', end_time: '19:00', break_start: null, break_end: null },
  { weekday: 3, is_open: true, start_time: '09:00', end_time: '19:00', break_start: null, break_end: null },
  { weekday: 4, is_open: true, start_time: '09:00', end_time: '19:00', break_start: null, break_end: null },
  { weekday: 5, is_open: true, start_time: '09:00', end_time: '19:00', break_start: null, break_end: null },
  { weekday: 6, is_open: true, start_time: '08:00', end_time: '17:00', break_start: null, break_end: null },
];

type SettingsRow = Pick<
  Tables<'settings'>,
  'business_name' | 'owner_name' | 'whatsapp' | 'address' | 'interval_minutes' | 'theme'
>;

type HoursRow = Pick<
  Tables<'working_hours'>,
  'id' | 'weekday' | 'is_open' | 'start_time' | 'end_time' | 'break_start' | 'break_end'
>;

function toSettings(row: SettingsRow): Settings {
  return {
    business_name: row.business_name,
    owner_name: row.owner_name ?? '',
    whatsapp: row.whatsapp ?? '',
    address: row.address ?? '',
    interval_minutes: row.interval_minutes,
    // Linhas antigas podem trazer 'dark'/'gold'. Elas continuam validas no
    // banco, mas a interface tem um unico tema: claro.
    theme: 'light',
  };
}

function toWorkingHour(row: HoursRow): WorkingHour {
  return {
    id: row.id,
    weekday: row.weekday,
    is_open: row.is_open,
    start_time: toHHmm(row.start_time),
    end_time: toHHmm(row.end_time),
    break_start: row.break_start ? toHHmm(row.break_start) : null,
    break_end: row.break_end ? toHHmm(row.break_end) : null,
  };
}

/**
 * Configuracoes da barbearia. A linha e criada pelo trigger de novo
 * usuario; o insert aqui cobre contas criadas antes do trigger existir.
 */
export async function getSettings(): Promise<Settings> {
  return run('Erro ao carregar as configurações.', async () => {
    const { data, error } = await db()
      .from('settings')
      .select(SETTINGS_COLUMNS)
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (data) return toSettings(data);

    const owner_id = await requireOwnerId();
    const { data: created, error: insertError } = await db()
      .from('settings')
      .insert({ owner_id, ...DEFAULT_SETTINGS })
      .select(SETTINGS_COLUMNS)
      .single();
    if (insertError) throw insertError;
    return toSettings(created);
  });
}

export async function updateSettings(input: Partial<Settings>): Promise<void> {
  return run('Erro ao salvar as configurações.', async () => {
    const owner_id = await requireOwnerId();
    const merged = { ...DEFAULT_SETTINGS, ...input };
    // upsert por owner_id: cria a linha se ainda nao existir.
    const { error } = await db().from('settings').upsert(
      {
        owner_id,
        ...merged,
        // O banco nao aceita intervalo negativo.
        interval_minutes: Math.max(0, Math.round(merged.interval_minutes) || 0),
        // Tema oficial. Requer a migracao 001_theme_light nos bancos criados
        // antes desta versao (o check antigo so aceitava 'dark' e 'gold').
        theme: 'light',
      },
      { onConflict: 'owner_id' }
    );
    if (error) throw error;
  });
}

// ===================== HORARIO DE FUNCIONAMENTO =====================
export async function listWorkingHours(): Promise<WorkingHour[]> {
  return run('Erro ao carregar o horário de funcionamento.', async () => {
    const { data, error } = await db()
      .from('working_hours')
      .select(HOURS_COLUMNS)
      .order('weekday', { ascending: true });
    if (error) throw error;
    if (data && data.length > 0) return data.map(toWorkingHour);

    // Conta sem horarios cadastrados: grava os padroes uma unica vez.
    const owner_id = await requireOwnerId();
    const { data: created, error: insertError } = await db()
      .from('working_hours')
      .insert(DEFAULT_HOURS.map((h) => ({ owner_id, ...h })))
      .select(HOURS_COLUMNS);
    if (insertError) throw insertError;
    return (created ?? []).map(toWorkingHour);
  });
}

export async function updateWorkingHour(
  weekday: number,
  input: Partial<WorkingHour>
): Promise<void> {
  return run('Erro ao salvar o horário de funcionamento.', async () => {
    const owner_id = await requireOwnerId();
    const fallback = DEFAULT_HOURS.find((h) => h.weekday === weekday) ?? DEFAULT_HOURS[1];
    const { error } = await db().from('working_hours').upsert(
      {
        owner_id,
        weekday,
        is_open: input.is_open ?? fallback.is_open,
        start_time: input.start_time ?? fallback.start_time,
        end_time: input.end_time ?? fallback.end_time,
        break_start: input.break_start ?? null,
        break_end: input.break_end ?? null,
      },
      { onConflict: 'owner_id,weekday' }
    );
    if (error) throw error;
  });
}
