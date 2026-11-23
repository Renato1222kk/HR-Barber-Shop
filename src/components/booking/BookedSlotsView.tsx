'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { CalendarDays, CalendarPlus, Check, Clock } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { BookingHeader } from './BookingHeader';
import { LogoMark } from '@/components/brand/Logo';
import { Button } from '@/components/ui/Button';
import { ErrorBlock } from './ui';
import { fetchBookedSlots } from '@/lib/booking/client';
import { BOOKING_MAX_ADVANCE_DAYS } from '@/lib/constants';
import { addDaysISO, isValidISODate, isValidTime, parseLocalDate, todayISO } from '@/lib/utils/date';
import { formatDateLong } from '@/lib/utils/format';
import { errorMessage } from '@/lib/utils/error';
import type { BookedSlot } from '@/lib/booking/types';

const QUICK_DAYS = 7;
const REFRESH_MS = 60_000;

/** Classes do link-botão principal (mesmo visual do Button primary/lg). */
const primaryLinkClass =
  'inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-ink-950 px-6 text-base font-semibold text-white shadow-card transition-colors hover:bg-ink-800 active:bg-ink-900';
const secondaryLinkClass =
  'inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-ink-200 bg-white px-4 text-sm font-medium text-ink-900 transition-colors hover:bg-ink-100 active:bg-ink-200';

/**
 * /horarios — lista pública dos horários já reservados de um dia.
 *
 * Só exibe horário e nome abreviado, que já chegam anonimizados da API.
 * O `highlight` da URL é apenas apresentação ("Seu horário"), nunca
 * autenticação.
 */
