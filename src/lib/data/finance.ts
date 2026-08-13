// =====================================================================
// Painel financeiro — motor de calculo unico.
//
// Toda a tela do Financeiro (cards, graficos, listas, comparacoes e
// insights) sai de UM relatorio calculado aqui, a partir de duas listas ja
// carregadas: `appointments` e `financial_entries`. Nenhum componente
// React refaz conta financeira.
//
// Regras que NAO podem regredir:
//
//   1. "Hoje" e sempre a data civil da barbearia (America/Sao_Paulo), vinda
//      de `todayISO()`. Nunca o fuso do aparelho.
//   2. Faturamento realizado = SOMENTE atendimentos com status 'concluido'.
//      Agendado, confirmado, em atendimento e cancelado ficam de fora.
//   3. `appointments.date` e `financial_entries.occurred_at` sao datas
//      civis "YYYY-MM-DD". A aritmetica de periodo e feita sobre strings ou
//      sobre `Date` a meia-noite LOCAL (`parseLocalDate`), jamais por
//      `new Date(iso).toISOString()` — isso deslocaria o dia em -03.
// =====================================================================

import type {
  Appointment,
  AppointmentStatus,
  FinancialEntry,
  PaymentMethod,
} from '@/types';
import {
  addDaysISO,
  formatLocalDate,
  parseLocalDate,
  todayISO,
  type ISODate,
} from '@/lib/utils/date';
import {
  MONTHS,
  MONTHS_SHORT,
  PAYMENT_METHOD_LABELS,
  WEEKDAYS,
  WEEKDAYS_SHORT,
  entryCategoryLabel,
  paymentMethodLabel,
} from '@/lib/constants';

/** Status que entram no faturamento realizado. */
export const REALIZED: AppointmentStatus[] = ['concluido'];
/** Status ainda em aberto na agenda (nao faturam). */
export const PENDING: AppointmentStatus[] = ['agendado', 'confirmado', 'em_atendimento'];

const DAY_MS = 86400000;

// ---------------------------------------------------------------------
// Periodo
// ---------------------------------------------------------------------

export type PeriodMode = 'day' | 'week' | 'month' | 'custom';

export interface PeriodRange {
  mode: PeriodMode;
  /** Primeiro dia do periodo, inclusive ("YYYY-MM-DD"). */
  start: ISODate;
  /** Ultimo dia do periodo, inclusive ("YYYY-MM-DD"). */
  end: ISODate;
}

/** Segunda-feira da semana da data informada (semana civil brasileira). */
export function startOfWeekISO(iso: ISODate): ISODate {
  const offset = (parseLocalDate(iso).getDay() + 6) % 7; // segunda = 0
  return addDaysISO(iso, -offset);
}

export function endOfWeekISO(iso: ISODate): ISODate {
  return addDaysISO(startOfWeekISO(iso), 6);
}

export function startOfMonthISO(iso: ISODate): ISODate {
  return `${iso.slice(0, 7)}-01`;
}

export function endOfMonthISO(iso: ISODate): ISODate {
  const [y, m] = iso.split('-').map(Number);
  // Dia 0 do mes seguinte = ultimo dia deste mes.
  const last = new Date(y, m, 0).getDate();
  return `${iso.slice(0, 7)}-${String(last).padStart(2, '0')}`;
}

/** Soma meses preservando o dia quando ele existe no mes de destino. */
export function addMonthsISO(iso: ISODate, months: number): ISODate {
  const [y, m, d] = iso.split('-').map(Number);
  const target = new Date(y, m - 1 + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(d, lastDay));
  return formatLocalDate(target);
}

/** Dias inteiros entre duas datas civis (b - a). */
export function daysBetween(a: ISODate, b: ISODate): number {
  return Math.round((parseLocalDate(b).getTime() - parseLocalDate(a).getTime()) / DAY_MS);
}

/** Quantidade de dias do periodo (inclusive nas duas pontas). */
export function rangeLength(range: PeriodRange): number {
  return daysBetween(range.start, range.end) + 1;
}

export function eachDayISO(range: PeriodRange): ISODate[] {
  const days: ISODate[] = [];
  const total = rangeLength(range);
  for (let i = 0; i < total; i++) days.push(addDaysISO(range.start, i));
  return days;
}

