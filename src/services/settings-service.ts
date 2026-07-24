'use client';

// Service de CONFIGURAÇÕES da barbearia (uma linha por usuário).
import type { Settings } from '@/types';
import { db, toError } from './_shared';
import { mapSettings } from './mappers';

const DEFAULTS: Settings = {
  business_name: 'HR Barber Shop',
  owner_name: '',
  whatsapp: '',
  interval_minutes: 10,
  theme: 'dark',
};

/** Retorna (criando na primeira vez) a linha de settings do usuário. */
async function ensureSettingsRow() {
  const { data, error } = await db().from('settings').select('*').limit(1).maybeSingle();
  if (error) throw toError(error, 'Falha ao carregar as configurações.');
  if (data) return data;

  const { data: created, error: insertError } = await db()
    .from('settings')
    .insert({
      business_name: DEFAULTS.business_name,
      owner_name: DEFAULTS.owner_name,
      whatsapp: DEFAULTS.whatsapp,
      interval_minutes: DEFAULTS.interval_minutes,
      theme: DEFAULTS.theme,
    })
    .select('*')
    .single();
  if (insertError) throw toError(insertError, 'Falha ao inicializar as configurações.');
  return created;
}

export async function getSettings(): Promise<Settings> {
  const row = await ensureSettingsRow();
  return mapSettings(row);
}

export async function updateSettings(input: Partial<Settings>): Promise<void> {
  const row = await ensureSettingsRow();
  const { error } = await db().from('settings').update(input).eq('id', row.id);
  if (error) throw toError(error, 'Falha ao salvar as configurações.');
}
