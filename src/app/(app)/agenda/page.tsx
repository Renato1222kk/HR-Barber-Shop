'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays, Plus } from 'lucide-react';
import { useAsync } from '@/lib/hooks';
import { listAppointments } from '@/lib/data/repository';
import { cn } from '@/lib/utils/cn';
import { toISODate, formatCurrency } from '@/lib/utils/format';
import { WEEKDAYS, WEEKDAYS_SHORT, STATUS_META } from '@/lib/constants';
import { startOfWeek } from '@/lib/data/analytics';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { LoadingState, EmptyState, ErrorState } from '@/components/ui/Misc';
import { AppointmentCard } from '@/components/agenda/AppointmentCard';
import { AppointmentDetail } from '@/components/agenda/AppointmentDetail';
import { AppointmentModal } from '@/components/agenda/AppointmentModal';
import { useShell } from '@/components/layout/AppShell';
import type { Appointment } from '@/types';

type View = 'dia' | 'semana' | 'mes';

export default function AgendaPage() {
  const { openNewAppointment } = useShell();
  const [view, setView] = useState<View>('dia');
  const [cursor, setCursor] = useState(() => new Date());
  const [selected, setSelected] = useState<Appointment | null>(null);
  const [editing, setEditing] = useState<Appointment | null>(null);

  const { data, loading, error } = useAsync(() => listAppointments(), []);
  const appointments = data ?? [];

  const move = (dir: number) => {
    const d = new Date(cursor);
    if (view === 'dia') d.setDate(d.getDate() + dir);
    else if (view === 'semana') d.setDate(d.getDate() + dir * 7);
    else d.setMonth(d.getMonth() + dir);
    setCursor(d);
  };

  const label = useMemo(() => {
    if (view === 'dia')
      return cursor.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
    if (view === 'semana') {
      const s = startOfWeek(cursor);
      const e = new Date(s);
      e.setDate(s.getDate() + 6);
      return `${s.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} – ${e.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}`;
    }
    return cursor.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  }, [view, cursor]);

  const openEdit = (a: Appointment) => {
    setSelected(null);
    setEditing(a);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Toggle de visualizacao */}
      <div className="flex items-center justify-between gap-3">
        <div className="inline-flex rounded-xl border border-ink-700 bg-ink-850 p-1">
          {(['dia', 'semana', 'mes'] as View[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                'rounded-lg px-3.5 py-1.5 text-sm font-medium capitalize transition-colors',
                view === v ? 'bg-gold text-ink-950' : 'text-zinc-400 hover:text-white'
              )}
            >
              {v}
            </button>
          ))}
        </div>
        <Button onClick={() => openNewAppointment({ date: toISODate(cursor) })} className="hidden sm:inline-flex">
          <Plus className="h-4 w-4" />
          Novo
        </Button>
      </div>

      {/* Navegacao de periodo */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => move(-1)}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-ink-700 text-zinc-400 hover:bg-ink-800 hover:text-white"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="text-center">
          <p className="text-sm font-semibold capitalize text-white">{label}</p>
          <button onClick={() => setCursor(new Date())} className="text-xs text-gold hover:underline">
            Hoje
          </button>
        </div>
        <button
          onClick={() => move(1)}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-ink-700 text-zinc-400 hover:bg-ink-800 hover:text-white"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} />
      ) : view === 'dia' ? (
        <DayView date={cursor} appointments={appointments} onSelect={setSelected} onNew={() => openNewAppointment({ date: toISODate(cursor) })} />
      ) : view === 'semana' ? (
        <WeekView date={cursor} appointments={appointments} onSelect={setSelected} onPickDay={(d) => { setCursor(d); setView('dia'); }} />
      ) : (
        <MonthView date={cursor} appointments={appointments} onPickDay={(d) => { setCursor(d); setView('dia'); }} />
      )}

      <AppointmentDetail appointment={selected} onClose={() => setSelected(null)} onEdit={openEdit} />
      <AppointmentModal open={Boolean(editing)} appointment={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

// ---------------- DIA ----------------
function DayView({
  date,
  appointments,
  onSelect,
  onNew,
}: {
  date: Date;
  appointments: Appointment[];
  onSelect: (a: Appointment) => void;
  onNew: () => void;
}) {
  const iso = toISODate(date);
  const list = appointments
    .filter((a) => a.date === iso)
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

  const total = list
    .filter((a) => a.status === 'atendido')
    .reduce((s, a) => s + Number(a.price), 0);

  if (!list.length) {
    return (
      <EmptyState
        icon={CalendarDays}
        title="Dia livre"
        description="Nenhum agendamento para esta data."
        action={
          <Button onClick={onNew}>
            <Plus className="h-4 w-4" /> Novo agendamento
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1 text-xs text-zinc-500">
        <span>{list.length} agendamento(s)</span>
        <span>
          Realizado: <span className="font-semibold text-gold">{formatCurrency(total)}</span>
        </span>
      </div>
      {list.map((a) => (
        <AppointmentCard key={a.id} appointment={a} onClick={() => onSelect(a)} />
      ))}
    </div>
  );
}

// ---------------- SEMANA ----------------
function WeekView({
  date,
  appointments,
  onSelect,
  onPickDay,
}: {
  date: Date;
  appointments: Appointment[];
  onSelect: (a: Appointment) => void;
  onPickDay: (d: Date) => void;
}) {
  const start = startOfWeek(date);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
  const todayISO = toISODate(new Date());

  return (
    <div className="space-y-3">
      {days.map((d) => {
        const iso = toISODate(d);
        const list = appointments
          .filter((a) => a.date === iso)
          .sort((a, b) => a.start_time.localeCompare(b.start_time));
        const isToday = iso === todayISO;
        return (
          <Card key={iso} className="overflow-hidden">
            <button
              onClick={() => onPickDay(d)}
              className="flex w-full items-center justify-between border-b border-ink-700/60 px-4 py-2.5 text-left hover:bg-ink-800"
            >
              <span className={cn('text-sm font-semibold capitalize', isToday ? 'text-gold' : 'text-white')}>
                {WEEKDAYS[d.getDay()]} {d.getDate()}
              </span>
              <span className="text-xs text-zinc-500">{list.length} agend.</span>
            </button>
            {list.length > 0 && (
              <div className="space-y-1.5 p-2.5">
                {list.map((a) => (
                  <AppointmentCard key={a.id} appointment={a} compact onClick={() => onSelect(a)} />
                ))}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

// ---------------- MES ----------------
function MonthView({
  date,
  appointments,
  onPickDay,
}: {
  date: Date;
  appointments: Appointment[];
  onPickDay: (d: Date) => void;
}) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const first = new Date(year, month, 1);
  const startPad = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayISO = toISODate(new Date());

  const cells: (Date | null)[] = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const countByDay = useMemo(() => {
    const map: Record<string, Appointment[]> = {};
    appointments.forEach((a) => {
      (map[a.date] = map[a.date] || []).push(a);
    });
    return map;
  }, [appointments]);

  return (
    <Card className="p-3">
      <div className="mb-2 grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS_SHORT.map((w) => (
          <span key={w} className="py-1 text-[11px] font-medium text-zinc-500">
            {w}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (!d) return <div key={`e${i}`} />;
          const iso = toISODate(d);
          const list = countByDay[iso] ?? [];
          const isToday = iso === todayISO;
          // ate 3 pontinhos coloridos por status
          const dots = list.slice(0, 3);
          return (
            <button
              key={iso}
              onClick={() => onPickDay(d)}
              className={cn(
                'flex aspect-square flex-col items-center justify-start gap-1 rounded-lg border p-1 transition-colors',
                isToday
                  ? 'border-gold/60 bg-gold/10'
                  : 'border-transparent hover:border-ink-600 hover:bg-ink-800',
                list.length === 0 && 'opacity-60'
              )}
            >
              <span className={cn('text-xs font-medium', isToday ? 'text-gold' : 'text-zinc-300')}>
                {d.getDate()}
              </span>
              <div className="flex flex-wrap items-center justify-center gap-0.5">
                {dots.map((a) => (
                  <span
                    key={a.id}
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: STATUS_META[a.status].color }}
                  />
                ))}
                {list.length > 3 && (
                  <span className="text-[9px] leading-none text-zinc-500">+{list.length - 3}</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </Card>
  );
}
