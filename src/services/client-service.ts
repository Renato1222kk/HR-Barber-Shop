'use client';

import type { Client, ClientInput } from '@/types';
import type { Tables } from '@/types/database';
import { db, requireOwnerId, run } from './base';

const COLUMNS = 'id, name, whatsapp, email, birth_date, notes, created_at';

type Row = Pick<
  Tables<'clients'>,
  'id' | 'name' | 'whatsapp' | 'email' | 'birth_date' | 'notes' | 'created_at'
>;

function toClient(row: Row): Client {
  return {
    id: row.id,
    name: row.name,
    whatsapp: row.whatsapp ?? '',
    email: row.email,
    birth_date: row.birth_date,
    notes: row.notes,
    created_at: row.created_at,
  };
}

export async function listClients(): Promise<Client[]> {
  return run('Erro ao carregar os clientes.', async () => {
    const { data, error } = await db()
      .from('clients')
      .select(COLUMNS)
      .order('name', { ascending: true });
    if (error) throw error;
    return (data ?? []).map(toClient);
  });
}

export async function getClientById(id: string): Promise<Client | null> {
  return run('Erro ao carregar o cliente.', async () => {
    const { data, error } = await db().from('clients').select(COLUMNS).eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? toClient(data) : null;
  });
}

export async function createClient(input: ClientInput): Promise<Client> {
  return run('Erro ao salvar o cliente.', async () => {
    const owner_id = await requireOwnerId();
    const { data, error } = await db()
      .from('clients')
      .insert({
        owner_id,
        name: input.name.trim(),
        whatsapp: input.whatsapp,
        email: input.email,
        birth_date: input.birth_date,
        notes: input.notes,
      })
      .select(COLUMNS)
      .single();
    if (error) throw error;
    return toClient(data);
  });
}

export async function updateClient(id: string, input: Partial<ClientInput>): Promise<void> {
  return run('Erro ao atualizar o cliente.', async () => {
    const { error } = await db()
      .from('clients')
      .update({
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.whatsapp !== undefined ? { whatsapp: input.whatsapp } : {}),
        ...(input.email !== undefined ? { email: input.email } : {}),
        ...(input.birth_date !== undefined ? { birth_date: input.birth_date } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
      })
      .eq('id', id);
    if (error) throw error;

    // Os agendamentos guardam uma copia do nome/WhatsApp: mantem tudo alinhado.
    const sync: { client_name?: string; client_whatsapp?: string } = {};
    if (input.name !== undefined) sync.client_name = input.name.trim();
    if (input.whatsapp !== undefined) sync.client_whatsapp = input.whatsapp;
    if (Object.keys(sync).length > 0) {
      const { error: syncError } = await db()
        .from('appointments')
        .update(sync)
        .eq('client_id', id);
      if (syncError) throw syncError;
    }
  });
}

/** Exclui o cliente. O histórico de agendamentos é preservado. */
export async function removeClient(id: string): Promise<void> {
  return run('Erro ao excluir o cliente.', async () => {
    const { error } = await db().from('clients').delete().eq('id', id);
    if (error) throw error;
  });
}

/**
 * Devolve o id de um cliente com este nome ou WhatsApp, criando o
 * cadastro quando ainda nao existir. Usado ao agendar direto pelo nome.
 */
export async function ensureClient(name: string, whatsapp: string): Promise<string | null> {
  const cleanName = name.trim();
  if (!cleanName) return null;

  return run('Erro ao localizar o cliente.', async () => {
    const digits = whatsapp.replace(/\D/g, '');
    const existing = await listClients();
    const match = existing.find(
      (c) =>
        c.name.trim().toLowerCase() === cleanName.toLowerCase() ||
        (digits.length > 0 && c.whatsapp.replace(/\D/g, '') === digits)
    );
    if (match) return match.id;

    const created = await createClient({
      name: cleanName,
      whatsapp,
      email: null,
      birth_date: null,
      notes: null,
    });
    return created.id;
  });
}
