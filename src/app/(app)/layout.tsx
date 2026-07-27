import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { ConfigNotice } from '@/components/ui/ConfigNotice';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { describeMissingEnv } from '@/lib/supabase/env';

// A sessao vem dos cookies, entao nada aqui pode ser pre-renderizado.
export const dynamic = 'force-dynamic';

/**
 * Segunda barreira das rotas administrativas. O middleware ja redireciona
 * quem nao tem sessao; a checagem aqui garante que nenhuma pagina privada
 * renderize antes de a sessao ser confirmada no servidor.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createSupabaseServerClient();

  if (!supabase) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-16">
        <ConfigNotice message={describeMissingEnv()?.message ?? 'Supabase não configurado.'} />
      </div>
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  return <AppShell>{children}</AppShell>;
}
