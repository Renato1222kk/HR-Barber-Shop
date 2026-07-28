import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { HOME_ROUTE } from '@/lib/constants';

export const dynamic = 'force-dynamic';

/**
 * Porta de entrada: quem tem sessao vai direto para a agenda, quem nao
 * tem cai no login. Decidir aqui no servidor evita a tela piscar.
 */
export default async function Home() {
  const supabase = createSupabaseServerClient();
  if (!supabase) redirect('/login');

  const {
    data: { user },
  } = await supabase.auth.getUser();

  redirect(user ? HOME_ROUTE : '/login');
}
