// Leitura e validacao das variaveis do Supabase.
//
// Somente chaves publicas entram aqui. A publishable key (ou a anon key
// antiga) e feita para rodar no navegador e e protegida pelas politicas
// de RLS. Chaves administrativas (service role / secret key) nunca podem
// aparecer no bundle do cliente.
//
// As leituras sao escritas por extenso (process.env.NEXT_PUBLIC_...)
// porque o Next.js substitui essas expressoes em tempo de build; acesso
// dinamico com colchetes resultaria em undefined no navegador.

export interface SupabaseEnv {
  url: string;
  key: string;
}

export interface SupabaseEnvError {
  missing: string[];
  message: string;
}

const URL_VAR = 'NEXT_PUBLIC_SUPABASE_URL';
const KEY_VARS = 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (ou NEXT_PUBLIC_SUPABASE_ANON_KEY)';

function clean(value: string | undefined): string {
  return (value ?? '').trim();
}

/** Devolve as credenciais ou `null` quando alguma variavel esta faltando. */
export function readSupabaseEnv(): SupabaseEnv | null {
  const url = clean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  // A publishable key e a recomendada hoje; a anon key continua aceita
  // para projetos criados antes da mudanca de nomenclatura.
  const key =
    clean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ||
    clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  if (!url || !key) return null;
  return { url, key };
}

export function isSupabaseConfigured(): boolean {
  return readSupabaseEnv() !== null;
}

/** Lista o que falta configurar, para mostrar uma mensagem util na tela. */
export function describeMissingEnv(): SupabaseEnvError | null {
  const url = clean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key =
    clean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ||
    clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  const missing: string[] = [];
  if (!url) missing.push(URL_VAR);
  if (!key) missing.push(KEY_VARS);
  if (missing.length === 0) return null;

  return {
    missing,
    message:
      'O aplicativo ainda nao foi conectado ao Supabase. Crie o arquivo .env.local ' +
      `na raiz do projeto com ${missing.join(' e ')} e reinicie o servidor.`,
  };
}

/**
 * Igual a readSupabaseEnv, mas lanca um erro explicativo.
 * Use apenas onde ja se sabe que a configuracao existe.
 */
export function requireSupabaseEnv(): SupabaseEnv {
  const env = readSupabaseEnv();
  if (!env) {
    throw new Error(describeMissingEnv()?.message ?? 'Supabase nao configurado.');
  }
  return env;
}
