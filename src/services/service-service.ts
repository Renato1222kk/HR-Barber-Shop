'use client';

// Service de SERVIÇOS — único ponto que fala com a tabela `services`.
import type { Service, ServiceInput } from '@/types';
import { db, toError } from './_shared';
import { mapService } from './mappers';

export async function listServices(): Promise<Service[]> {
  const { data, error } = await db().from('services').select('*').order('name');
  if (error) throw toError(error, 'Falha ao carregar serviços.');
  return (data ?? []).map(mapService);
}

export async function getServiceById(id: string): Promise<Service | null> {
  const { data, error } = await db().from('services').select('*').eq('id', id).maybeSingle();
  if (error) throw toError(error, 'Falha ao carregar o serviço.');
  return data ? mapService(data) : null;
}

export async function createService(input: ServiceInput): Promise<Service> {
  const { data, error } = await db()
    .from('services')
    .insert({
      name: input.name,
      description: input.description,
      duration_minutes: input.duration_minutes,
      price: input.price,
      active: input.active,
    })
    .select('*')
    .single();
  if (error) throw toError(error, 'Falha ao cadastrar o serviço.');
  return mapService(data);
}

export async function updateService(id: string, input: Partial<ServiceInput>): Promise<void> {
  const { error } = await db().from('services').update(input).eq('id', id);
  if (error) throw toError(error, 'Falha ao atualizar o serviço.');
}

export async function deleteService(id: string): Promise<void> {
  const { error } = await db().from('services').delete().eq('id', id);
  if (error) throw toError(error, 'Falha ao remover o serviço.');
}
