'use client';

import { Sparkles, TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { Section, EmptyLine } from './FinanceSection';
import type { FinanceInsight } from '@/lib/data/finance';

const TONE: Record<FinanceInsight['tone'], string> = {
  neutral: 'bg-ink-100 text-ink-600',
  positive: 'bg-green-50 text-green-600',
  negative: 'bg-red-50 text-red-600',
};

const ICON = {
  neutral: Sparkles,
  positive: TrendingUp,
  negative: TrendingDown,
};

/**
 * "Resumo do período": frases montadas por calculo deterministico sobre os
 * dados carregados. Nenhum numero aqui e estimado.
 */
export function FinancialInsights({ insights }: { insights: FinanceInsight[] }) {
  return (
    <Section title="Resumo do período" description="Gerado a partir dos números reais">
      {insights.length === 0 ? (
        <EmptyLine>Sem dados suficientes para gerar um resumo deste período.</EmptyLine>
      ) : (
        <ul className="space-y-2">
          {insights.map((insight) => {
            const Icon = ICON[insight.tone];
            return (
              <li
                key={insight.id}
                className="flex items-start gap-3 rounded-xl border border-ink-200 bg-white p-3"
              >
                <span
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl',
                    TONE[insight.tone]
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <p className="pt-1 text-sm leading-snug text-ink-800">{insight.text}</p>
              </li>
            );
          })}
        </ul>
      )}
    </Section>
  );
}
