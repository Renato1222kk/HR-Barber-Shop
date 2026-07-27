'use client';

import type { Service, ServiceInput } from '@/types';
import type { Tables } from '@/types/database';
import { db, requireOwnerId, run, toNumber } from './base';

const COLUMNS = 'id, name, description, duration_minutes, price, active, created_at';

type Row = Pick<
  Tables<'services'>,
  'id' | 'name' | 'description' | 'duration_minutes' | 'price' | 'active' | 'created_at'
>;

// O banco exige duracao positiva e preco nao negativo.
const safeDuration = (value: number) => Math.max(1, Math.round(value) || 1);
const safePrice = (value: number) => Math.max(0, Number(value) || 0);

function toService(row: Row): Service {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    duration_minutes: row.duration_minutes,
    price: toNumber(row.price),
    active: row.active,
    created_at: row.created_at,
  };
}

export async function listServices(): Promise<Service[]> {
  return run('Erro ao carregar os serviços.', async () => {
    const { data, error } = await db()
      .from('services')
      .select(COLUMNS)
      .order('name', { ascending: true });
    if (error) throw error;
    return (data ?? []).map(toService);
  });
}

export async function getServiceById(id: string): Promise<Service | null> {
  return run('Erro ao carregar o serviço.', async () => {
    const { data, error } = await db().from('services').select(COLUMNS).eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? toService(data) : null;
  });
}

export async function createService(input: ServiceInput): Promise<Service> {
  return run('Erro ao salvar o serviço.', async () => {
    const owner_id = await requireOwnerId();
    const { data, error } = await db()
      .from('services')
      .insert({
        owner_id,
        name: input.name.trim(),
        description: input.description,
        duration_minutes: safeDuration(input.duration_minutes),
        price: safePrice(input.price),
        active: input.active,
      })
      .select(COLUMNS)
      .single();
    if (error) throw error;
    return toService(data);
  });
}

export async function updateService(id: string, input: Partial<ServiceInput>): Promise<void> {
  return run('Erro ao atualizar o serviço.', async () => {
    const { error } = await db()
      .from('services')
      .update({
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.duration_minutes !== undefined
          ? { duration_minutes: safeDuration(input.duration_minutes) }
          : {}),
        ...(input.price !== undefined ? { price: safePrice(input.price) } : {}),
        ...(input.active !== undefined ? { active: input.active } : {}),
      })
      .eq('id', id);
    if (error) throw error;

    if (input.name !== undefined) {
      const { error: syncError } = await db()
        .from('appointments')
        .update({ service_name: input.name.trim() })
        .eq('service_id', id);
      if (syncError) throw syncError;
    }
  });
}

/** Exclui o serviço. Agendamentos antigos mantêm o nome já registrado. */
export async function removeService(id: string): Promise<void> {
  return run('Erro ao excluir o serviço.', async () => {
    const { error } = await db().from('services').delete().eq('id', id);
    if (error) throw error;
  });
}
