import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * Porta de entrada: quem tem sessao vai direto para o dashboard, quem nao
 * tem cai no login. Decidir aqui no servidor evita a tela piscar.
 */
export default async function Home() {
  const supabase = createSupabaseServerClient();
  if (!supabase) redirect('/login');

  const {
    data: { user },
  } = await supabase.auth.getUser();

  redirect(user ? '/dashboard' : '/login');
}
