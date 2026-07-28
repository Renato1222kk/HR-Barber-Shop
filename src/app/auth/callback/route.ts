import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { safeRedirectPath } from '@/lib/utils/routes';

/**
 * Destino dos links enviados por e-mail pelo Supabase (recuperacao de
 * senha, confirmacao de conta). Troca o `code` da URL por uma sessao em
 * cookie e segue para a pagina indicada em `next`.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');
  // Aceita apenas caminhos internos: evita redirecionamento para fora do app.
  const safeNext = safeRedirectPath(searchParams.get('next'));

  if (!code) {
    return NextResponse.redirect(`${origin}/login?erro=link-invalido`);
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.redirect(`${origin}/login?erro=configuracao`);
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}/login?erro=link-expirado`);
  }

  return NextResponse.redirect(`${origin}${safeNext}`);
}
