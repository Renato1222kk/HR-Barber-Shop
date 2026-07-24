'use client';

// Service de BARBEIROS — único ponto que fala com a tabela `barbers`.
import type { Barber, BarberInput } from '@/types';
import { db, toError } from './_shared';
import { mapBarber } from './mappers';

export async function listBarbers(): Promise<Barber[]> {
  const { data, error } = await db().from('barbers').select('*').order('name');
  if (error) throw toError(error, 'Falha ao carregar barbeiros.');
  return (data ?? []).map(mapBarber);
}

export async function getBarberById(id: string): Promise<Barber | null> {
  const { data, error } = await db().from('barbers').select('*').eq('id', id).maybeSingle();
  if (error) throw toError(error, 'Falha ao carregar o barbeiro.');
  return data ? mapBarber(data) : null;
}

export async function createBarber(input: BarberInput): Promise<Barber> {
  const { data, error } = await db()
    .from('barbers')
    .insert({
      name: input.name,
      phone: input.phone,
      specialty: input.specialty,
      active: input.active,
      work_start: input.work_start,
      work_end: input.work_end,
    })
    .select('*')
    .single();
  if (error) throw toError(error, 'Falha ao cadastrar o barbeiro.');
  return mapBarber(data);
}

export async function updateBarber(id: string, input: Partial<BarberInput>): Promise<void> {
  const { error } = await db().from('barbers').update(input).eq('id', id);
  if (error) throw toError(error, 'Falha ao atualizar o barbeiro.');
}

export async function deleteBarber(id: string): Promise<void> {
  const { error } = await db().from('barbers').delete().eq('id', id);
  if (error) throw toError(error, 'Falha ao remover o barbeiro.');
}
