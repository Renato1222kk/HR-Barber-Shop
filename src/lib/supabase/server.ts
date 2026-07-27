import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { readSupabaseEnv } from './env';

/**
 * Cliente para Server Components, Route Handlers e Server Actions.
 * A sessao vive nos cookies e e lida a cada requisicao.
 *
 * Retorna `null` quando o projeto ainda nao foi conectado ao Supabase.
 */
export function createSupabaseServerClient(): SupabaseClient<Database> | null {
  const env = readSupabaseEnv();
  if (!env) return null;

  const cookieStore = cookies();

  return createServerClient<Database>(env.url, env.key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components nao podem gravar cookies. O middleware ja
          // renova a sessao a cada requisicao, entao nada se perde aqui.
        }
      },
    },
  });
}
