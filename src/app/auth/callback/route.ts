import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * Destino dos links enviados por e-mail pelo Supabase (recuperacao de
 * senha, confirmacao de conta). Troca o `code` da URL por uma sessao em
 * cookie e segue para a pagina indicada em `next`.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';
  // Aceita apenas caminhos internos: evita redirecionamento para fora do app.
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard';

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
