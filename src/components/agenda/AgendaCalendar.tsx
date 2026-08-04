'use client';

import { useEffect, useMemo, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import ptBrLocale from '@fullcalendar/core/locales/pt-br';
import type {
  EventClickArg,
  EventContentArg,
  EventDropArg,
  EventInput,
  DatesSetArg,
} from '@fullcalendar/core';
import type { DateClickArg, EventResizeDoneArg } from '@fullcalendar/interaction';

import { STATUS_META } from '@/lib/constants';
import { formatCurrency } from '@/lib/utils/format';
import {
  combineDateAndTime,
  durationBetween,
  formatLocalDate,
  parseLocalDate,
  splitDateAndTime,
  type HHmm,
  type ISODate,
} from '@/lib/utils/date';
import type { Appointment } from '@/types';
import './agenda-calendar.css';

export type AgendaView = 'dia' | 'semana' | 'mes';

/** Nome interno de cada visualizacao no FullCalendar. */
const FC_VIEW: Record<AgendaView, string> = {
  dia: 'timeGridDay',
  semana: 'timeGridWeek',
  mes: 'dayGridMonth',
};

/** Movimento pedido por um arraste ou por um redimensionamento. */
export interface RescheduleRequest {
  appointment: Appointment;
  date: ISODate;
  startTime: HHmm;
  durationMinutes: number;
  /** Desfaz o movimento na tela quando o Supabase recusa a gravacao. */
  revert: () => void;
}

export interface AgendaCalendarHandle {
  today: () => void;
  prev: () => void;
  next: () => void;
  /**
   * Abre a visualizacao Dia em uma data. Troca a vista e posiciona a data
   * na mesma chamada — em dois passos, o efeito de troca de visualizacao
   * rodaria depois e reancoraria o calendario em hoje.
   */
  showDay: (date: ISODate) => void;
}

interface Props {
  appointments: Appointment[];
  view: AgendaView;
  /** Intervalo da grade, vindo das configuracoes da barbearia. */
  slotMinutes: number;
  /**
   * Entrega os comandos de navegacao para a pagina.
   *
   * E um callback, e nao um `ref`: o componente chega via `next/dynamic`,
   * que envolve o original em um wrapper sem `forwardRef` — um `ref`
   * ficaria sempre nulo e os botoes Hoje / anterior / proximo nao fariam
   * nada.
   */
  onReady: (handle: AgendaCalendarHandle | null) => void;
  onSelectSlot: (date: ISODate, time: HHmm) => void;
  onSelectAppointment: (appointment: Appointment) => void;
  onPickDay: (date: ISODate) => void;
  onReschedule: (request: RescheduleRequest) => void;
  onRangeChange: (arg: DatesSetArg) => void;
}

/** Faixa de horarios visivel. Cobre a jornada da barbearia com folga. */
const SLOT_MIN_TIME = '07:00:00';
const SLOT_MAX_TIME = '22:00:00';

function toEvent(a: Appointment): EventInput {
  const meta = STATUS_META[a.status];
  return {
    id: a.id,
    title: a.client_name,
    start: combineDateAndTime(a.date, a.start_time),
    end: combineDateAndTime(a.date, a.end_time),
    // Um cancelado fica visivel, mas nao pode ser movido por engano.
    editable: a.status !== 'cancelado',
    backgroundColor: meta.color,
    borderColor: meta.color,
    extendedProps: { appointment: a },
  };
}

function eventAppointment(event: { extendedProps: Record<string, unknown> }): Appointment {
  return event.extendedProps.appointment as Appointment;
}

export function AgendaCalendar({
  appointments,
  view,
  slotMinutes,
  onReady,
  onSelectSlot,
  onSelectAppointment,
  onPickDay,
  onReschedule,
  onRangeChange,
}: Props) {
  const calendarRef = useRef<FullCalendar>(null);

  // O handle e estavel; cada metodo le a instancia no momento da chamada.
  const handle = useMemo<AgendaCalendarHandle>(
    () => ({
      today: () => calendarRef.current?.getApi().today(),
      prev: () => calendarRef.current?.getApi().prev(),
      next: () => calendarRef.current?.getApi().next(),
      showDay: (date: ISODate) =>
        calendarRef.current?.getApi().changeView(FC_VIEW.dia, parseLocalDate(date)),
    }),
    []
  );

  useEffect(() => {
    onReady(handle);
    return () => onReady(null);
  }, [onReady, handle]);

  /**
   * Troca de visualizacao mantendo o periodo em foco.
   *
   * Quando hoje esta dentro do periodo exibido, a ancora passa a ser hoje.
   * Sem isso, sair do Mes para o Dia cairia sempre no dia 1 — o inicio do
   * intervalo —, o que surpreende quem esta olhando o mes corrente.
   */
  useEffect(() => {
    const api = calendarRef.current?.getApi();
    if (!api || api.view.type === FC_VIEW[view]) return;
    const now = new Date();
    const dentroDoPeriodo = now >= api.view.currentStart && now < api.view.currentEnd;
    api.changeView(FC_VIEW[view], dentroDoPeriodo ? now : api.view.currentStart);
  }, [view]);

  const events = useMemo(() => appointments.map(toEvent), [appointments]);

  /**
   * Clique ou toque em um espaco vazio.
   *
   * E `dateClick`, e nao `select`: em timeGrid um clique simples nao gera
   * selecao de intervalo, entao `select` so dispararia se o usuario
   * arrastasse. `dateClick` cobre clique e toque nas tres visualizacoes.
   */
  const handleDateClick = (arg: DateClickArg) => {
    // No mes, tocar em um dia leva para a visualizacao diaria daquele dia.
    if (arg.view.type === 'dayGridMonth') {
      onPickDay(formatLocalDate(arg.date));
      return;
    }

    // Na semana, a data e exatamente a da coluna tocada — ela vem do
    // proprio `Date` local do slot, sem nenhuma conversao de fuso.
    const { date, time } = splitDateAndTime(arg.date);
    onSelectSlot(date, time);
  };

  const handleEventClick = (arg: EventClickArg) => {
    onSelectAppointment(eventAppointment(arg.event));
  };

  // Arraste: muda data e/ou horario, preservando a duracao original.
  const handleEventDrop = (arg: EventDropArg) => {
    if (!arg.event.start) {
      arg.revert();
      return;
    }
    const appointment = eventAppointment(arg.event);
    const { date, time } = splitDateAndTime(arg.event.start);
    onReschedule({
      appointment,
      date,
      startTime: time,
      durationMinutes: appointment.duration_minutes,
      revert: arg.revert,
    });
  };

  // Redimensionamento: mantem data e inicio, altera apenas o termino.
  const handleEventResize = (arg: EventResizeDoneArg) => {
    const { start, end } = arg.event;
    if (!start || !end) {
      arg.revert();
      return;
    }
    const appointment = eventAppointment(arg.event);
    const from = splitDateAndTime(start);
    const to = splitDateAndTime(end);
    onReschedule({
      appointment,
      date: from.date,
      startTime: from.time,
      durationMinutes: durationBetween(from.time, to.time),
      revert: arg.revert,
    });
  };

  return (
    <div className="agenda-calendar">
      <FullCalendar
        ref={calendarRef}
        plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
        initialView={FC_VIEW[view]}
        locale={ptBrLocale}
        timeZone="local"
        headerToolbar={false}
        height="100%"
        expandRows
        allDaySlot={false}
        nowIndicator
        firstDay={0}
        slotMinTime={SLOT_MIN_TIME}
        slotMaxTime={SLOT_MAX_TIME}
        slotDuration={{ minutes: slotMinutes }}
        snapDuration={{ minutes: slotMinutes }}
        views={{
          // No Dia a coluna e unica: cabe o dia por extenso.
          timeGridDay: { dayHeaderFormat: { weekday: 'long', day: 'numeric', month: 'long' } },
          timeGridWeek: { dayHeaderFormat: { weekday: 'short', day: '2-digit', month: '2-digit' } },
        }}
        slotLabelInterval={{ hours: 1 }}
        slotLabelFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
        eventTimeFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
        scrollTime="08:00:00"
        events={events}
        // Interacao. `selectable` fica desligado de proposito: com ele, um
        // clique poderia disparar `select` e `dateClick` juntos e abrir o
        // modal duas vezes.
        selectable={false}
        editable
        eventStartEditable
        eventDurationEditable
        eventResizableFromStart={false}
        // A sobreposicao nao e bloqueada aqui de proposito. Se o
        // FullCalendar recusasse o drop, o card voltaria sozinho e sem
        // explicacao. Deixando cair, quem recusa e o Supabase — e o
        // usuario recebe "Já existe um atendimento nesse horário." antes
        // do `revert()`. A regra de cancelados fica em um lugar so.
        // No celular, o arraste so comeca com toque prolongado: um toque
        // curto seleciona e um deslize continua rolando a tela.
        longPressDelay={350}
        eventLongPressDelay={350}
        // Mes
        dayMaxEvents={3}
        moreLinkText={(n) => `+${n}`}
        fixedWeekCount={false}
        dateClick={handleDateClick}
        eventClick={handleEventClick}
        eventDrop={handleEventDrop}
        eventResize={handleEventResize}
        datesSet={onRangeChange}
        eventContent={renderEvent}
      />
    </div>
  );
}

/**
 * Conteudo do card. O espaco disponivel decide o que aparece: em cards
 * curtos ficam apenas horario e cliente, que sao o essencial.
 */
function renderEvent(arg: EventContentArg) {
  const a = eventAppointment(arg.event);
  const meta = STATUS_META[a.status];

  if (arg.view.type === 'dayGridMonth') {
    return (
      <div className="agenda-chip" title={`${a.start_time} ${a.client_name}`}>
        <span className="agenda-chip__dot" style={{ backgroundColor: meta.color }} />
        <span className="agenda-chip__time">{a.start_time}</span>
        <span className="agenda-chip__name">{a.client_name}</span>
      </div>
    );
  }

  // Altura do card em minutos: decide quantas linhas cabem sem cortar.
  const minutes = a.duration_minutes;
  const showService = minutes >= 30;
  const showFooter = minutes >= 45;

  return (
    // `color` alimenta o `currentColor` da borda e do fundo no CSS. Sem
    // ele o card herdaria o texto branco padrao do FullCalendar.
    <div className="agenda-event" data-status={a.status} style={{ color: meta.color }}>
      <p className="agenda-event__time">
        {a.start_time} – {a.end_time}
      </p>
      <p className="agenda-event__name">{a.client_name}</p>
      {showService && a.service_name && (
        <p className="agenda-event__service">{a.service_name}</p>
      )}
      {showFooter && (
        <p className="agenda-event__footer">
          <span className="agenda-event__status">{meta.label}</span>
          <span className="agenda-event__price">{formatCurrency(a.price)}</span>
        </p>
      )}
    </div>
  );
}
