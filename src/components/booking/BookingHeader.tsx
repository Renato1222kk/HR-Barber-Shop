'use client';

import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { LogoMark } from '@/components/brand/Logo';

/** Passos exibidos no indicador de progresso (discreto, estilo app). */
export const PROGRESS_STEPS = ['Serviço', 'Horário', 'Dados', 'Confirmar'] as const;

interface BookingHeaderProps {
  businessName: string;
  /** Passo atual de 1 a 4; use 0 para telas sem progresso (sucesso). */
  current: number;
  showBack: boolean;
  onBack: () => void;
}

/**
 * Cabeçalho fixo da página pública: botão voltar, marca da barbearia e o
 * indicador de progresso. Compacto para caber em telas de 320px.
 */
export function BookingHeader({ businessName, current, showBack, onBack }: BookingHeaderProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-ink-100 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="mx-auto flex w-full max-w-[640px] items-center gap-3 px-4 py-3 sm:px-6">
        {showBack ? (
          <button
            type="button"
            onClick={onBack}
            aria-label="Voltar"
            className="-ml-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-600 transition-colors hover:bg-ink-100 active:bg-ink-200"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        ) : (
          <span className="h-9 w-9 shrink-0" aria-hidden />
        )}

        <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
          <LogoMark size="sm" priority />
          <span className="truncate text-sm font-semibold tracking-tight text-ink-900">
            {businessName}
          </span>
        </div>

        <span className="h-9 w-9 shrink-0" aria-hidden />
      </div>

      {current > 0 && (
        <div className="mx-auto w-full max-w-[640px] px-4 pb-3 sm:px-6">
          <ol className="flex items-center gap-1.5">
            {PROGRESS_STEPS.map((label, i) => {
              const step = i + 1;
              const done = step < current;
              const active = step === current;
              return (
                <li key={label} className="flex flex-1 flex-col items-center gap-1.5">
                  <span
                    className={cn(
                      'h-1 w-full rounded-full transition-colors',
                      done || active ? 'bg-ink-900' : 'bg-ink-200'
                    )}
                  />
                  <span
                    className={cn(
                      'text-[10px] font-medium tracking-wide sm:text-xs',
                      active ? 'text-ink-900' : 'text-ink-400'
                    )}
                  >
                    {label}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </header>
  );
}