export function isInRange(iso: ISODate, range: PeriodRange): boolean {
  // Strings "YYYY-MM-DD" comparam lexicograficamente na ordem cronologica.
  return iso >= range.start && iso <= range.end;
}

/** Monta o periodo a partir do modo e da data de referencia (ancora). */
export function buildRange(
  mode: PeriodMode,
  anchor: ISODate,
  custom?: { start: ISODate; end: ISODate }
): PeriodRange {
  switch (mode) {
    case 'day':
      return { mode, start: anchor, end: anchor };
    case 'week':
      return { mode, start: startOfWeekISO(anchor), end: endOfWeekISO(anchor) };
    case 'month':
      return { mode, start: startOfMonthISO(anchor), end: endOfMonthISO(anchor) };
    case 'custom': {
      const start = custom?.start ?? anchor;
      const end = custom?.end ?? anchor;
      // Datas invertidas pelo usuario nao viram periodo vazio.
      return start <= end ? { mode, start, end } : { mode, start: end, end: start };
    }
  }
}

/**
 * Periodo imediatamente anterior, usado em toda comparacao.
 *
 * Dia -> ontem. Semana -> semana anterior. Mes -> mes anterior completo
 * (respeitando meses de tamanhos diferentes). Personalizado -> o intervalo
 * anterior com a MESMA quantidade de dias.
 */
export function previousRange(range: PeriodRange): PeriodRange {
  if (range.mode === 'month') {
    const prevAnchor = addMonthsISO(startOfMonthISO(range.start), -1);
    return {
      mode: 'month',
      start: startOfMonthISO(prevAnchor),
      end: endOfMonthISO(prevAnchor),
    };
  }
  const length = rangeLength(range);
  const end = addDaysISO(range.start, -1);
  return { mode: range.mode, start: addDaysISO(end, -(length - 1)), end };
}

/** Move o periodo em `step` unidades (dia, semana ou mes). */
export function shiftRange(range: PeriodRange, step: number): PeriodRange {
  switch (range.mode) {
    case 'day':
      return buildRange('day', addDaysISO(range.start, step));
    case 'week':
      return buildRange('week', addDaysISO(range.start, step * 7));
    case 'month':
      return buildRange('month', addMonthsISO(startOfMonthISO(range.start), step));
    case 'custom': {
      const length = rangeLength(range);
      return {
        mode: 'custom',
        start: addDaysISO(range.start, step * length),
        end: addDaysISO(range.end, step * length),
      };
    }
  }
}

function dayMonthLabel(iso: ISODate): string {
  const d = parseLocalDate(iso);
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS_SHORT[d.getMonth()]}`;
}

/** Titulo do periodo exibido no cabecalho ("Hoje, 12 de agosto"). */
export function periodTitle(range: PeriodRange, today: ISODate = todayISO()): string {
  const start = parseLocalDate(range.start);
  const currentYear = parseLocalDate(today).getFullYear();

  switch (range.mode) {
    case 'day': {
      const suffix = `${start.getDate()} de ${MONTHS[start.getMonth()].toLowerCase()}${
        start.getFullYear() === currentYear ? '' : ` de ${start.getFullYear()}`
      }`;
      if (range.start === today) return `Hoje, ${suffix}`;
      if (range.start === addDaysISO(today, -1)) return `Ontem, ${suffix}`;
      if (range.start === addDaysISO(today, 1)) return `Amanhã, ${suffix}`;
      return `${WEEKDAYS[start.getDay()]}, ${suffix}`;
    }
    case 'week': {
      const year = start.getFullYear() === currentYear ? '' : ` de ${start.getFullYear()}`;
      return `${dayMonthLabel(range.start)} — ${dayMonthLabel(range.end)}${year}`;
    }
    case 'month':
      return `${MONTHS[start.getMonth()]} de ${start.getFullYear()}`;
    case 'custom': {
      const end = parseLocalDate(range.end);
      const fmt = (d: Date) =>
        `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
      return range.start === range.end ? fmt(start) : `${fmt(start)} — ${fmt(end)}`;
    }
  }
}

