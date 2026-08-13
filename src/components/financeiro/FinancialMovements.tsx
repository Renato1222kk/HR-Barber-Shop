'use client';

import { useMemo, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Pencil, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui/Button';
import { formatCurrency, formatDateFull, formatTime } from '@/lib/utils/format';
import { paymentMethodLabel } from '@/lib/constants';
import { Section, EmptyLine } from './FinanceSection';
import type { Movement } from '@/lib/data/finance';
import type { FinancialEntry } from '@/types';

type Tab = 'all' | 'income' | 'expense';

const TABS: { key: Tab; label: string }[] = [
  { key: 'all', label: 'Todas' },
  { key: 'income', label: 'Entradas' },
  { key: 'expense', label: 'Despesas' },
];

const PAGE = 20;

interface Props {
  movements: Movement[];
  onNew: () => void;
  onEditEntry: (entry: FinancialEntry) => void;
  onDeleteEntry: (entry: FinancialEntry) => void;
  onOpenDay?: (iso: string) => void;
}

/**
 * Extrato do periodo: lancamentos manuais e atendimentos concluidos na
 * mesma linha do tempo. Atendimento abre o dia; lancamento pode ser
 * editado ou excluido ali mesmo.
 */
export function FinancialMovements({
  movements,
  onNew,
  onEditEntry,
  onDeleteEntry,
  onOpenDay,
}: Props) {
  const [tab, setTab] = useState<Tab>('all');
  const [visible, setVisible] = useState(PAGE);

  const filtered = useMemo(
    () => (tab === 'all' ? movements : movements.filter((m) => m.type === tab)),
    [movements, tab]
  );

  const totals = useMemo(
    () => ({
      income: movements
        .filter((m) => m.type === 'income')
        .reduce((sum, m) => sum + m.amount, 0),
      expense: movements
        .filter((m) => m.type === 'expense')
        .reduce((sum, m) => sum + m.amount, 0),
    }),
    [movements]
  );

  return (
    <Section
      title="Movimentações"
      description="Entradas e saídas do período"
      action={
        <Button size="sm" variant="secondary" onClick={onNew}>
          <Plus className="h-4 w-4" />
          Nova
        </Button>
      }
    >
      <div className="mb-3 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-ink-200 bg-white p-3">
          <p className="text-xs text-ink-500">Entradas</p>
          <p className="mt-0.5 break-words text-base font-semibold text-green-600">
            {formatCurrency(totals.income)}
          </p>
        </div>
        <div className="rounded-xl border border-ink-200 bg-white p-3">
          <p className="text-xs text-ink-500">Saídas</p>
          <p className="mt-0.5 break-words text-base font-semibold text-red-600">
            {formatCurrency(totals.expense)}
          </p>
        </div>
      </div>

      <div className="mb-3 flex rounded-xl border border-ink-200 bg-white p-0.5">
        {TABS.map((item) => (
          <button
            key={item.key}
            onClick={() => {
              setTab(item.key);
              setVisible(PAGE);
            }}
            className={cn(
              'h-9 flex-1 rounded-lg text-xs font-semibold transition-colors',
              tab === item.key ? 'bg-ink-950 text-white' : 'text-ink-600 hover:bg-ink-100'
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyLine>Nenhuma movimentação neste período.</EmptyLine>
      ) : (
        <>
          <ul className="space-y-2">
            {filtered.slice(0, visible).map((movement) => (
              <MovementRow
                key={`${movement.source}-${movement.id}`}
                movement={movement}
                onEditEntry={onEditEntry}
                onDeleteEntry={onDeleteEntry}
                onOpenDay={onOpenDay}
              />
            ))}
          </ul>

          {filtered.length > visible && (
            <button
              onClick={() => setVisible((v) => v + PAGE)}
              className="mt-3 h-11 w-full rounded-xl border border-ink-200 text-sm font-semibold text-ink-700 transition-colors hover:bg-ink-100"
            >
              Ver mais ({filtered.length - visible})
            </button>
          )}
        </>
      )}
    </Section>
  );
}

function MovementRow({
  movement,
  onEditEntry,
  onDeleteEntry,
  onOpenDay,
}: {
  movement: Movement;
  onEditEntry: (entry: FinancialEntry) => void;
  onDeleteEntry: (entry: FinancialEntry) => void;
  onOpenDay?: (iso: string) => void;
}) {
  const income = movement.type === 'income';
  const isEntry = movement.source === 'entry';

  const details = [
    movement.categoryLabel,
    paymentMethodLabel(movement.paymentMethod),
    movement.time ? formatTime(movement.time) : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const body = (
    <div className="flex min-w-0 flex-1 items-center gap-3">
      <span
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
          income ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
        )}
      >
        {income ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink-900">{movement.description}</p>
        <p className="truncate text-xs text-ink-500">{details}</p>
        <p className="truncate text-xs text-ink-400">{formatDateFull(movement.date)}</p>
      </div>
      <span
        className={cn(
          'shrink-0 text-sm font-semibold tabular-nums',
          income ? 'text-green-600' : 'text-red-600'
        )}
      >
        {income ? '+' : '−'} {formatCurrency(movement.amount)}
      </span>
    </div>
  );

  return (
    <li className="flex items-center gap-2 rounded-xl border border-ink-200 bg-white p-3">
      {isEntry ? (
        <div className="flex min-w-0 flex-1 items-center">{body}</div>
      ) : (
        <button
          type="button"
          onClick={() => onOpenDay?.(movement.date)}
          className="flex min-w-0 flex-1 items-center rounded-lg text-left transition-colors active:bg-ink-50"
          aria-label={`Ver o dia de ${movement.description}`}
        >
          {body}
        </button>
      )}

      {isEntry && movement.entry && (
        <div className="flex shrink-0 flex-col gap-1">
          <button
            onClick={() => onEditEntry(movement.entry as FinancialEntry)}
            aria-label={`Editar ${movement.description}`}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-900"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDeleteEntry(movement.entry as FinancialEntry)}
            aria-label={`Excluir ${movement.description}`}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-500 transition-colors hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      )}
    </li>
  );
}
