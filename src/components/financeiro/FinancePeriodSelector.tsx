'use client';

import { useEffect, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import { cn } from '@/lib/utils/cn';
import { isValidISODate, type ISODate } from '@/lib/utils/date';
import { periodTitle, rangeLength, type PeriodMode, type PeriodRange } from '@/lib/data/finance';

const MODES: { mode: PeriodMode; label: string }[] = [
  { mode: 'day', label: 'Dia' },
  { mode: 'week', label: 'Semana' },
  { mode: 'month', label: 'Mês' },
];

interface Props {
  range: PeriodRange;
  today: ISODate;
  onModeChange: (mode: PeriodMode) => void;
  onShift: (step: number) => void;
  onToday: () => void;
  onPickDate: (iso: ISODate) => void;
  onCustom: (start: ISODate, end: ISODate) => void;
}

/**
 * Cabecalho do Financeiro: escolhe o periodo e navega por ele.
 *
 * Tudo abaixo dele responde a este estado — nao existe card mostrando um
 * periodo diferente do selecionado.
 */
export function FinancePeriodSelector({
  range,
  today,
  onModeChange,
  onShift,
  onToday,
  onPickDate,
  onCustom,
}: Props) {
  const [customOpen, setCustomOpen] = useState(false);
  const isCustom = range.mode === 'custom';

  // "Hoje" so aparece quando o periodo em foco nao contem o dia atual.
  const showToday = !(today >= range.start && today <= range.end);

  return (
    <div className="space-y-3">
      {/* Seletor de periodo — alvo grande, sempre visivel no topo. */}
      <div className="flex items-center gap-2">
        <div
          role="tablist"
          aria-label="Período"
          className="flex flex-1 items-center gap-1 rounded-2xl border border-ink-200 bg-white p-1 shadow-card"
        >
          {MODES.map((item) => {
            const active = range.mode === item.mode;
            return (
              <button
                key={item.mode}
                role="tab"
                aria-selected={active}
                onClick={() => onModeChange(item.mode)}
                className={cn(
                  'h-11 flex-1 rounded-xl text-sm font-semibold transition-colors',
                  active
                    ? 'bg-ink-950 text-white shadow-card'
                    : 'text-ink-600 hover:bg-ink-100 hover:text-ink-900'
                )}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => setCustomOpen(true)}
          aria-label="Selecionar período personalizado"
          className={cn(
            'flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-2xl border shadow-card transition-colors',
            isCustom
              ? 'border-ink-950 bg-ink-950 text-white'
              : 'border-ink-200 bg-white text-ink-600 hover:bg-ink-100 hover:text-ink-900'
          )}
        >
          <SlidersHorizontal className="h-5 w-5" />
        </button>
      </div>

      {/* Navegacao do periodo */}
      <div className="flex items-center gap-2 rounded-2xl border border-ink-200 bg-white p-1.5 shadow-card">
        <NavButton label="Período anterior" onClick={() => onShift(-1)}>
          <ChevronLeft className="h-5 w-5" />
        </NavButton>

        {/* O proprio titulo abre o calendario: no celular de 320px nao sobra
            espaco para um botao separado sem cortar a data. */}
        <div className="relative min-w-0 flex-1 text-center">
          <p className="flex items-center justify-center gap-1.5 text-sm font-semibold text-ink-900 sm:text-base">
            <span className="min-w-0 truncate">{periodTitle(range, today)}</span>
            <CalendarDays className="h-4 w-4 shrink-0 text-ink-400" />
          </p>
          <p className="truncate text-[11px] text-ink-500">
            {isCustom
              ? `${rangeLength(range)} dia(s) selecionado(s)`
              : range.mode === 'day'
                ? 'Toque para escolher a data'
                : range.mode === 'week'
                  ? 'Semana de segunda a domingo'
                  : 'Mês completo'}
          </p>
          <input
            type="date"
            aria-label="Escolher data do período"
            value={range.start}
            onChange={(e) => {
              if (isValidISODate(e.target.value)) onPickDate(e.target.value);
            }}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </div>

        <NavButton label="Próximo período" onClick={() => onShift(1)}>
          <ChevronRight className="h-5 w-5" />
        </NavButton>
      </div>

      {showToday && (
        <button
          onClick={onToday}
          className="mx-auto flex h-9 items-center gap-1.5 rounded-full border border-ink-200 bg-white px-4 text-xs font-semibold text-ink-700 shadow-card transition-colors hover:bg-ink-100"
        >
          <CalendarDays className="h-3.5 w-3.5" />
          Voltar para hoje
        </button>
      )}

      <CustomRangeSheet
        open={customOpen}
        range={range}
        onClose={() => setCustomOpen(false)}
        onApply={(start, end) => {
          onCustom(start, end);
          setCustomOpen(false);
        }}
      />
    </div>
  );
}

function NavButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-ink-600 transition-colors hover:bg-ink-100 hover:text-ink-900 active:bg-ink-200"
    >
      {children}
    </button>
  );
}

function CustomRangeSheet({
  open,
  range,
  onClose,
  onApply,
}: {
  open: boolean;
  range: PeriodRange;
  onClose: () => void;
  onApply: (start: ISODate, end: ISODate) => void;
}) {
  const [start, setStart] = useState<string>(range.start);
  const [end, setEnd] = useState<string>(range.end);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setStart(range.start);
    setEnd(range.end);
    setError(null);
  }, [open, range.start, range.end]);

  const apply = () => {
    if (!isValidISODate(start) || !isValidISODate(end)) {
      setError('Escolha as duas datas do período.');
      return;
    }
    // Datas invertidas sao aceitas e reordenadas pelo `buildRange`.
    onApply(start, end);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Período personalizado"
      footer={
        <>
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            Cancelar
          </Button>
          <Button className="flex-1" onClick={apply}>
            Aplicar período
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}
        <Field label="De">
          <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
        </Field>
        <Field label="Até">
          <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
        </Field>
        <p className="text-xs text-ink-500">
          O período pode atravessar semanas, meses e anos. A comparação usa automaticamente o
          intervalo anterior de mesma duração.
        </p>
      </div>
    </Modal>
  );
}