/** Como o periodo anterior e chamado nas comparacoes. */
export function comparisonLabel(range: PeriodRange): string {
  switch (range.mode) {
    case 'day':
      return 'vs. dia anterior';
    case 'week':
      return 'vs. semana anterior';
    case 'month': {
      const prev = previousRange(range);
      return `vs. ${MONTHS[parseLocalDate(prev.start).getMonth()].toLowerCase()}`;
    }
    case 'custom':
      return 'vs. período anterior';
  }
}

// ---------------------------------------------------------------------
// Filtros
// ---------------------------------------------------------------------

export interface FinanceFilters {
  /** Nomes de servicos (vazio = todos). */
  services: string[];
  /** Formas de pagamento (vazio = todas). */
  payments: PaymentMethod[];
  /** Status dos atendimentos (vazio = todos). */
  statuses: AppointmentStatus[];
}

export const EMPTY_FILTERS: FinanceFilters = { services: [], payments: [], statuses: [] };

export function countActiveFilters(filters: FinanceFilters): number {
  return filters.services.length + filters.payments.length + filters.statuses.length;
}

function matchAppointment(a: Appointment, f: FinanceFilters): boolean {
  if (f.services.length && !f.services.includes(a.service_name)) return false;
  if (f.statuses.length && !f.statuses.includes(a.status)) return false;
  if (f.payments.length && !(a.payment_method && f.payments.includes(a.payment_method)))
    return false;
  return true;
}

// Servico e status sao proprios da agenda: nao filtram lancamentos manuais.
function matchEntry(e: FinancialEntry, f: FinanceFilters): boolean {
  if (f.payments.length && !(e.payment_method && f.payments.includes(e.payment_method)))
    return false;
  return true;
}

// ---------------------------------------------------------------------
// Formato do relatorio
// ---------------------------------------------------------------------

export interface Delta {
  current: number;
  previous: number;
  /** Variacao percentual; `null` quando o periodo anterior foi zero. */
  percent: number | null;
  direction: 'up' | 'down' | 'flat';
}

export interface DayBucket {
  /** Primeiro dia do balde (o proprio dia, na granularidade diaria). */
  iso: ISODate;
  label: string;
  /** Rotulo curto usado no eixo do grafico. */
  shortLabel: string;
  /** Quantos dias o balde agrega (1 = dia; 7 = semana). */
  days: number;
  revenue: number;
  extraIncome: number;
  expense: number;
  balance: number;
  count: number;
}

export interface PaymentSlice {
  method: PaymentMethod | 'nao_informado';
  label: string;
  value: number;
  count: number;
  percent: number;
}

export interface ServiceSlice {
  name: string;
  count: number;
  revenue: number;
  percent: number;
}

export interface CategorySlice {
  category: string;
  label: string;
  value: number;
  percent: number;
}

export interface Movement {
  id: string;
  source: 'entry' | 'appointment';
  type: 'income' | 'expense';
  date: ISODate;
  time: string | null;
  description: string;
  categoryLabel: string;
  paymentMethod: PaymentMethod | null;
  amount: number;
  /** Presente apenas nos lancamentos manuais (permite editar/excluir). */
  entry?: FinancialEntry;
}

export interface FinanceInsight {
  id: string;
  text: string;
  tone: 'neutral' | 'positive' | 'negative';
}

export interface PeriodTotals {
  serviceRevenue: number;
  extraIncome: number;
  totalIncome: number;
  expense: number;
  balance: number;
  completed: number;
  pending: number;
  canceled: number;
  ticketAverage: number;
}

export interface FinanceReport {
  range: PeriodRange;
  comparisonRange: PeriodRange;
  comparisonLabel: string;

  /** Faturamento dos atendimentos concluidos. */
  serviceRevenue: number;
  /** Receitas avulsas (financial_entries do tipo income). */
  extraIncome: number;
  /** serviceRevenue + extraIncome. */
  totalIncome: number;
  expense: number;
  /** totalIncome - expense. */
  balance: number;

  completed: number;
  pending: number;
  canceled: number;
  ticketAverage: number;
  clients: number;

  days: number;
  workedDays: number;
  /** Faturamento de servicos dividido pelos dias do periodo. */
  dailyAverage: number;
  /** Faturamento de servicos dividido pelos dias com atendimento. */
  workedDayAverage: number;

