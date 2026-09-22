'use client';

import { CalendarClock } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { formatDateLong } from '@/lib/utils/format';
import { timeToMinutes } from '@/lib/utils/date';
import { Button } from '@/components/ui/Button';
import { StepTitle, LoadingBlock, ErrorBlock } from './ui';

interface TimeStepProps {
  date: string;
  slots: string[];
  loading: boolean;
  error: string | null;
  nextAvailableDate: string | null;
  selected: string | null;
  onSelect: (time: string) => void;
  onGoToDate: (date: string) => void;
  onRetry: () => void;
}

const PERIODS: { label: string; from: number; to: number }[] = [
  { label: 'Manhã', from: 0, to: 12 * 60 },
  { label: 'Tarde', from: 12 * 60, to: 18 * 60 },
  { label: 'Noite', from: 18 * 60, to: 24 * 60 },
];

export function TimeStep({
  date,
  slots,
  loading,
  error,
  nextAvailableDate,
  selected,
  onSelect,
  onGoToDate,
  onRetry,
}: TimeStepProps) {
  return (
    <div className="animate-fade-in">
      <StepTitle
        title="Escolha seu horário"
        subtitle={capitalize(formatDateLong(date))}
      />

      {loading && <LoadingBlock label="Consultando horários disponíveis..." />}

      {!loading && error && (
        <ErrorBlock
          message={error}
          action={
            <Button size="sm" variant="secondary" onClick={onRetry}>
              Tentar novamente
            </Button>
          }
        />
      )}

      {!loading && !error && slots.length === 0 && (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-ink-300 bg-ink-50 px-6 py-12 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-100 text-ink-500">
            <CalendarClock className="h-6 w-6" />
          </span>
          <p className="text-sm text-ink-600">Nenhum horário disponível nesta data.</p>
          {nextAvailableDate && (
            <Button variant="secondary" onClick={() => onGoToDate(nextAvailableDate)}>
              Ver próximo dia disponível
            </Button>
          )}
        </div>
      )}

      {!loading && !error && slots.length > 0 && (
        <div className="space-y-5">
          {PERIODS.map((period) => {
            const inPeriod = slots.filter((t) => {
              const m = timeToMinutes(t);
              return m >= period.from && m < period.to;
            });
            if (inPeriod.length === 0) return null;
            return (
              <div key={period.label}>
                <h3 className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-ink-400">
                  {period.label}
                </h3>
                <div className="grid grid-cols-3 gap-2 xs:grid-cols-4">
                  {inPeriod.map((time) => {
                    const isSelected = selected === time;
                    return (
                      <button
                        key={time}
                        type="button"
                        onClick={() => onSelect(time)}
                        aria-pressed={isSelected}
                        className={cn(
                          'flex h-12 items-center justify-center rounded-xl border text-sm font-semibold transition-all active:scale-95',
                          isSelected
                            ? 'border-ink-900 bg-ink-900 text-white'
                            : 'border-ink-200 bg-white text-ink-900 hover:border-ink-400'
                        )}
                      >
                        {time}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
