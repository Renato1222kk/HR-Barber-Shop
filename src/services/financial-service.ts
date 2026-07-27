'use client';

import type { FinancialEntry, FinancialEntryInput } from '@/types';
import type { Tables } from '@/types/database';
import { db, fetchAllPages, requireOwnerId, run, toNumber } from './base';

const COLUMNS =
  'id, appointment_id, type, category, description, amount, payment_method, occurred_at, created_at';

type Row = Omit<Tables<'financial_entries'>, 'owner_id' | 'updated_at'>;

function toEntry(row: Row): FinancialEntry {
  return {
    id: row.id,
    appointment_id: row.appointment_id,
    type: row.type,
    category: row.category,
    description: row.description,
    amount: toNumber(row.amount),
    payment_method: row.payment_method,
    occurred_at: row.occurred_at,
    created_at: row.created_at,
  };
}

export async function listFinancialEntries(range?: {
  from?: string;
  to?: string;
}): Promise<FinancialEntry[]> {
  return run('Erro ao carregar os lançamentos.', async () => {
    const rows = await fetchAllPages<Row>((from, to) => {
      let query = db().from('financial_entries').select(COLUMNS);
      if (range?.from) query = query.gte('occurred_at', range.from);
      if (range?.to) query = query.lte('occurred_at', range.to);
      return query
        .order('occurred_at', { ascending: false })
        .order('created_at', { ascending: false })
        .range(from, to);
    });
    return rows.map(toEntry);
  });
}

export async function getFinancialEntryById(id: string): Promise<FinancialEntry | null> {
  return run('Erro ao carregar o lançamento.', async () => {
    const { data, error } = await db()
      .from('financial_entries')
      .select(COLUMNS)
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data ? toEntry(data) : null;
  });
}

export async function createFinancialEntry(
  input: FinancialEntryInput
): Promise<FinancialEntry> {
  return run('Erro ao salvar o lançamento.', async () => {
    const owner_id = await requireOwnerId();
    const { data, error } = await db()
      .from('financial_entries')
      .insert({
        owner_id,
        appointment_id: input.appointment_id,
        type: input.type,
        category: input.category,
        description: input.description,
        amount: input.amount,
        payment_method: input.payment_method,
        occurred_at: input.occurred_at,
      })
      .select(COLUMNS)
      .single();
    if (error) throw error;
    return toEntry(data);
  });
}

export async function updateFinancialEntry(
  id: string,
  input: Partial<FinancialEntryInput>
): Promise<void> {
  return run('Erro ao atualizar o lançamento.', async () => {
    const { error } = await db()
      .from('financial_entries')
      .update({
        ...(input.appointment_id !== undefined ? { appointment_id: input.appointment_id } : {}),
        ...(input.type !== undefined ? { type: input.type } : {}),
        ...(input.category !== undefined ? { category: input.category } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.amount !== undefined ? { amount: input.amount } : {}),
        ...(input.payment_method !== undefined ? { payment_method: input.payment_method } : {}),
        ...(input.occurred_at !== undefined ? { occurred_at: input.occurred_at } : {}),
      })
      .eq('id', id);
    if (error) throw error;
  });
}

export async function removeFinancialEntry(id: string): Promise<void> {
  return run('Erro ao excluir o lançamento.', async () => {
    const { error } = await db().from('financial_entries').delete().eq('id', id);
    if (error) throw error;
  });
}
