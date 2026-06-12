import type { Appointment, AppointmentStatus, Client } from '@/types';
import { parseDate, toISODate, timeToMinutes } from '@/lib/utils/format';
import { WEEKDAYS } from '@/lib/constants';

const REALIZED: AppointmentStatus[] = ['atendido'];
const PLANNED: AppointmentStatus[] = ['agendado', 'confirmado', 'atendido'];

function revenue(appts: Appointment[]): number {
  return appts.reduce((sum, a) => sum + Number(a.price || 0), 0);
}

// ---- Janelas de tempo ----
export function startOfWeek(d: Date): Date {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7; // segunda = 0
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x;
}
export function endOfWeek(d: Date): Date {
  const s = startOfWeek(d);
  s.setDate(s.getDate() + 6);
  return s;
}

function inMonth(iso: string, ref: Date): boolean {
  const d = parseDate(iso);
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();
}
function inWeek(iso: string, ref: Date): boolean {
  const d = parseDate(iso).getTime();
  return d >= startOfWeek(ref).getTime() && d <= endOfWeek(ref).getTime();
}

// =====================================================================
// DASHBOARD
// =====================================================================
export interface DashboardSummary {
  todayCount: number;
  todayExpectedRevenue: number;
  nextAppointment: Appointment | null;
  freeSlots: number;
  monthRevenue: number;
  todayList: Appointment[];
}

export function buildDashboard(
  appointments: Appointment[],
  ref: Date,
  opts: { dayStart?: string; dayEnd?: string; avgDuration?: number } = {}
): DashboardSummary {
  const todayISO = toISODate(ref);
  const today = appointments
    .filter((a) => a.date === todayISO && a.status !== 'cancelado')
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

  const expected = revenue(today.filter((a) => PLANNED.includes(a.status)));

  const nowMin = ref.getHours() * 60 + ref.getMinutes();
  const next =
    today.find(
      (a) =>
        timeToMinutes(a.start_time) >= nowMin &&
        (a.status === 'agendado' || a.status === 'confirmado')
    ) ?? null;

  // estimativa de horarios livres
  const dayStart = timeToMinutes(opts.dayStart ?? '09:00');
  const dayEnd = timeToMinutes(opts.dayEnd ?? '19:00');
  const avg = opts.avgDuration ?? 40;
  const totalSlots = Math.max(0, Math.floor((dayEnd - dayStart) / avg));
  const used = today.filter((a) => a.status !== 'cancelado' && a.status !== 'faltou').length;
  const freeSlots = Math.max(0, totalSlots - used);

  const monthRevenue = revenue(
    appointments.filter((a) => inMonth(a.date, ref) && REALIZED.includes(a.status))
  );

  return {
    todayCount: today.length,
    todayExpectedRevenue: expected,
    nextAppointment: next,
    freeSlots,
    monthRevenue,
    todayList: today,
  };
}

// =====================================================================
// FINANCEIRO
// =====================================================================
export interface FinanceSummary {
  dayRevenue: number;
  weekRevenue: number;
  monthRevenue: number;
  ticketAverage: number;
  attended: number;
  noShows: number;
  cancellations: number;
  topServices: { label: string; value: number; revenue: number }[];
  topClients: { name: string; total: number; visits: number }[];
  statusCounts: { status: AppointmentStatus; count: number }[];
  revenueByDay: { label: string; value: number; iso: string }[];
}

