'use client';

import { useEffect } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { emitDataChanged } from '@/lib/events';

/**
 * Assina as mudancas em tempo real das tabelas que a interface acompanha.
 *
 * Qualquer INSERT / UPDATE / DELETE feito em outro aparelho dispara
 * `emitDataChanged()`, e todas as telas montadas (agenda, clientes,
 * financeiro, insights) recarregam sozinhas.
 *
 * Monta um unico canal por sessao — o hook e usado apenas no AppShell —
 * e o remove no unmount para nao acumular inscricoes.
 */
export function useRealtimeSync(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    // O nome fixo impede que uma remontagem crie um canal paralelo: o
    // Supabase reaproveita o canal ja registrado com este topico.
    const channel = supabase
      .channel('hr-barber-shop:changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'appointments' },
        () => emitDataChanged()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'financial_entries' },
        () => emitDataChanged()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled]);
}
