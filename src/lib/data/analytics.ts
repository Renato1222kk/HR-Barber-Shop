// Analises gerais do negocio (barbeiros, clientes e insights).
//
// O painel financeiro tem motor proprio em `./finance`: periodo, filtros,
// comparacoes, graficos e extrato saem todos de la. Nao duplique conta de
// faturamento aqui.

import type { Appointment, AppointmentStatus, Client, ClientWithStats } from '@/types';
import { parseDate } from '@/lib/utils/format';
import { WEEKDAYS } from '@/lib/constants';
import { REALIZED } from './finance';

function revenue(appts: Appointment[]): number {
  return appts.reduce((sum, a) => sum + Number(a.price || 0), 0);
}

function inMonth(iso: string, ref: Date): boolean {
  const d = parseDate(iso);
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();
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