export function buildFinance(appointments: Appointment[], ref: Date): FinanceSummary {
  const todayISO = toISODate(ref);
  const realizedMonth = appointments.filter(
    (a) => inMonth(a.date, ref) && REALIZED.includes(a.status)
  );

  const dayRevenue = revenue(
    appointments.filter((a) => a.date === todayISO && REALIZED.includes(a.status))
  );
  const weekRevenue = revenue(
    appointments.filter((a) => inWeek(a.date, ref) && REALIZED.includes(a.status))
  );
  const monthRevenue = revenue(realizedMonth);
  const ticketAverage = realizedMonth.length ? monthRevenue / realizedMonth.length : 0;

  const monthAll = appointments.filter((a) => inMonth(a.date, ref));
  const attended = monthAll.filter((a) => a.status === 'atendido').length;
  const noShows = monthAll.filter((a) => a.status === 'faltou').length;
  const cancellations = monthAll.filter((a) => a.status === 'cancelado').length;

  // top servicos (por quantidade + faturamento)
  const svc: Record<string, { value: number; revenue: number }> = {};
  realizedMonth.forEach((a) => {
    svc[a.service_name] = svc[a.service_name] || { value: 0, revenue: 0 };
    svc[a.service_name].value += 1;
    svc[a.service_name].revenue += Number(a.price);
  });
  const topServices = Object.entries(svc)
    .map(([label, v]) => ({ label, ...v }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  // top clientes
  const cli: Record<string, { total: number; visits: number }> = {};
  realizedMonth.forEach((a) => {
    cli[a.client_name] = cli[a.client_name] || { total: 0, visits: 0 };
    cli[a.client_name].total += Number(a.price);
    cli[a.client_name].visits += 1;
  });
  const topClients = Object.entries(cli)
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  // status counts (mes)
  const statuses: AppointmentStatus[] = ['agendado', 'confirmado', 'atendido', 'faltou', 'cancelado'];
  const statusCounts = statuses.map((status) => ({
    status,
    count: monthAll.filter((a) => a.status === status).length,
  }));

  // faturamento ultimos 14 dias
  const revenueByDay: { label: string; value: number; iso: string }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(ref);
    d.setDate(ref.getDate() - i);
    const iso = toISODate(d);
    const value = revenue(
      appointments.filter((a) => a.date === iso && REALIZED.includes(a.status))
    );
    revenueByDay.push({
      iso,
      label: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      value,
    });
  }

  return {
    dayRevenue,
    weekRevenue,
    monthRevenue,
    ticketAverage,
    attended,
    noShows,
    cancellations,
    topServices,
    topClients,
    statusCounts,
    revenueByDay,
  };
}

// =====================================================================
// INSIGHTS
// =====================================================================
export interface Insight {
  id: string;
  icon: 'calendar' | 'clock' | 'scissors' | 'alert' | 'user' | 'money' | 'trophy' | 'trend';
  title: string;
  tone: 'gold' | 'green' | 'red' | 'blue';
}

export function buildInsights(
  appointments: Appointment[],
  clients: Client[],
  ref: Date
): Insight[] {
  const insights: Insight[] = [];
  const realized = appointments.filter((a) => REALIZED.includes(a.status));
  const realizedMonth = realized.filter((a) => inMonth(a.date, ref));

  // Melhor dia da semana (por faturamento)
  const byWeekday = new Array(7).fill(0);
  realized.forEach((a) => {
    byWeekday[parseDate(a.date).getDay()] += Number(a.price);
  });
  const bestWeekday = byWeekday.indexOf(Math.max(...byWeekday));
  if (byWeekday[bestWeekday] > 0) {
    insights.push({
      id: 'best-day',
      icon: 'calendar',
      tone: 'gold',
      title: `Seu melhor dia da semana e ${WEEKDAYS[bestWeekday].toLowerCase()}.`,
    });
  }

  // Faixa de horario com mais agendamentos
  const buckets: Record<string, number> = {};
  appointments.forEach((a) => {
    const h = Number(a.start_time.slice(0, 2));
    const key = `${h}-${h + 1}`;
    buckets[key] = (buckets[key] || 0) + 1;
  });
  const topBucket = Object.entries(buckets).sort((a, b) => b[1] - a[1])[0];
  if (topBucket) {
    const h = Number(topBucket[0].split('-')[0]);
    insights.push({
      id: 'peak-hour',
      icon: 'clock',
      tone: 'blue',
      title: `O horario com mais agendamentos e entre ${h}h e ${h + 3}h.`,
    });
  }

  // Servico mais vendido
  const svcCount: Record<string, number> = {};
  realized.forEach((a) => (svcCount[a.service_name] = (svcCount[a.service_name] || 0) + 1));
  const topSvc = Object.entries(svcCount).sort((a, b) => b[1] - a[1])[0];
  if (topSvc) {
    insights.push({
      id: 'top-service',
      icon: 'scissors',
      tone: 'gold',
      title: `Seu servico mais vendido e ${topSvc[0]}.`,
    });
  }

  // Servico que mais gera faturamento
  const svcRevenue: Record<string, number> = {};
  realized.forEach(
    (a) => (svcRevenue[a.service_name] = (svcRevenue[a.service_name] || 0) + Number(a.price))
  );
  const topRevSvc = Object.entries(svcRevenue).sort((a, b) => b[1] - a[1])[0];
  if (topRevSvc && topRevSvc[0] !== topSvc?.[0]) {
    insights.push({
      id: 'top-revenue-service',
      icon: 'trophy',
      tone: 'gold',
      title: `${topRevSvc[0]} e o servico que mais gera faturamento.`,
    });
  }

  // Faltas no mes
  const faltas = appointments.filter((a) => inMonth(a.date, ref) && a.status === 'faltou').length;
  if (faltas > 0) {
    insights.push({
      id: 'no-shows',
      icon: 'alert',
      tone: 'red',
      title: `Voce teve ${faltas} ${faltas === 1 ? 'falta' : 'faltas'} este mes.`,
    });
  }

  // Ticket medio do mes
  if (realizedMonth.length) {
    const ticket = revenue(realizedMonth) / realizedMonth.length;
    insights.push({
      id: 'ticket',
      icon: 'money',
      tone: 'green',
      title: `Seu ticket medio este mes e ${ticket.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      })}.`,
    });
  }

  // Cliente sumido (> 45 dias)
  const lastVisitByClient: Record<string, string> = {};
  realized.forEach((a) => {
    if (!lastVisitByClient[a.client_name] || a.date > lastVisitByClient[a.client_name]) {
      lastVisitByClient[a.client_name] = a.date;
    }
  });
  const refTime = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate()).getTime();
  const missing = Object.entries(lastVisitByClient)
    .map(([name, date]) => ({
      name,
      days: Math.round((refTime - parseDate(date).getTime()) / 86400000),
    }))
    .filter((c) => c.days > 45)
    .sort((a, b) => b.days - a.days);
  if (missing[0]) {
    insights.push({
      id: 'missing-client',
      icon: 'user',
      tone: 'red',
      title: `O cliente ${missing[0].name} esta ha mais de ${missing[0].days} dias sem voltar.`,
    });
  }

  // Crescimento vs mes anterior
  const prevRef = new Date(ref.getFullYear(), ref.getMonth() - 1, 1);
  const prevRevenue = revenue(realized.filter((a) => inMonth(a.date, prevRef)));
  const curRevenue = revenue(realizedMonth);
  if (prevRevenue > 0) {
    const diff = Math.round(((curRevenue - prevRevenue) / prevRevenue) * 100);
    insights.push({
      id: 'growth',
      icon: 'trend',
      tone: diff >= 0 ? 'green' : 'red',
      title:
        diff >= 0
          ? `Seu faturamento cresceu ${diff}% em relacao ao mes passado.`
          : `Seu faturamento caiu ${Math.abs(diff)}% em relacao ao mes passado.`,
    });
  }

  return insights;
}
