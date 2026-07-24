'use client';

// Sincronização em tempo real (Supabase Realtime).
// Assina INSERT/UPDATE/DELETE das tabelas voláteis e dispara um refetch global
// via emitDataChanged(), atualizando agenda, dashboard e financeiro sem reload.
import { useEffect } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { emitDataChanged } from '@/lib/events';

export function useRealtimeSync(): void {
  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    const supabase = getSupabaseBrowserClient();
    const channel = supabase
      .channel('hr-barber:realtime')
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

    // Limpa o canal no unmount (evita inscrições duplicadas).
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
}
