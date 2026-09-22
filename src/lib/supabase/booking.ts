import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { readSupabaseEnv } from './env';

/**
 * Cliente Supabase usado SOMENTE nas rotas de API do agendamento publico
 * (server-side). Usa a chave publishable/anon — a mesma protegida por RLS
 * — e nao persiste sessao: as requisicoes rodam como `anon`.
 *
 * Todo o acesso publico passa por funcoes SECURITY DEFINER (rpc), entao o
 * navegador nunca fala direto com as tabelas e nenhuma chave
 * administrativa entra no projeto.
 *
 * Retorna `null` quando o Supabase ainda nao foi configurado.
 */
export function createPublicBookingClient(): SupabaseClient | null {
  const env = readSupabaseEnv();
  if (!env) return null;

  return createClient(env.url, env.key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
