'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import {
  BOOKING_MAX_ADVANCE_DAYS,
  MONTHS,
  WEEKDAYS_SHORT,
} from '@/lib/constants';
import {
  addDaysISO,
  formatLocalDate,
  parseLocalDate,
  todayISO,
} from '@/lib/utils/date';
import type { PublicSettings } from '@/lib/booking/types';
import { StepTitle } from './ui';

interface DateStepProps {
  settings: PublicSettings | null;
  selected: string | null;
  onSelect: (date: string) => void;
}

export function DateStep({ settings, selected, onSelect }: DateStepProps) {
  const today = todayISO();
  const maxDate = addDaysISO(today, BOOKING_MAX_ADVANCE_DAYS);

  // Dias da semana abertos (0 = domingo). Sem configuração → não restringe.
  const openWeekdays = useMemo(() => {
    const hours = settings?.working_hours ?? [];
    if (hours.length === 0) return null;
    return new Set(hours.filter((h) => h.is_open).map((h) => h.weekday));
  }, [settings]);

  const isSelectable = (iso: string): boolean => {
    if (iso < today || iso > maxDate) return false;
    if (!openWeekdays) return true;
    return openWeekdays.has(parseLocalDate(iso).getDay());
  };

  // Chips rápidos: os próximos dias abertos, com rótulos amigáveis.
  const quickDays = useMemo(() => {
    const out: { iso: string; label: string }[] = [];
    for (let i = 0; i < 21 && out.length < 4; i++) {
      const iso = addDaysISO(today, i);
      if (!isSelectable(iso)) continue;
      const label =
        i === 0
          ? 'Hoje'
          : iso === addDaysISO(today, 1)
          ? 'Amanhã'
          : capitalizeWeekday(iso);
      out.push({ iso, label });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [today, maxDate, openWeekdays]);

  const initial = parseLocalDate(selected ?? today);
  const [view, setView] = useState({ year: initial.getFullYear(), month: initial.getMonth() });

  const grid = useMemo(() => buildMonthGrid(view.year, view.month), [view]);

  const canPrev = `${view.year}-${String(view.month + 1).padStart(2, '0')}` > today.slice(0, 7);
  const canNext =
    `${view.year}-${String(view.month + 1).padStart(2, '0')}` < maxDate.slice(0, 7);

  const shiftMonth = (delta: number) => {
    setView((v) => {
      const d = new Date(v.year, v.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  };

  return (
    <div className="animate-fade-in">
      <StepTitle title="Escolha uma data" subtitle="Selecione o melhor dia para você." />

      {/* Atalhos */}
      {quickDays.length > 0 && (
        <div className="mb-5 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {quickDays.map(({ iso, label }) => (
            <button
              key={iso}
              type="button"
              onClick={() => onSelect(iso)}
              className={cn(
                'flex min-w-[76px] shrink-0 flex-col items-center gap-0.5 rounded-2xl border px-4 py-3 transition-all active:scale-[0.98]',
                selected === iso
                  ? 'border-ink-900 bg-ink-900 text-white'
                  : 'border-ink-200 bg-white text-ink-900 hover:border-ink-300'
              )}
            >
              <span className="text-[11px] font-medium uppercase tracking-wide opacity-80">
                {label}
              </span>
              <span className="text-lg font-semibold leading-none">
                {parseLocalDate(iso).getDate()}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Calendário */}
      <div className="rounded-2xl border border-ink-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            disabled={!canPrev}
            aria-label="Mês anterior"
            className="flex h-9 w-9 items-center justify-center rounded-full text-ink-600 transition-colors hover:bg-ink-100 disabled:opacity-30"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="text-sm font-semibold text-ink-900">
            {MONTHS[view.month]} {view.year}
          </span>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            disabled={!canNext}
            aria-label="Próximo mês"
            className="flex h-9 w-9 items-center justify-center rounded-full text-ink-600 transition-colors hover:bg-ink-100 disabled:opacity-30"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-1 grid grid-cols-7 gap-1 text-center">
          {WEEKDAYS_SHORT.map((w) => (
            <span key={w} className="py-1 text-[11px] font-medium text-ink-400">
              {w}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {grid.map((iso, idx) => {
            if (!iso) return <span key={`blank-${idx}`} />;
            const day = parseLocalDate(iso).getDate();
            const selectable = isSelectable(iso);
            const isSelected = selected === iso;
            const isToday = iso === today;
            return (
              <button
                key={iso}
                type="button"
                disabled={!selectable}
                onClick={() => onSelect(iso)}
                className={cn(
                  'flex aspect-square items-center justify-center rounded-xl text-sm font-medium transition-all',
                  isSelected && 'bg-ink-900 text-white',
                  !isSelected && selectable && 'text-ink-900 hover:bg-ink-100 active:scale-95',
                  !isSelected && isToday && selectable && 'ring-1 ring-inset ring-ink-300',
                  !selectable && 'cursor-not-allowed text-ink-300 line-through'
                )}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function capitalizeWeekday(iso: string): string {
  const label = parseLocalDate(iso).toLocaleDateString('pt-BR', { weekday: 'short' });
  const clean = label.replace('.', '');
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

/** Grade do mês: posições nulas para o alinhamento inicial (domingo=0). */
function buildMonthGrid(year: number, month: number): (string | null)[] {
  const first = new Date(year, month, 1);
  const offset = first.getDay(); // 0 = domingo
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(formatLocalDate(new Date(year, month, d)));
  }
  return cells;
}
