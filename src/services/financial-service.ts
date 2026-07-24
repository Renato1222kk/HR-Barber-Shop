'use client';

// Service de LANÇAMENTOS FINANCEIROS (receitas/despesas manuais).
// A página Financeiro atual deriva o faturamento dos atendimentos concluídos;
// esta tabela cobre lançamentos avulsos e está pronta para uso/Realtime.
import type { FinancialEntry, FinancialEntryInput } from '@/types';
import type { Tables } from '@/types/database';
import { db, toError, toNum } from './_shared';

function mapEntry(row: Tables<'financial_entries'>): FinancialEntry {
  return {
    id: row.id,
    appointment_id: row.appointment_id,
    type: row.type === 'expense' ? 'expense' : 'income',
    category: row.category,
    description: row.description,
    amount: toNum(row.amount),
    payment_method: row.payment_method,
    occurred_at: row.occurred_at,
    created_at: row.created_at,
  };
}

export async function listFinancialEntries(range?: {
  from?: string;
  to?: string;
}): Promise<FinancialEntry[]> {
  let query = db().from('financial_entries').select('*');
  if (range?.from) query = query.gte('occurred_at', range.from);
  if (range?.to) query = query.lte('occurred_at', range.to);

  const { data, error } = await query.order('occurred_at', { ascending: false });
  if (error) throw toError(error, 'Falha ao carregar lançamentos financeiros.');
  return (data ?? []).map(mapEntry);
}

export async function getFinancialEntryById(id: string): Promise<FinancialEntry | null> {
  const { data, error } = await db()
    .from('financial_entries')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw toError(error, 'Falha ao carregar o lançamento.');
  return data ? mapEntry(data) : null;
}

export async function createFinancialEntry(
  input: FinancialEntryInput
): Promise<FinancialEntry> {
  const { data, error } = await db()
    .from('financial_entries')
    .insert({
      appointment_id: input.appointment_id,
      type: input.type,
      category: input.category,
      description: input.description,
      amount: input.amount,
      payment_method: input.payment_method,
      occurred_at: input.occurred_at,
    })
    .select('*')
    .single();
  if (error) throw toError(error, 'Falha ao registrar o lançamento.');
  return mapEntry(data);
}

export async function updateFinancialEntry(
  id: string,
  input: Partial<FinancialEntryInput>
): Promise<void> {
  const { error } = await db().from('financial_entries').update(input).eq('id', id);
  if (error) throw toError(error, 'Falha ao atualizar o lançamento.');
}

export async function deleteFinancialEntry(id: string): Promise<void> {
  const { error } = await db().from('financial_entries').delete().eq('id', id);
  if (error) throw toError(error, 'Falha ao remover o lançamento.');
}
