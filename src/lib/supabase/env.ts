// Validação e leitura das variáveis de ambiente públicas do Supabase.
//
// Aceita tanto a nova "Publishable Key" quanto a antiga "Anon Key" (compat).
// NUNCA leia aqui SUPABASE_SECRET_KEY / SERVICE_ROLE / senha do banco:
// nada disso pode chegar ao navegador.

export interface SupabaseEnv {
  url: string;
  key: string;
}

/** Mensagem amigável exibida quando o Supabase ainda não foi configurado. */
export const SUPABASE_SETUP_MESSAGE =
  'O Supabase ainda não foi configurado. Crie um arquivo .env.local com ' +
  'NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ' +
  '(veja o README) e reinicie o servidor.';

/** Retorna as variáveis se ambas existirem, ou `null` caso contrário. */
export function readSupabaseEnv(): SupabaseEnv | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  // Prioriza a Publishable Key; aceita a Anon Key por compatibilidade.
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !key) return null;
  return { url, key };
}

/** Indica se o app tem as variáveis mínimas para falar com o Supabase. */
export function isSupabaseConfigured(): boolean {
  return readSupabaseEnv() !== null;
}

/** Retorna as variáveis ou lança um erro claro (uso interno dos clients). */
export function requireSupabaseEnv(): SupabaseEnv {
  const env = readSupabaseEnv();
  if (!env) throw new Error(SUPABASE_SETUP_MESSAGE);
  return env;
}
