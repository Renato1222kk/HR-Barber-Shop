import type {
  Appointment,
  AppointmentStatus,
  Client,
  ClientWithStats,
  FinancialEntry,
} from '@/types';
import { parseDate, toISODate, timeToMinutes } from '@/lib/utils/format';
import { WEEKDAYS } from '@/lib/constants';

// Somente atendimentos concluidos entram no faturamento.
const REALIZED: AppointmentStatus[] = ['concluido'];
const PENDING: AppointmentStatus[] = ['agendado', 'confirmado', 'em_atendimento'];

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

export interface BarberPerformance {
  name: string;
  total: number;
  completed: number;
  revenue: number;
}

/** Desempenho por barbeiro em um conjunto de agendamentos. */
export function buildBarberPerformance(appointments: Appointment[]): BarberPerformance[] {
  const map = new Map<string, BarberPerformance>();
  appointments.forEach((a) => {
    const name = a.barber_name || 'Sem barbeiro';
    const entry = map.get(name) ?? { name, total: 0, completed: 0, revenue: 0 };
    entry.total += 1;
    if (a.status === 'concluido') {
      entry.completed += 1;
      entry.revenue += Number(a.price || 0);
    }
    map.set(name, entry);
  });
  return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue || b.total - a.total);
}

/** Servicos mais realizados (somente concluidos). */
export function buildTopServices(
  appointments: Appointment[],
  limit = 6
): { label: string; value: number; revenue: number }[] {
  const map: Record<string, { value: number; revenue: number }> = {};
  appointments
    .filter((a) => REALIZED.includes(a.status))
    .forEach((a) => {
      map[a.service_name] = map[a.service_name] || { value: 0, revenue: 0 };
      map[a.service_name].value += 1;
      map[a.service_name].revenue += Number(a.price || 0);
    });
  return Object.entries(map)
    .map(([label, v]) => ({ label, ...v }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

// =====================================================================
// DASHBOARD
// =====================================================================
export interface DashboardSummary {
  todayCount: number;
  todayCompleted: number;
  todayPending: number;
  todayCancelled: number;
  todayRevenue: number;
  todayExpectedRevenue: number;
  monthRevenue: number;
  freeSlots: number;
  todayList: Appointment[];
  upcoming: Appointment[];
  topServices: { label: string; value: number; revenue: number }[];
  barbers: BarberPerformance[];
}

export function buildDashboard(
  appointments: Appointment[],
  ref: Date,
  opts: { dayStart?: string; dayEnd?: string; avgDuration?: number } = {}
): DashboardSummary {
  const todayISO = toISODate(ref);
  const todayAll = appointments
    .filter((a) => a.date === todayISO)
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

  const active = todayAll.filter((a) => a.status !== 'cancelado');
  const completed = todayAll.filter((a) => a.status === 'concluido');
  const pending = todayAll.filter((a) => PENDING.includes(a.status));
  const cancelled = todayAll.filter((a) => a.status === 'cancelado');

  const nowMin = ref.getHours() * 60 + ref.getMinutes();
  const upcoming = todayAll
    .filter((a) => PENDING.includes(a.status) && timeToMinutes(a.start_time) >= nowMin)
    .slice(0, 5);

  // Estimativa de horarios livres no dia.
  const dayStart = timeToMinutes(opts.dayStart ?? '09:00');
  const dayEnd = timeToMinutes(opts.dayEnd ?? '19:00');
  const avg = opts.avgDuration ?? 40;
  const totalSlots = Math.max(0, Math.floor((dayEnd - dayStart) / avg));
  const freeSlots = Math.max(0, totalSlots - active.length);

  const monthRevenue = revenue(
    appointments.filter((a) => inMonth(a.date, ref) && REALIZED.includes(a.status))
  );

  return {
    todayCount: todayAll.length,
    todayCompleted: completed.length,
    todayPending: pending.length,
    todayCancelled: cancelled.length,
    todayRevenue: revenue(completed),
    todayExpectedRevenue: revenue(active),
    monthRevenue,
    freeSlots,
    todayList: active,
    upcoming,
    topServices: buildTopServices(
      appointments.filter((a) => inMonth(a.date, ref)),
      5
    ),
    barbers: buildBarberPerformance(appointments.filter((a) => inMonth(a.date, ref))),
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
  completed: number;
  pending: number;
  cancellations: number;
  topServices: { label: string; value: number; revenue: number }[];
  topClients: { name: string; total: number; visits: number }[];
  statusCounts: { status: AppointmentStatus; count: number }[];
  revenueByDay: { label: string; value: number; iso: string }[];
  barbers: BarberPerformance[];
}

export function buildFinance(appointments: Appointment[], ref: Date): FinanceSummary {
  const todayISO = toISODate(ref);
  const monthAll = appointments.filter((a) => inMonth(a.date, ref));
  const realizedMonth = monthAll.filter((a) => REALIZED.includes(a.status));

  const dayRevenue = revenue(
    appointments.filter((a) => a.date === todayISO && REALIZED.includes(a.status))
  );
  const weekRevenue = revenue(
    appointments.filter((a) => inWeek(a.date, ref) && REALIZED.includes(a.status))
  );
  const monthRevenue = revenue(realizedMonth);
  const ticketAverage = realizedMonth.length ? monthRevenue / realizedMonth.length : 0;

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
  const statuses: AppointmentStatus[] = [
    'agendado',
    'confirmado',
    'em_atendimento',
    'concluido',
    'cancelado',
  ];
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
    revenueByDay.push({
      iso,
      label: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      value: revenue(
        appointments.filter((a) => a.date === iso && REALIZED.includes(a.status))
      ),
    });
  }

  return {
    dayRevenue,
    weekRevenue,
    monthRevenue,
    ticketAverage,
    completed: realizedMonth.length,
    pending: monthAll.filter((a) => PENDING.includes(a.status)).length,
    cancellations: monthAll.filter((a) => a.status === 'cancelado').length,
    topServices: buildTopServices(monthAll),
    topClients,
    statusCounts,
    revenueByDay,
    barbers: buildBarberPerformance(monthAll),
  };
}

// =====================================================================
// LANCAMENTOS MANUAIS (financial_entries)
//
// Complementam o faturamento dos atendimentos concluidos: entram aqui as
// receitas e despesas que nao passam pela agenda.
// =====================================================================
export interface EntriesSummary {
  monthIncome: number;
  monthExpense: number;
  /** Receita dos atendimentos concluidos + receitas manuais - despesas. */
  monthBalance: number;
}

export function buildEntriesSummary(
  entries: FinancialEntry[],
  appointmentsRevenue: number,
  ref: Date
): EntriesSummary {
  const month = entries.filter((e) => inMonth(e.occurred_at, ref));
  const sum = (type: FinancialEntry['type']) =>
    month
      .filter((e) => e.type === type)
      .reduce((total, e) => total + Number(e.amount || 0), 0);

  const monthIncome = sum('income');
  const monthExpense = sum('expense');

  return {
    monthIncome,
    monthExpense,
    monthBalance: appointmentsRevenue + monthIncome - monthExpense,
  };
}

// =====================================================================
// CLIENTES
// =====================================================================
/** Enriquece cada cliente com o resumo dos atendimentos concluidos. */
export function computeClientStats(
  clients: Client[],
  appointments: Appointment[]
): ClientWithStats[] {
  return clients.map((client) => {
    const done = appointments.filter(
      (a) => a.client_id === client.id && a.status === 'concluido'
    );
    const total = done.reduce((sum, a) => sum + Number(a.price), 0);
    const last = done
      .map((a) => a.date)
      .sort()
      .at(-1);

    // servico mais frequente
    const counts: Record<string, number> = {};
    done.forEach((a) => {
      counts[a.service_name] = (counts[a.service_name] || 0) + 1;
    });
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    return {
      ...client,
      appointments_count: done.length,
      total_spent: total,
      last_visit: last ?? null,
      top_service: top,
    };
  });
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
  const byWeekday = new Array<number>(7).fill(0);
  realized.forEach((a) => {
    byWeekday[parseDate(a.date).getDay()] += Number(a.price);
  });
  const bestWeekday = byWeekday.indexOf(Math.max(...byWeekday));
  if (byWeekday[bestWeekday] > 0) {
    insights.push({
      id: 'best-day',
      icon: 'calendar',
      tone: 'gold',
      title: `O melhor dia da semana da barbearia é ${WEEKDAYS[bestWeekday].toLowerCase()}.`,
    });
  }

  // Faixa de horario com mais agendamentos
  const buckets: Record<string, number> = {};
  appointments.forEach((a) => {
    const h = Number(a.start_time.slice(0, 2));
    buckets[String(h)] = (buckets[String(h)] || 0) + 1;
  });
  const topBucket = Object.entries(buckets).sort((a, b) => b[1] - a[1])[0];
  if (topBucket) {
    const h = Number(topBucket[0]);
    insights.push({
      id: 'peak-hour',
      icon: 'clock',
      tone: 'blue',
      title: `O horário com mais agendamentos é entre ${h}h e ${h + 1}h.`,
    });
  }

  // Servico mais realizado
  const svcCount: Record<string, number> = {};
  realized.forEach((a) => {
    svcCount[a.service_name] = (svcCount[a.service_name] || 0) + 1;
  });
  const topSvc = Object.entries(svcCount).sort((a, b) => b[1] - a[1])[0];
  if (topSvc) {
    insights.push({
      id: 'top-service',
      icon: 'scissors',
      tone: 'gold',
      title: `O serviço mais realizado é ${topSvc[0]}.`,
    });
  }

  // Barbeiro destaque do mes
  const perf = buildBarberPerformance(realizedMonth);
  if (perf[0] && perf[0].completed > 0) {
    insights.push({
      id: 'top-barber',
      icon: 'trophy',
      tone: 'gold',
      title: `${perf[0].name} é o destaque do mês com ${perf[0].completed} atendimento(s) concluído(s).`,
    });
  }

  // Cancelamentos no mes
  const cancelados = appointments.filter(
    (a) => inMonth(a.date, ref) && a.status === 'cancelado'
  ).length;
  if (cancelados > 0) {
    insights.push({
      id: 'cancellations',
      icon: 'alert',
      tone: 'red',
      title: `Foram ${cancelados} cancelamento(s) neste mês.`,
    });
  }

  // Ticket medio do mes
  if (realizedMonth.length) {
    const ticket = revenue(realizedMonth) / realizedMonth.length;
    insights.push({
      id: 'ticket',
      icon: 'money',
      tone: 'green',
      title: `O ticket médio deste mês é ${ticket.toLocaleString('pt-BR', {
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
      title: `${missing[0].name} está há mais de ${missing[0].days} dias sem voltar.`,
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
          ? `O faturamento cresceu ${diff}% em relação ao mês passado.`
          : `O faturamento caiu ${Math.abs(diff)}% em relação ao mês passado.`,
    });
  }

  // Base de clientes
  if (clients.length) {
    insights.push({
      id: 'client-base',
      icon: 'user',
      tone: 'blue',
      title: `A barbearia tem ${clients.length} cliente(s) cadastrado(s).`,
    });
  }

  return insights;
}
