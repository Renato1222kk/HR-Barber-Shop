'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import type { DatesSetArg } from '@fullcalendar/core';

import { listAppointments, rescheduleAppointment } from '@/services';
import { onDataChanged, emitDataChanged } from '@/lib/events';
import { cn } from '@/lib/utils/cn';
import { capitalize } from '@/lib/utils/format';
import { errorMessage } from '@/lib/utils/error';
import { todayISO, type ISODate, type HHmm } from '@/lib/utils/date';
import { STATUS_META, STATUS_ORDER } from '@/lib/constants';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input, Select } from '@/components/ui/Field';
import { LoadingState, ErrorState } from '@/components/ui/Misc';
import { AppointmentDetail } from '@/components/agenda/AppointmentDetail';
import { AppointmentModal } from '@/components/agenda/AppointmentModal';
import { useShell } from '@/components/layout/AppShell';
import type {
  AgendaCalendarHandle,
  AgendaView,
  RescheduleRequest,
} from '@/components/agenda/AgendaCalendar';
import type { Appointment, AppointmentStatus } from '@/types';

// O FullCalendar toca em `window` ao montar, entao fica fora do render do
// servidor. Assim a biblioteca tambem so e baixada nesta pagina.
const AgendaCalendar = dynamic(
  () => import('@/components/agenda/AgendaCalendar').then((m) => m.AgendaCalendar),
  { ssr: false, loading: () => <CalendarSkeleton /> }
);

const VIEW_STORAGE_KEY = 'hr-barber:agenda-view';
const VIEWS: { id: AgendaView; label: string }[] = [
  { id: 'dia', label: 'Dia' },
  { id: 'semana', label: 'Semana' },
  { id: 'mes', label: 'Mês' },
];

/** Intervalo da grade, em minutos. */
const SLOT_MINUTES = 30;

function isAgendaView(value: unknown): value is AgendaView {
  return value === 'dia' || value === 'semana' || value === 'mes';
}

/**
 * Visualizacao inicial: Semana no desktop, Dia no celular. A ultima
 * escolha do usuario vale mais e fica guardada apenas como preferencia
 * visual — nenhum agendamento e gravado no navegador.
 */
function resolveInitialView(): AgendaView {
  try {
    const saved = window.localStorage.getItem(VIEW_STORAGE_KEY);
    if (isAgendaView(saved)) return saved;
  } catch {
    // Navegacao privada pode bloquear o localStorage; seguimos sem ele.
  }
  return window.matchMedia('(min-width: 768px)').matches ? 'semana' : 'dia';
}