  bestDay: DayBucket | null;
  topDays: DayBucket[];
  bestWeekday: { label: string; value: number } | null;

  series: DayBucket[];
  seriesGranularity: 'day' | 'week';
  seriesTitle: string;

  payments: PaymentSlice[];
  services: ServiceSlice[];
  expenseCategories: CategorySlice[];
  movements: Movement[];

  /** Atendimentos do periodo ja filtrados, em ordem cronologica. */
  appointments: Appointment[];
  completedAppointments: Appointment[];
  firstAppointment: Appointment | null;
  lastAppointment: Appointment | null;
  topServiceByCount: ServiceSlice | null;
  topServiceByRevenue: ServiceSlice | null;

  previous: PeriodTotals;
  deltas: {
    revenue: Delta;
    balance: Delta;
    expense: Delta;
    completed: Delta;
    ticket: Delta;
  };

  insights: FinanceInsight[];
  hasMovements: boolean;
  hasData: boolean;
}

// ---------------------------------------------------------------------
// Calculo
// ---------------------------------------------------------------------

const sumPrice = (list: Appointment[]) =>
  list.reduce((total, a) => total + Number(a.price || 0), 0);

const sumAmount = (list: FinancialEntry[]) =>
  list.reduce((total, e) => total + Number(e.amount || 0), 0);

function makeDelta(current: number, previous: number): Delta {
  const percent = previous > 0 ? ((current - previous) / previous) * 100 : null;
  const direction: Delta['direction'] =
    current > previous ? 'up' : current < previous ? 'down' : 'flat';
  return { current, previous, percent, direction };
}

/** Totais de um periodo — usado tanto no atual quanto no de comparacao. */
function totalsFor(
  appointments: Appointment[],
  entries: FinancialEntry[],
  range: PeriodRange,
  filters: FinanceFilters
): PeriodTotals {
  const appts = appointments.filter((a) => isInRange(a.date, range) && matchAppointment(a, filters));
  const realized = appts.filter((a) => REALIZED.includes(a.status));
  const ents = entries.filter((e) => isInRange(e.occurred_at, range) && matchEntry(e, filters));

  const serviceRevenue = sumPrice(realized);
  const extraIncome = sumAmount(ents.filter((e) => e.type === 'income'));
  const expense = sumAmount(ents.filter((e) => e.type === 'expense'));

  return {
    serviceRevenue,
    extraIncome,
    totalIncome: serviceRevenue + extraIncome,
    expense,
    balance: serviceRevenue + extraIncome - expense,
    completed: realized.length,
    pending: appts.filter((a) => PENDING.includes(a.status)).length,
    canceled: appts.filter((a) => a.status === 'cancelado').length,
    ticketAverage: realized.length ? serviceRevenue / realized.length : 0,
  };
}

function bucketLabels(iso: ISODate, days: number, mode: PeriodMode) {
  const d = parseLocalDate(iso);
  const dayMonth = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  if (days > 1) {
    const end = parseLocalDate(addDaysISO(iso, days - 1));
    const endLabel = `${String(end.getDate()).padStart(2, '0')}/${String(end.getMonth() + 1).padStart(2, '0')}`;
    return { label: `${dayMonth} a ${endLabel}`, shortLabel: dayMonth };
  }
  // Na semana o eixo fica mais legivel com o nome do dia.
  const short = mode === 'week' ? WEEKDAYS_SHORT[d.getDay()] : dayMonth;
  return { label: `${WEEKDAYS_SHORT[d.getDay()]}, ${dayMonth}`, shortLabel: short };
}

interface DayTotals {
  revenue: number;
  extraIncome: number;
  expense: number;
  count: number;
}

/**
 * Indice diario: uma unica varredura das listas alimenta graficos, melhores
 * dias e medias. Sem isso, um periodo de um ano refiltraria a lista inteira
 * uma vez por dia do calendario.
 */
