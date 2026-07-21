'use client';

import { Repeat, CalendarRange } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { Field, Input, Select } from '@/components/ui/Field';
import { Toggle } from '@/components/ui/Misc';
import { WEEKDAYS_SHORT } from '@/lib/constants';
import { formatDateFull, formatTime } from '@/lib/utils/format';
import type { RecurrenceConfig, RecurringSlot } from '@/types';

// Ordem de exibicao: Segunda -> Domingo (valores getDay).
const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

interface Props {
  enabled: boolean;
  onToggle: (v: boolean) => void;
  config: RecurrenceConfig;
  onChange: (patch: Partial<RecurrenceConfig>) => void;
  preview: RecurringSlot[];
}

export function RecurrenceSection({ enabled, onToggle, config, onChange, preview }: Props) {
  const toggleWeekday = (wd: number) => {
    const set = new Set(config.selectedWeekdays);
    if (set.has(wd)) set.delete(wd);
    else set.add(wd);
    onChange({ selectedWeekdays: Array.from(set).sort((a, b) => a - b) });
  };

  return (
    <div className="rounded-2xl border border-ink-700/70 bg-ink-900/60 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold/15 text-gold">
            <Repeat className="h-4.5 w-4.5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Agendamento recorrente</p>
            <p className="text-xs text-zinc-500">Repetir este agendamento</p>
          </div>
        </div>
        <Toggle checked={enabled} onChange={onToggle} />
      </div>

      {enabled && (
        <div className="mt-4 space-y-4 animate-fade-in">
          {/* Frequencia */}
          <Field label="Frequência">
            <Select
              value={config.frequency}
              onChange={(e) => onChange({ frequency: e.target.value as RecurrenceConfig['frequency'] })}
            >
              <option value="weekly">Toda semana</option>
              <option value="biweekly">A cada 2 semanas</option>
              <option value="monthly">Todo mês</option>
              <option value="custom">Personalizado</option>
            </Select>
          </Field>

          {config.frequency === 'custom' && (
            <Field label="Repetir a cada (semanas)">
              <Input
                type="number"
                min={1}
                max={12}
                value={config.intervalWeeks}
                onChange={(e) => onChange({ intervalWeeks: Math.max(1, Number(e.target.value) || 1) })}
              />
            </Field>
          )}

          {/* Dias da semana (oculto no mensal) */}
          {config.frequency !== 'monthly' && (
            <div>
              <p className="mb-1.5 text-xs font-medium text-zinc-400">Dias da semana</p>
              <div className="grid grid-cols-7 gap-1.5">
                {WEEKDAY_ORDER.map((wd) => {
                  const active = config.selectedWeekdays.includes(wd);
                  return (
                    <button
                      key={wd}
                      type="button"
                      onClick={() => toggleWeekday(wd)}
                      className={cn(
                        'flex h-11 items-center justify-center rounded-lg border text-xs font-semibold transition-colors',
                        active
                          ? 'border-gold bg-gold text-ink-950'
                          : 'border-ink-600 bg-ink-850 text-zinc-400 hover:border-ink-500 hover:text-white'
                      )}
                    >
                      {WEEKDAYS_SHORT[wd]}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Terminar recorrência */}
          <div>
            <p className="mb-1.5 text-xs font-medium text-zinc-400">Terminar recorrência</p>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => onChange({ endMode: 'date' })}
                className={cn(
                  'h-11 rounded-lg border text-sm font-medium transition-colors',
                  config.endMode === 'date'
                    ? 'border-gold bg-gold/10 text-gold'
                    : 'border-ink-600 text-zinc-400 hover:text-white'
                )}
              >
                Em uma data
              </button>
              <button
                type="button"
                onClick={() => onChange({ endMode: 'count' })}
                className={cn(
                  'h-11 rounded-lg border text-sm font-medium transition-colors',
                  config.endMode === 'count'
                    ? 'border-gold bg-gold/10 text-gold'
                    : 'border-ink-600 text-zinc-400 hover:text-white'
                )}
              >
                Após X vezes
              </button>
            </div>

            <div className="mt-3">
              {config.endMode === 'date' ? (
                <Field label="Data final">
                  <Input
                    type="date"
                    value={config.endDate ?? ''}
                    onChange={(e) => onChange({ endDate: e.target.value || null })}
                  />
                </Field>
              ) : (
                <Field label="Quantidade de ocorrências">
                  <Input
                    type="number"
                    min={1}
                    max={366}
                    value={config.occurrencesCount ?? 1}
                    onChange={(e) =>
                      onChange({ occurrencesCount: Math.max(1, Number(e.target.value) || 1) })
                    }
                  />
                </Field>
              )}
            </div>
          </div>

          {/* Preview */}
          <RecurrencePreview preview={preview} />
        </div>
      )}
    </div>
  );
}

function RecurrencePreview({ preview }: { preview: RecurringSlot[] }) {
  if (preview.length === 0) {
    return (
      <div className="rounded-xl border border-ink-700 bg-ink-850 px-4 py-3 text-sm text-zinc-500">
        Selecione os dias e o término para gerar a prévia.
      </div>
    );
  }

  const first = preview.slice(0, 5);
  const rest = preview.length - first.length;

  return (
    <div className="rounded-xl border border-gold/25 bg-gold/5 p-4">
      <p className="flex items-center gap-2 text-sm font-semibold text-gold">
        <CalendarRange className="h-4 w-4" />
        Serão criados {preview.length} agendamento(s) recorrente(s).
      </p>
      <ul className="mt-2.5 space-y-1">
        {first.map((s, i) => (
          <li key={`${s.date}-${i}`} className="flex items-center gap-2 text-sm text-zinc-300">
            <span className="h-1.5 w-1.5 rounded-full bg-gold" />
            {formatDateFull(s.date)} às {formatTime(s.time)}
          </li>
        ))}
      </ul>
      {rest > 0 && <p className="mt-2 text-xs text-zinc-500">+ {rest} agendamento(s)</p>}
    </div>
  );
}
