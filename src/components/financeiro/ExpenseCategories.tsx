'use client';

import { formatCurrency } from '@/lib/utils/format';
import { Section, EmptyLine, PercentBar } from './FinanceSection';
import type { CategorySlice } from '@/lib/data/finance';

/** Para onde foi o dinheiro que saiu no período. */
export function ExpenseCategories({
  categories,
  total,
}: {
  categories: CategorySlice[];
  total: number;
}) {
  return (
    <Section
      title="Despesas por categoria"
      description={total > 0 ? `${formatCurrency(total)} no período` : undefined}
    >
      {categories.length === 0 ? (
        <EmptyLine>Nenhuma despesa lançada neste período.</EmptyLine>
      ) : (
        <ul className="space-y-3">
          {categories.map((category) => (
            <li key={category.category}>
              <div className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink-900">
                  {category.label}
                </span>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-red-600">
                  − {formatCurrency(category.value)}
                </span>
              </div>
              <PercentBar percent={category.percent} tone="red" />
              <p className="mt-1 text-xs text-ink-500">
                {category.percent.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% das
                despesas
              </p>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}
