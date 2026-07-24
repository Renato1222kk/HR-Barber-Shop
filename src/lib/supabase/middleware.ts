// Atualização da sessão e proteção de rotas no middleware (Edge).
// Segue o padrão recomendado por @supabase/ssr para o App Router.
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from '@/types/database';
import { readSupabaseEnv } from './env';

// Rotas que exigem sessão válida.
const PROTECTED_PREFIXES = [
  '/dashboard',
  '/agenda',
  '/clientes',
  '/barbeiros',
  '/servicos',
  '/financeiro',
  '/insights',
  '/configuracoes',
];

// Rotas de autenticação (login / recuperação): usuário logado é mandado ao app.
const AUTH_ROUTES = ['/login', '/recuperar-senha'];

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  );
}

/**
 * Renova a sessão a cada requisição e redireciona conforme o estado de login.
 * Se o Supabase não estiver configurado, deixa a requisição passar (a tela de
 * configuração cuida da mensagem amigável).
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });

  const env = readSupabaseEnv();
  if (!env) return response;

  const supabase = createServerClient<Database>(env.url, env.key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // IMPORTANTE: não rodar código entre createServerClient e getUser().
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Sem sessão em rota privada -> login (guardando o destino).
  if (!user && isProtected(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  // Já logado tentando abrir login -> dashboard.
  if (user && AUTH_ROUTES.some((r) => pathname === r)) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return response;
}
