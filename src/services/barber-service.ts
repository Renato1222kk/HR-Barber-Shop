'use client';

import type { Barber, BarberInput } from '@/types';
import type { Tables } from '@/types/database';
import { db, requireOwnerId, run, toHHmm } from './base';

const COLUMNS = 'id, name, phone, specialty, active, work_start, work_end, created_at';

/** Mensagem exibida quando nao ha nenhum profissional ativo cadastrado. */
export const NO_ACTIVE_BARBER_MESSAGE =
  'Cadastre um barbeiro ativo antes de criar um agendamento.';

type Row = Pick<
  Tables<'barbers'>,
  'id' | 'name' | 'phone' | 'specialty' | 'active' | 'work_start' | 'work_end' | 'created_at'
>;

function toBarber(row: Row): Barber {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone ?? '',
    specialty: row.specialty ?? '',
    active: row.active,
    work_start: toHHmm(row.work_start),
    work_end: toHHmm(row.work_end),
    created_at: row.created_at,
  };
}

export async function listBarbers(): Promise<Barber[]> {
  return run('Erro ao carregar os barbeiros.', async () => {
    const { data, error } = await db()
      .from('barbers')
      .select(COLUMNS)
      .order('name', { ascending: true });
    if (error) throw error;
    return (data ?? []).map(toBarber);
  });
}

/**
 * Barbeiro usado automaticamente nos agendamentos. Como a barbearia opera
 * com um unico profissional, a interface nao pede essa escolha: vale o
 * primeiro barbeiro ativo, em ordem estavel por data de cadastro.
 */
export async function getDefaultBarber(): Promise<Barber | null> {
  return run('Erro ao carregar o barbeiro.', async () => {
    const { data, error } = await db()
      .from('barbers')
      .select(COLUMNS)
      .eq('active', true)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data ? toBarber(data) : null;
  });
}

export async function getBarberById(id: string): Promise<Barber | null> {
  return run('Erro ao carregar o barbeiro.', async () => {
    const { data, error } = await db().from('barbers').select(COLUMNS).eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? toBarber(data) : null;
  });
}

export async function createBarber(input: BarberInput): Promise<Barber> {
  return run('Erro ao salvar o barbeiro.', async () => {
    const owner_id = await requireOwnerId();
    const { data, error } = await db()
      .from('barbers')
      .insert({
        owner_id,
        name: input.name.trim(),
        phone: input.phone,
        specialty: input.specialty,
        active: input.active,
        work_start: input.work_start,
        work_end: input.work_end,
      })
      .select(COLUMNS)
      .single();
    if (error) throw error;
    return toBarber(data);
  });
}

export async function updateBarber(id: string, input: Partial<BarberInput>): Promise<void> {
  return run('Erro ao atualizar o barbeiro.', async () => {
    const { error } = await db()
      .from('barbers')
      .update({
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
        ...(input.specialty !== undefined ? { specialty: input.specialty } : {}),
        ...(input.active !== undefined ? { active: input.active } : {}),
        ...(input.work_start !== undefined ? { work_start: input.work_start } : {}),
        ...(input.work_end !== undefined ? { work_end: input.work_end } : {}),
      })
      .eq('id', id);
    if (error) throw error;

    // Mantem o historico coerente: o nome copiado nos agendamentos
    // acompanha o cadastro.
    if (input.name !== undefined) {
      const { error: syncError } = await db()
        .from('appointments')
        .update({ barber_name: input.name.trim() })
        .eq('barber_id', id);
      if (syncError) throw syncError;
    }
  });
}

/**
 * Remove o barbeiro. Os agendamentos existentes ficam com `barber_id`
 * nulo (o nome copiado preserva o historico), conforme o
 * `on delete set null` do schema.
 */
export async function removeBarber(id: string): Promise<void> {
  return run('Erro ao excluir o barbeiro.', async () => {
    const { error } = await db().from('barbers').delete().eq('id', id);
    if (error) throw error;
  });
}
