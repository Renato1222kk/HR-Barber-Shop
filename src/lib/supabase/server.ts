// Cliente Supabase para o SERVIDOR (Server Components, Route Handlers).
// Usa createServerClient com os cookies da requisição (@supabase/ssr).
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { requireSupabaseEnv } from './env';

/**
 * Cria um cliente Supabase ligado aos cookies da requisição atual.
 * Deve ser chamado dentro de um Server Component ou Route Handler.
 */
export async function createSupabaseServerClient(): Promise<SupabaseClient<Database>> {
  const { url, key } = requireSupabaseEnv();
  const cookieStore = await cookies();

  return createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Chamado a partir de um Server Component: os cookies serão
          // atualizados pelo middleware. Pode ser ignorado com segurança.
        }
      },
    },
  });
}
