import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import type { Database } from '@/types/database';
import { HOME_ROUTE } from '@/lib/constants';
import { readSupabaseEnv } from './env';

/** Rotas administrativas: exigem sessao valida. */
const PRIVATE_ROUTES = [
  '/agenda',
  '/clientes',
  '/barbeiros',
  '/servicos',
  '/financeiro',
  '/insights',
  '/configuracoes',
];

/** Rotas de autenticacao: quem ja esta logado nao precisa delas. */
const AUTH_ROUTES = ['/login', '/recuperar-senha'];

/**
 * Superficie PUBLICA do agendamento online. Sao as UNICAS rotas liberadas
 * sem sessao: a pagina /agendar e os endpoints /api/booking/*. Passam
 * direto, sem o custo de renovar a sessao — nenhuma delas depende de
 * login. As rotas administrativas acima continuam protegidas.
 */
const PUBLIC_ROUTES = ['/agendar', '/api/booking'];

function matches(pathname: string, routes: string[]): boolean {
  return routes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

/**
 * Renova a sessao do Supabase em toda requisicao e protege as rotas
 * privadas. Precisa devolver a MESMA resposta em que os cookies foram
 * gravados, senao a sessao renovada se perde.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  // Agendamento publico: liberado sem sessao e sem renovar cookies.
  if (matches(request.nextUrl.pathname, PUBLIC_ROUTES)) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const env = readSupabaseEnv();
  // Sem variaveis de ambiente nao ha o que proteger: a propria interface
  // exibe as instrucoes de configuracao.
  if (!env) return response;

  const supabase = createServerClient<Database>(env.url, env.key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // getUser() valida o token no servidor do Supabase (getSession() apenas
  // le o cookie, que pode estar adulterado).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;

  if (!user && matches(pathname, PRIVATE_ROUTES)) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    // Volta para onde a pessoa tentou entrar depois do login.
    url.searchParams.set('redirect', `${pathname}${search}`);
    return NextResponse.redirect(url);
  }

  if (user && matches(pathname, AUTH_ROUTES)) {
    const url = request.nextUrl.clone();
    url.pathname = HOME_ROUTE;
    url.search = '';
    return NextResponse.redirect(url);
  }

  return response;
}
