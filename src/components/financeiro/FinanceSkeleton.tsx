'use client';

import { cn } from '@/lib/utils/cn';
import { Card } from '@/components/ui/Card';

function Block({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-lg bg-ink-100', className)} />;
}

/**
 * Esqueleto do painel enquanto os dados carregam.
 *
 * Nenhum card mostra numero durante o carregamento — zero na tela seria
 * lido como "nao faturei nada hoje".
 */
export function FinanceSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true" aria-live="polite">
      <span className="sr-only">Carregando o financeiro...</span>

      <Card className="p-5">
        <Block className="h-3 w-24" />
        <Block className="mt-3 h-9 w-48" />
        <Block className="mt-3 h-3 w-32" />
        <Block className="mt-4 h-8 w-full" />
      </Card>

      <div className="grid grid-cols-2 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <Card key={i} className="p-4">
            <Block className="h-3 w-16" />
            <Block className="mt-3 h-6 w-24" />
            <Block className="mt-2 h-3 w-20" />
          </Card>
        ))}
      </div>

      <Card className="p-5">
        <Block className="h-3 w-32" />
        <Block className="mt-4 h-[180px] w-full" />
      </Card>

      <Card className="p-5">
        <Block className="h-3 w-28" />
        <div className="mt-4 space-y-3">
          {[0, 1, 2].map((i) => (
            <Block key={i} className="h-12 w-full" />
          ))}
        </div>
      </Card>
    </div>
  );
}