export default function AgendaPage() {
  const { openNewAppointment } = useShell();
  // Preenchido pelo `onReady` do calendario (ver a nota sobre `next/dynamic`
  // em AgendaCalendar: um `ref` nao chegaria ao componente real).
  const calendar = useRef<AgendaCalendarHandle | null>(null);
  const handleCalendarReady = useCallback((handle: AgendaCalendarHandle | null) => {
    calendar.current = handle;
  }, []);

  // `null` ate o navegador responder qual e a visualizacao certa. O
  // calendario so monta no cliente, entao nao ha risco de hidratacao.
  const [view, setView] = useState<AgendaView | null>(null);
  const [title, setTitle] = useState('');

  const [selected, setSelected] = useState<Appointment | null>(null);
  const [editing, setEditing] = useState<Appointment | null>(null);
  const [toast, setToast] = useState<{ kind: 'ok' | 'erro'; text: string } | null>(null);

  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<AppointmentStatus | ''>('');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const { data, loading, error } = useAppointments();

  useEffect(() => {
    setView(resolveInitialView());
  }, []);

  const changeView = useCallback((next: AgendaView) => {
    setView(next);
    try {
      window.localStorage.setItem(VIEW_STORAGE_KEY, next);
    } catch {
      // Preferencia e opcional: falhar aqui nao pode quebrar a agenda.
    }
  }, []);

  const notify = useCallback((kind: 'ok' | 'erro', text: string) => {
    setToast({ kind, text });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(t);
  }, [toast]);

  const appointments = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data ?? []).filter((a) => {
      if (status && a.status !== status) return false;
      if (q && !a.client_name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [data, query, status]);

  const activeFilters = (status ? 1 : 0) + (query.trim() ? 1 : 0);

  const handleRangeChange = useCallback((arg: DatesSetArg) => {
    setTitle(capitalize(arg.view.title));
  }, []);

  // Clique em um espaco vazio: o modal abre ja com a data da coluna e o
  // horario da linha. Nenhuma conversao acontece no caminho.
  const handleSelectSlot = useCallback(
    (date: ISODate, time: HHmm) => openNewAppointment({ date, time }),
    [openNewAppointment]
  );

  const handlePickDay = useCallback(
    (date: ISODate) => {
      // Primeiro o calendario, depois o estado: `showDay` ja deixa a vista
      // em Dia, e o efeito de troca de visualizacao encontra tudo no lugar
      // e nao reancora a data.
      calendar.current?.showDay(date);
      changeView('dia');
    },
    [changeView]
  );

  /**
   * Arraste e redimensionamento. O card ja se moveu na tela; se o Supabase
   * recusar, `revert()` devolve o card para a data e o horario anteriores,
   * de modo que a agenda nunca mostre algo diferente do banco.
   */
  const handleReschedule = useCallback(
    async ({ appointment, date, startTime, durationMinutes, revert }: RescheduleRequest) => {
      if (durationMinutes <= 0) {
        revert();
        notify('erro', 'O término precisa ser depois do início.');
        return;
      }
      try {
        await rescheduleAppointment(appointment.id, {
          date,
          start_time: startTime,
          duration_minutes: durationMinutes,
        });
        emitDataChanged();
        notify('ok', `${appointment.client_name} · ${formatMoment(date, startTime)}`);
      } catch (e) {
        revert();
        notify('erro', errorMessage(e, 'Não foi possível mover o agendamento.'));
      }
    },
    [notify]
  );

  const openEdit = (a: Appointment) => {
    setSelected(null);
    setEditing(a);
  };

  return (
    <div className="animate-fade-in space-y-3">
      {/* ---------- Controles ---------- */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <button
            onClick={() => calendar.current?.prev()}
            aria-label="Período anterior"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-900"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => calendar.current?.today()}
            className="rounded-lg border border-ink-200 px-3 py-1.5 text-sm font-medium text-ink-700 transition-colors hover:bg-ink-50 hover:text-ink-900"
          >
            Hoje
          </button>
          <button
            onClick={() => calendar.current?.next()}
            aria-label="Próximo período"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-900"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <h2 className="order-last w-full truncate text-lg font-semibold tracking-tight text-ink-900 sm:order-none sm:w-auto sm:flex-1">
          {title}
        </h2>

        <div className="ml-auto flex items-center gap-2 sm:ml-0">
          <div className="inline-flex rounded-lg bg-ink-100 p-0.5">
            {VIEWS.map((v) => (
              <button
                key={v.id}
                onClick={() => changeView(v.id)}
                className={cn(
                  'rounded-[6px] px-3 py-1.5 text-sm font-medium transition-colors',
                  view === v.id
                    ? 'bg-white text-ink-900 shadow-sm'
                    : 'text-ink-600 hover:text-ink-900'
                )}
              >
                {v.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => setFiltersOpen((o) => !o)}
            aria-expanded={filtersOpen}
            aria-label="Filtros"
            className={cn(
              'relative flex h-9 w-9 items-center justify-center rounded-lg border transition-colors',
              filtersOpen || activeFilters
                ? 'border-ink-900 bg-ink-900 text-white'
                : 'border-ink-200 text-ink-600 hover:bg-ink-50 hover:text-ink-900'
            )}
          >
            <SlidersHorizontal className="h-[17px] w-[17px]" />
            {activeFilters > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-gold-600 text-[10px] font-semibold text-white ring-2 ring-white">
                {activeFilters}
              </span>
            )}
          </button>

          <Button onClick={() => openNewAppointment({ date: todayISO() })}>
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Novo</span>
          </Button>
        </div>
      </div>

      {/* ---------- Filtros ---------- */}
      {filtersOpen && (
        <Card className="animate-fade-in space-y-3 p-3.5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
            <Input
              placeholder="Pesquisar cliente"
              className="pl-10"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value as AppointmentStatus | '')}
          >
            <option value="">Todos os status</option>
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {STATUS_META[s].label}
              </option>
            ))}
          </Select>
          {activeFilters > 0 && (
            <button
              onClick={() => {
                setQuery('');
                setStatus('');
              }}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-700 hover:text-ink-900 hover:underline"
            >
              <X className="h-3.5 w-3.5" /> Limpar filtros
            </button>
          )}
        </Card>
      )}

      {/* ---------- Calendario ---------- */}
      {error ? (
        <ErrorState message={error} />
      ) : (
        <div className="relative h-[calc(100dvh-15rem)] min-h-[26rem] lg:h-[calc(100dvh-13rem)]">
          {view ? (
            <AgendaCalendar
              appointments={appointments}
              view={view}
              slotMinutes={SLOT_MINUTES}
              onReady={handleCalendarReady}
              onSelectSlot={handleSelectSlot}
              onSelectAppointment={setSelected}
              onPickDay={handlePickDay}
              onReschedule={handleReschedule}
              onRangeChange={handleRangeChange}
            />
          ) : (
            <CalendarSkeleton />
          )}
          {loading && !data && (
            <div className="absolute inset-0 grid place-items-center rounded-2xl bg-white/70">
              <LoadingState />
            </div>
          )}
        </div>
      )}

      <p className="px-1 text-center text-[11px] text-ink-500">
        Toque em um horário para agendar · arraste um card para remarcar · use a borda inferior
        para mudar o término
      </p>

      {/* ---------- Aviso discreto ---------- */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed inset-x-0 bottom-24 z-[60] flex justify-center px-4 lg:bottom-8"
        >
          <div
            className={cn(
              'flex max-w-md animate-fade-in items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium shadow-soft',
              toast.kind === 'ok'
                ? 'bg-ink-900 text-white'
                : 'border border-red-200 bg-red-50 text-red-700'
            )}
          >
            {toast.kind === 'ok' && <Check className="h-4 w-4 shrink-0" />}
            <span>{toast.text}</span>
          </div>
        </div>
      )}

      <AppointmentDetail
        appointment={selected}
        onClose={() => setSelected(null)}
        onEdit={openEdit}
      />
      <AppointmentModal
        open={Boolean(editing)}
        appointment={editing}
        onClose={() => setEditing(null)}
      />
    </div>
  );
}

