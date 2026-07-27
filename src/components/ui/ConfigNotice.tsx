'use client';

import { Settings2 } from 'lucide-react';

/**
 * Mostrada quando o projeto ainda nao foi conectado a um Supabase.
 * Melhor do que deixar a tela quebrar com um erro indefinido.
 */
export function ConfigNotice({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-gold-200 bg-gold-50 p-5">
      <div className="flex items-start gap-3.5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-gold-600 ring-1 ring-gold-200">
          <Settings2 className="h-5 w-5" />
        </div>
        <div className="min-w-0 space-y-2">
          <h3 className="text-sm font-semibold text-ink-900">Configuração pendente</h3>
          <p className="break-words text-sm leading-relaxed text-ink-600">{message}</p>
          <pre className="overflow-x-auto rounded-xl border border-ink-200 bg-ink-50 px-3.5 py-3 text-[11px] leading-relaxed text-ink-700">
{`NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...`}
          </pre>
          <p className="text-xs text-ink-500">
            O passo a passo completo está no README do projeto.
          </p>
        </div>
      </div>
    </div>
  );
}