function buildDailyIndex(
  appointments: Appointment[],
  entries: FinancialEntry[],
  filters: FinanceFilters
): Map<ISODate, DayTotals> {
  const index = new Map<ISODate, DayTotals>();
  const slot = (iso: ISODate) => {
    const found = index.get(iso) ?? { revenue: 0, extraIncome: 0, expense: 0, count: 0 };
    index.set(iso, found);
    return found;
  };

  appointments.forEach((a) => {
    if (!REALIZED.includes(a.status) || !matchAppointment(a, filters)) return;
    const day = slot(a.date);
    day.revenue += Number(a.price || 0);
    day.count += 1;
  });

  entries.forEach((e) => {
    if (!matchEntry(e, filters)) return;
    const day = slot(e.occurred_at);
    if (e.type === 'income') day.extraIncome += Number(e.amount || 0);
    else day.expense += Number(e.amount || 0);
  });

  return index;
}

function makeBucket(
  index: Map<ISODate, DayTotals>,
  start: ISODate,
  days: number,
  mode: PeriodMode
): DayBucket {
  let revenue = 0;
  let extraIncome = 0;
  let expense = 0;
  let count = 0;
  for (let i = 0; i < days; i++) {
    const day = index.get(addDaysISO(start, i));
    if (!day) continue;
    revenue += day.revenue;
    extraIncome += day.extraIncome;
    expense += day.expense;
    count += day.count;
  }
  const { label, shortLabel } = bucketLabels(start, days, mode);
  return {
    iso: start,
    label,
    shortLabel,
    days,
    revenue,
    extraIncome,
    expense,
    balance: revenue + extraIncome - expense,
    count,
  };
}

/**
 * Serie do grafico de evolucao.
 *
 * Ate 31 dias a serie e diaria; acima disso vira semanal, para o eixo nao
 * virar um borrao no celular. No modo Dia a serie mostra os 7 dias que
 * terminam no dia escolhido — um dia sozinho nao forma grafico.
 */
function buildSeries(
  index: Map<ISODate, DayTotals>,
  range: PeriodRange
): { series: DayBucket[]; granularity: 'day' | 'week'; title: string } {
  const chartRange: PeriodRange =
    range.mode === 'day'
      ? { mode: 'custom', start: addDaysISO(range.end, -6), end: range.end }
      : range;

  const totalDays = rangeLength(chartRange);
  const bucketDays = totalDays > 31 ? 7 : 1;

  const series: DayBucket[] = [];
  for (let offset = 0; offset < totalDays; offset += bucketDays) {
    const start = addDaysISO(chartRange.start, offset);
    series.push(makeBucket(index, start, Math.min(bucketDays, totalDays - offset), range.mode));
  }

  const granularity = bucketDays > 1 ? 'week' : 'day';
  const title =
    range.mode === 'day'
      ? 'Últimos 7 dias'
      : granularity === 'week'
        ? 'Faturamento por semana'
        : 'Faturamento por dia';

  return { series, granularity, title };
}

export interface FinanceReportInput {
  appointments: Appointment[];
  entries: FinancialEntry[];
  range: PeriodRange;
  filters?: FinanceFilters;
}

/**
 * Relatorio completo do periodo. Recebe as listas ja carregadas (uma
 * consulta de appointments e uma de financial_entries cobrindo o periodo
 * atual + o de comparacao) e devolve tudo que a tela precisa.
 */