export function BookedSlotsView() {
  const router = useRouter();
  const params = useSearchParams();

  const today = todayISO();
  const maxDate = addDaysISO(today, BOOKING_MAX_ADVANCE_DAYS);

  const clampDate = useCallback(
    (value: string | null): string =>
      value && isValidISODate(value) && value >= today && value <= maxDate ? value : today,
    [today, maxDate]
  );

  const [date, setDate] = useState<string>(() => clampDate(params.get('date')));
  const [highlight, setHighlight] = useState<string | null>(() => {
    const h = params.get('highlight');
    return h && isValidTime(h) ? h : null;
  });
  const highlightDate = useRef<string>(clampDate(params.get('date')));

  const [slots, setSlots] = useState<BookedSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const load = useCallback(async (day: string, silent = false) => {
    const id = ++requestId.current;
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const data = await fetchBookedSlots(day);
      if (id !== requestId.current) return; // resposta de um dia antigo
      setSlots(data.appointments);
      setError(null);
    } catch (e) {
      if (id !== requestId.current) return;
      if (!silent) {
        setSlots([]);
        setError(errorMessage(e, 'Não foi possível carregar os horários. Tente novamente.'));
      }
    } finally {
      if (id === requestId.current && !silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(date);
  }, [date, load]);

  // Mantém a lista fresca: ao voltar para a aba e a cada minuto.
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'visible') load(date, true);
    };
    document.addEventListener('visibilitychange', refresh);
    const timer = window.setInterval(refresh, REFRESH_MS);
    return () => {
      document.removeEventListener('visibilitychange', refresh);
      window.clearInterval(timer);
    };
  }, [date, load]);

  const selectDate = (day: string) => {
    const next = clampDate(day);
    setDate(next);
    // O destaque só vale para o dia do agendamento.
    const keep = highlight && next === highlightDate.current ? highlight : null;
    if (!keep) setHighlight(null);
    const qs = new URLSearchParams({ date: next });
    if (keep) qs.set('highlight', keep);
    router.replace(`/horarios?${qs.toString()}`, { scroll: false });
  };

  // Rola até o horário destacado quando ele aparece.
  const highlightRef = useRef<HTMLLIElement | null>(null);
  useEffect(() => {
    if (!loading && highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [loading, slots]);

  const quickDays = useMemo(() => {
    return Array.from({ length: QUICK_DAYS }, (_, i) => {
      const iso = addDaysISO(today, i);
      const label = i === 0 ? 'Hoje' : i === 1 ? 'Amanhã' : weekdayShort(iso);
      return { iso, label, day: parseLocalDate(iso).getDate() };
    });
  }, [today]);

  const isQuick = quickDays.some((d) => d.iso === date);
  const highlightFound = highlight !== null && slots.some((s) => s.startTime === highlight);

  return (
    <div className="flex min-h-dvh flex-col">
      <BookingHeader businessName="HR Barber Shop" current={0} showBack={false} onBack={() => {}} />

      <main className="flex-1">
        <div className="mx-auto w-full max-w-[640px] px-4 py-6 sm:px-6">
          {/* Hero */}
          <div className="mb-6 flex flex-col items-center text-center">
            <LogoMark size="lg" priority className="mb-4 shadow-soft" />
            <h1 className="text-2xl font-semibold tracking-tight text-ink-900 sm:text-3xl">
              Horários marcados
            </h1>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink-500">
              Confira os horários já reservados.
            </p>
          </div>

          {/* Seletor de data */}
          <div className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:-mx-6 sm:px-6 [&::-webkit-scrollbar]:hidden">
            {quickDays.map(({ iso, label, day }) => (
              <button
                key={iso}
                type="button"
                onClick={() => selectDate(iso)}
                aria-pressed={date === iso}
                className={cn(
                  'flex min-h-[56px] min-w-[72px] shrink-0 flex-col items-center justify-center gap-0.5 rounded-2xl border px-3 py-2 transition-all active:scale-[0.98]',
                  date === iso
                    ? 'border-ink-900 bg-ink-900 text-white'
                    : 'border-ink-200 bg-white text-ink-900 hover:border-ink-300'
                )}
              >
                <span className="text-[11px] font-medium uppercase tracking-wide opacity-80">
                  {label}
                </span>
                <span className="text-lg font-semibold leading-none">{day}</span>
              </button>
            ))}
          </div>

          {/* Outra data (calendário nativo do celular) */}
          <label
            className={cn(
              'relative mb-6 flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border text-sm font-medium transition-colors',
              isQuick
                ? 'border-ink-200 bg-white text-ink-700 hover:bg-ink-50'
                : 'border-ink-900 bg-ink-50 text-ink-900'
            )}
          >
            <CalendarDays className="h-4 w-4" />
            {isQuick ? 'Escolher outra data' : capitalize(formatDateLong(date))}
            <input
              type="date"
              aria-label="Escolher outra data"
              min={today}
              max={maxDate}
              value={date}
              onChange={(e) => e.target.value && selectDate(e.target.value)}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
          </label>

          {/* Dia selecionado */}
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 className="text-base font-semibold text-ink-900">
              {capitalize(formatDateLong(date))}
            </h2>
            {!loading && !error && slots.length > 0 && (
              <span className="shrink-0 text-xs text-ink-400">
                {slots.length} {slots.length === 1 ? 'horário' : 'horários'}
              </span>
            )}
          </div>

          {highlight && !loading && !error && highlightFound && (
            <div className="mb-4 flex items-center gap-2.5 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 animate-fade-in">
              <Check className="h-4 w-4 shrink-0" strokeWidth={2.5} />
              Seu horário das {highlight} está na agenda.
            </div>
          )}

          {loading && <SlotsSkeleton />}

          {!loading && error && (
            <ErrorBlock
              message={error}
              action={
                <Button size="sm" variant="secondary" onClick={() => load(date)}>
                  Tentar novamente
                </Button>
              }
            />
          )}

          {!loading && !error && slots.length === 0 && (
            <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-ink-300 bg-ink-50 px-6 py-12 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-100 text-ink-500">
                <Clock className="h-6 w-6" />
              </span>
              <p className="text-sm text-ink-600">Nenhum horário marcado para este dia.</p>
              <Link href="/agendar" className={secondaryLinkClass}>
                <CalendarPlus className="h-4 w-4" />
                Agendar um horário
              </Link>
            </div>
          )}

          {!loading && !error && slots.length > 0 && (
            <ul className="space-y-2.5">
              {slots.map((slot) => {
                const mine = highlight !== null && slot.startTime === highlight;
                return (
                  <li
                    key={`${slot.startTime}-${slot.endTime}-${slot.displayName}`}
                    ref={mine ? highlightRef : undefined}
                    className={cn(
                      'flex min-h-[64px] items-center gap-4 rounded-2xl border px-4 py-3 transition-colors',
                      mine
                        ? 'border-green-500 bg-green-50 ring-2 ring-green-500/30'
                        : 'border-ink-200 bg-white'
                    )}
                  >
                    <div className="w-[88px] shrink-0">
                      <p className="text-lg font-semibold leading-tight tabular-nums text-ink-900">
                        {slot.startTime}
                      </p>
                      <p className="text-xs tabular-nums text-ink-400">até {slot.endTime}</p>
                    </div>
                    <p className="min-w-0 flex-1 truncate text-[15px] font-medium text-ink-800">
                      {slot.displayName}
                    </p>
                    {mine && (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-green-600 px-2.5 py-1 text-xs font-semibold text-white">
                        <Check className="h-3.5 w-3.5" strokeWidth={3} />
                        Seu horário
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          <p className="mt-6 text-center text-xs leading-relaxed text-ink-400">
            Para sua privacidade, mostramos apenas o primeiro nome e a inicial do sobrenome.
          </p>

          <div className="sticky bottom-0 z-10 -mx-4 mt-6 border-t border-ink-100 bg-white/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-white/80 sm:-mx-6 sm:px-6">
            <Link href="/agendar" className={primaryLinkClass}>
              <CalendarPlus className="h-4 w-4" />
              Agendar horário
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

function SlotsSkeleton() {
  return (
    <ul className="space-y-2.5" aria-label="Carregando horários" aria-busy>
      {[0, 1, 2, 3].map((i) => (
        <li
          key={i}
          className="flex min-h-[64px] items-center gap-4 rounded-2xl border border-ink-100 bg-white px-4 py-3"
        >
          <div className="w-[88px] shrink-0 space-y-1.5">
            <div className="h-5 w-14 animate-pulse rounded bg-ink-100" />
            <div className="h-3 w-12 animate-pulse rounded bg-ink-100" />
          </div>
          <div className="h-4 w-28 animate-pulse rounded bg-ink-100" />
        </li>
      ))}
    </ul>
  );
}

function weekdayShort(iso: string): string {
  const label = parseLocalDate(iso).toLocaleDateString('pt-BR', { weekday: 'short' });
  const clean = label.replace('.', '');
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
