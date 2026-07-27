'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { readSupabaseEnv } from './env';

export type AppSupabaseClient = SupabaseClient<Database>;

// Um unico cliente por aba: varias instancias criariam varios listeners
// de sessao e canais de realtime duplicados.
let browserClient: AppSupabaseClient | null = null;

/**
 * Cliente do navegador. Retorna `null` quando as variaveis de ambiente
 * ainda nao foram preenchidas, para o app mostrar a tela de configuracao
 * em vez de quebrar com um erro indefinido.
 */
export function getSupabaseBrowserClient(): AppSupabaseClient | null {
  if (browserClient) return browserClient;

  const env = readSupabaseEnv();
  if (!env) return null;

  browserClient = createBrowserClient<Database>(env.url, env.key);
  return browserClient;
}

/** Versao que lanca erro — para uso dentro dos services. */
export function requireSupabaseBrowserClient(): AppSupabaseClient {
  const client = getSupabaseBrowserClient();
  if (!client) {
    throw new Error(
      'Supabase nao configurado. Preencha NEXT_PUBLIC_SUPABASE_URL e ' +
        'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY no arquivo .env.local.'
    );
  }
  return client;
}