export function buildFinanceReport({
  appointments,
  entries,
  range,
  filters = EMPTY_FILTERS,
}: FinanceReportInput): FinanceReport {
  const comparisonRange = previousRange(range);

  const appts = appointments
    .filter((a) => isInRange(a.date, range) && matchAppointment(a, filters))
    .sort((a, b) => a.date.localeCompare(b.date) || a.start_time.localeCompare(b.start_time));
  const realized = appts.filter((a) => REALIZED.includes(a.status));
  const ents = entries
    .filter((e) => isInRange(e.occurred_at, range) && matchEntry(e, filters))
    .sort((a, b) => b.occurred_at.localeCompare(a.occurred_at));

  const current = totalsFor(appointments, entries, range, filters);
  const previous = totalsFor(appointments, entries, comparisonRange, filters);

  // ---- Formas de pagamento (atendimentos concluidos + receitas avulsas)
  const paymentMap = new Map<string, { value: number; count: number }>();
  const addPayment = (method: PaymentMethod | null, value: number) => {
    const key = method ?? 'nao_informado';
    const slot = paymentMap.get(key) ?? { value: 0, count: 0 };
    slot.value += value;
    slot.count += 1;
    paymentMap.set(key, slot);
  };
  realized.forEach((a) => addPayment(a.payment_method, Number(a.price || 0)));
  ents
    .filter((e) => e.type === 'income')
    .forEach((e) => addPayment(e.payment_method, Number(e.amount || 0)));

  const paymentTotal = Array.from(paymentMap.values()).reduce((t, s) => t + s.value, 0);
  const payments: PaymentSlice[] = Array.from(paymentMap.entries())
    .map(([key, slot]) => ({
      method: key as PaymentSlice['method'],
      label:
        key === 'nao_informado'
          ? 'Não informado'
          : PAYMENT_METHOD_LABELS[key as PaymentMethod],
      value: slot.value,
      count: slot.count,
      percent: paymentTotal > 0 ? (slot.value / paymentTotal) * 100 : 0,
    }))
    .filter((p) => p.value > 0 || p.count > 0)
    .sort((a, b) => b.value - a.value);

  // ---- Servicos (somente concluidos)
  const serviceMap = new Map<string, { count: number; revenue: number }>();
  realized.forEach((a) => {
    const name = a.service_name || 'Sem serviço';
    const slot = serviceMap.get(name) ?? { count: 0, revenue: 0 };
    slot.count += 1;
    slot.revenue += Number(a.price || 0);
    serviceMap.set(name, slot);
  });
  const services: ServiceSlice[] = Array.from(serviceMap.entries())
    .map(([name, slot]) => ({
      name,
      count: slot.count,
      revenue: slot.revenue,
      percent: current.serviceRevenue > 0 ? (slot.revenue / current.serviceRevenue) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count || b.revenue - a.revenue);

  const topServiceByCount = services[0] ?? null;
  const topServiceByRevenue =
    [...services].sort((a, b) => b.revenue - a.revenue || b.count - a.count)[0] ?? null;

  // ---- Despesas por categoria
  const categoryMap = new Map<string, number>();
  ents
    .filter((e) => e.type === 'expense')
    .forEach((e) => {
      const key = e.category || 'outros';
      categoryMap.set(key, (categoryMap.get(key) ?? 0) + Number(e.amount || 0));
    });
  const expenseCategories: CategorySlice[] = Array.from(categoryMap.entries())
    .map(([category, value]) => ({
      category,
      label: entryCategoryLabel(category),
      value,
      percent: current.expense > 0 ? (value / current.expense) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value);

  // ---- Movimentacoes (extrato do periodo)
  const movements: Movement[] = [
    ...ents.map<Movement>((e) => ({
      id: e.id,
      source: 'entry',
      type: e.type,
      date: e.occurred_at,
      time: null,
      description: e.description || entryCategoryLabel(e.category),
      categoryLabel: entryCategoryLabel(e.category),
      paymentMethod: e.payment_method,
      amount: Number(e.amount || 0),
      entry: e,
    })),
    ...realized.map<Movement>((a) => ({
      id: a.id,
      source: 'appointment',
      type: 'income',
      date: a.date,
      time: a.start_time,
      description: a.client_name,
      categoryLabel: a.service_name || 'Serviço',
      paymentMethod: a.payment_method,
      amount: Number(a.price || 0),
    })),
  ].sort(
    (a, b) => b.date.localeCompare(a.date) || (b.time ?? '').localeCompare(a.time ?? '')
  );

  // ---- Serie e melhores dias
  const dailyIndex = buildDailyIndex(appointments, entries, filters);
  const { series, granularity, title } = buildSeries(dailyIndex, range);

  // Os "melhores dias" sao sempre diarios, mesmo quando o grafico agrega
  // por semana.
  const dailyBuckets: DayBucket[] =
    granularity === 'day' && range.mode !== 'day'
      ? series
      : eachDayISO(range).map((iso) => makeBucket(dailyIndex, iso, 1, range.mode));

  const topDays = [...dailyBuckets]
    .filter((d) => d.revenue > 0)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);
  const bestDay = topDays[0] ?? null;
  const workedDays = dailyBuckets.filter((d) => d.count > 0).length;

  // Melhor dia da semana (so faz sentido com mais de uma semana no periodo)
  let bestWeekday: FinanceReport['bestWeekday'] = null;
  if (dailyBuckets.length > 1) {
    const byWeekday = new Array<number>(7).fill(0);
    dailyBuckets.forEach((d) => {
      byWeekday[parseLocalDate(d.iso).getDay()] += d.revenue;
    });
    const best = byWeekday.indexOf(Math.max(...byWeekday));
    if (byWeekday[best] > 0) bestWeekday = { label: WEEKDAYS[best], value: byWeekday[best] };
  }

  const days = rangeLength(range);
  const clients = new Set(realized.map((a) => a.client_id ?? a.client_name)).size;

  const report: FinanceReport = {
    range,
    comparisonRange,
    comparisonLabel: comparisonLabel(range),

    serviceRevenue: current.serviceRevenue,
    extraIncome: current.extraIncome,
    totalIncome: current.totalIncome,
    expense: current.expense,
    balance: current.balance,

    completed: current.completed,
    pending: current.pending,
    canceled: current.canceled,
    ticketAverage: current.ticketAverage,
    clients,

    days,
    workedDays,
    dailyAverage: days > 0 ? current.serviceRevenue / days : 0,
    workedDayAverage: workedDays > 0 ? current.serviceRevenue / workedDays : 0,

    bestDay,
    topDays,
    bestWeekday,

    series,
    seriesGranularity: granularity,
    seriesTitle: title,

    payments,
    services,
    expenseCategories,
    movements,

    appointments: appts,
    completedAppointments: realized,
    firstAppointment: appts[0] ?? null,
    lastAppointment: appts[appts.length - 1] ?? null,
    topServiceByCount,
    topServiceByRevenue,

    previous,
    deltas: {
      revenue: makeDelta(current.serviceRevenue, previous.serviceRevenue),
      balance: makeDelta(current.balance, previous.balance),
      expense: makeDelta(current.expense, previous.expense),
      completed: makeDelta(current.completed, previous.completed),
      ticket: makeDelta(current.ticketAverage, previous.ticketAverage),
    },

    insights: [],
    hasMovements: movements.length > 0,
    hasData: appts.length > 0 || ents.length > 0,
  };

  report.insights = buildFinanceInsights(report);
  return report;
}

// ---------------------------------------------------------------------
// Resumo do periodo (insights deterministicos — sem IA, sem estimativa)
// ---------------------------------------------------------------------

const brl = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const pct = (value: number) => `${Math.round(value)}%`;

export function buildFinanceInsights(report: FinanceReport): FinanceInsight[] {
  const list: FinanceInsight[] = [];
  const periodWord =
    report.range.mode === 'day'
      ? 'no dia'
      : report.range.mode === 'week'
        ? 'na semana'
        : report.range.mode === 'month'
          ? 'no mês'
          : 'no período';

  if (report.bestDay && report.days > 1) {
    const weekday = WEEKDAYS[parseLocalDate(report.bestDay.iso).getDay()].toLowerCase();
    list.push({
      id: 'best-day',
      tone: 'positive',
      text: `Seu melhor dia foi ${weekday} (${report.bestDay.shortLabel}), com ${brl(report.bestDay.revenue)}.`,
    });
  }

  if (report.topServiceByRevenue && report.topServiceByRevenue.percent > 0) {
    list.push({
      id: 'top-service',
      tone: 'neutral',
      text: `${report.topServiceByRevenue.name} gerou ${pct(report.topServiceByRevenue.percent)} do faturamento.`,
    });
  }

  const ticket = report.deltas.ticket;
  if (ticket.percent !== null && Math.abs(ticket.percent) >= 1) {
    list.push({
      id: 'ticket',
      tone: ticket.percent >= 0 ? 'positive' : 'negative',
      text:
        ticket.percent >= 0
          ? `Seu ticket médio aumentou ${pct(ticket.percent)} em relação ao período anterior.`
          : `Seu ticket médio caiu ${pct(Math.abs(ticket.percent))} em relação ao período anterior.`,
    });
  }

  const topPayment = report.payments[0];
  if (topPayment && topPayment.percent > 0) {
    list.push({
      id: 'payment',
      tone: 'neutral',
      text: `${topPayment.label} foi usado em ${pct(topPayment.percent)} do valor recebido.`,
    });
  }

  if (report.expense > 0 && report.totalIncome > 0) {
    const share = (report.expense / report.totalIncome) * 100;
    list.push({
      id: 'expense-share',
      tone: share >= 50 ? 'negative' : 'neutral',
      text: `As despesas representaram ${pct(share)} da receita ${periodWord}.`,
    });
  }

  if (report.pending > 0) {
    list.push({
      id: 'pending',
      tone: 'neutral',
      text: `${report.pending} atendimento(s) ainda em aberto ${periodWord} — não entram no faturamento.`,
    });
  }

  if (report.days > 1 && report.workedDays > 0) {
    list.push({
      id: 'worked-average',
      tone: 'neutral',
      text: `Média de ${brl(report.workedDayAverage)} por dia trabalhado (${report.workedDays} de ${report.days} dias).`,
    });
  }

  if (report.canceled > 0) {
    list.push({
      id: 'canceled',
      tone: 'negative',
      text: `${report.canceled} atendimento(s) cancelado(s) ${periodWord}.`,
    });
  }

  return list;
}

// ---------------------------------------------------------------------
// Detalhe de um dia (usado pelo bottom sheet)
// ---------------------------------------------------------------------

export interface DayDetails {
  iso: ISODate;
  title: string;
  revenue: number;
  extraIncome: number;
  expense: number;
  balance: number;
  completed: number;
  ticketAverage: number;
  appointments: Appointment[];
  movements: Movement[];
}

export function buildDayDetails(
  input: Omit<FinanceReportInput, 'range'> & { iso: ISODate },
  today: ISODate = todayISO()
): DayDetails {
  const range = buildRange('day', input.iso);
  const report = buildFinanceReport({ ...input, range });
  return {
    iso: input.iso,
    title: periodTitle(range, today),
    revenue: report.serviceRevenue,
    extraIncome: report.extraIncome,
    expense: report.expense,
    balance: report.balance,
    completed: report.completed,
    ticketAverage: report.ticketAverage,
    appointments: report.appointments,
    movements: report.movements,
  };
}

// ---------------------------------------------------------------------
// Exportacao (CSV)
// ---------------------------------------------------------------------

function csvCell(value: string | number): string {
  const text = String(value ?? '');
  return /[";\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Monta um CSV com `;` (o Excel pt-BR abre direto) e BOM UTF-8. */
export function toCSV(headers: string[], rows: (string | number)[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(csvCell).join(';'));
  return `﻿${lines.join('\r\n')}`;
}

const csvMoney = (value: number) => value.toFixed(2).replace('.', ',');
const csvDate = (iso: ISODate) => {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

export function appointmentsCSV(report: FinanceReport, statusLabel: (s: AppointmentStatus) => string) {
  return toCSV(
    ['Data', 'Horário', 'Cliente', 'Serviço', 'Valor', 'Forma de pagamento', 'Status'],
    report.appointments.map((a) => [
      csvDate(a.date),
      a.start_time,
      a.client_name,
      a.service_name,
      csvMoney(Number(a.price || 0)),
      paymentMethodLabel(a.payment_method),
      statusLabel(a.status),
    ])
  );
}

export function movementsCSV(report: FinanceReport) {
  return toCSV(
    ['Data', 'Tipo', 'Descrição', 'Categoria', 'Forma de pagamento', 'Valor'],
    report.movements.map((m) => [
      csvDate(m.date),
      m.type === 'income' ? 'Entrada' : 'Despesa',
      m.description,
      m.categoryLabel,
      paymentMethodLabel(m.paymentMethod),
      csvMoney(m.type === 'income' ? m.amount : -m.amount),
    ])
  );
}

/** Nome de arquivo estavel para o periodo ("financeiro-2026-08-01-a-2026-08-12"). */
export function exportFileName(prefix: string, range: PeriodRange): string {
  return range.start === range.end
    ? `${prefix}-${range.start}.csv`
    : `${prefix}-${range.start}-a-${range.end}.csv`;
}
