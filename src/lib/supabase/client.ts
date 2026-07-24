'use client';

// Cliente Supabase para o NAVEGADOR (@supabase/ssr).
// Usa createBrowserClient e um singleton para não recriar a conexão a cada render.
import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { requireSupabaseEnv } from './env';

let browserClient: SupabaseClient<Database> | null = null;

/** Retorna (criando uma única vez) o cliente Supabase do navegador. */
export function getSupabaseBrowserClient(): SupabaseClient<Database> {
  if (browserClient) return browserClient;
  const { url, key } = requireSupabaseEnv();
  browserClient = createBrowserClient<Database>(url, key);
  return browserClient;
}
