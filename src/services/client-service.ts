'use client';

// Service de CLIENTES — único ponto que fala com a tabela `clients`.
import type { Client, ClientInput } from '@/types';
import { db, toError } from './_shared';
import { mapClient } from './mappers';

export async function listClients(): Promise<Client[]> {
  const { data, error } = await db().from('clients').select('*').order('name');
  if (error) throw toError(error, 'Falha ao carregar clientes.');
  return (data ?? []).map(mapClient);
}

export async function getClientById(id: string): Promise<Client | null> {
  const { data, error } = await db().from('clients').select('*').eq('id', id).maybeSingle();
  if (error) throw toError(error, 'Falha ao carregar o cliente.');
  return data ? mapClient(data) : null;
}

export async function createClient(input: ClientInput): Promise<Client> {
  const { data, error } = await db()
    .from('clients')
    .insert({
      name: input.name,
      whatsapp: input.whatsapp,
      birth_date: input.birth_date,
      notes: input.notes,
    })
    .select('*')
    .single();
  if (error) throw toError(error, 'Falha ao cadastrar o cliente.');
  return mapClient(data);
}

export async function updateClient(id: string, input: Partial<ClientInput>): Promise<void> {
  const { error } = await db().from('clients').update(input).eq('id', id);
  if (error) throw toError(error, 'Falha ao atualizar o cliente.');
}

export async function deleteClient(id: string): Promise<void> {
  const { error } = await db().from('clients').delete().eq('id', id);
  if (error) throw toError(error, 'Falha ao remover o cliente.');
}

/** Garante que o cliente exista (por nome ou WhatsApp) e retorna o id. */
export async function ensureClient(name: string, whatsapp: string): Promise<string | null> {
  const cleanName = name.trim();
  if (!cleanName) return null;

  const clients = await listClients();
  const digits = whatsapp.replace(/\D/g, '');
  const existing = clients.find(
    (c) =>
      c.name.trim().toLowerCase() === cleanName.toLowerCase() ||
      (digits.length > 0 && c.whatsapp.replace(/\D/g, '') === digits)
  );
  if (existing) return existing.id;

  const created = await createClient({
    name: cleanName,
    whatsapp,
    birth_date: null,
    notes: null,
  });
  return created.id;
}