/**
 * Carrega os agendamentos e recarrega quando algo muda.
 *
 * Os avisos de mudanca sao agrupados: uma gravacao dispara o evento local
 * e, logo depois, o eco do Realtime. Sem essa janela, o mesmo movimento
 * geraria duas consultas ao Supabase.
 */
function useAppointments() {
  const [data, setData] = useState<Appointment[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Descarta a resposta de uma consulta que ja foi substituida por outra.
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    try {
      const rows = await listAppointments();
      if (id !== requestId.current) return;
      setData(rows);
      setError(null);
    } catch (e) {
      if (id !== requestId.current) return;
      setError(errorMessage(e, 'Erro ao carregar os agendamentos.'));
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    let timer: number | undefined;
    const unsubscribe = onDataChanged(() => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => void load(), 250);
    });
    return () => {
      window.clearTimeout(timer);
      unsubscribe();
    };
  }, [load]);

  return { data, loading, error };
}

function formatMoment(date: ISODate, time: HHmm): string {
  const label = new Date(`${date}T12:00:00`).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  });
  return `${label} às ${time}`;
}

function CalendarSkeleton() {
  return (
    <div className="h-full animate-pulse rounded-2xl border border-ink-200 bg-white">
      <div className="h-11 rounded-t-2xl border-b border-ink-200 bg-ink-50" />
      <div className="space-y-px p-3">
        {Array.from({ length: 9 }, (_, i) => (
          <div key={i} className="h-10 rounded bg-ink-50" />
        ))}
      </div>
    </div>
  );
}
