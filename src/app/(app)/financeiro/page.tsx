'use client';

import { useMemo } from 'react';
import {
  Wallet,
  CalendarRange,
  TrendingUp,
  Receipt,
  CheckCircle2,
  XCircle,
  Ban,
} from 'lucide-react';
import { useAsync } from '@/lib/hooks';
import { listAppointments } from '@/lib/data/repository';
import { buildFinance } from '@/lib/data/analytics';
import { formatCurrency } from '@/lib/utils/format';
import { STATUS_META } from '@/lib/constants';
import { StatCard } from '@/components/dashboard/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { LoadingState, ErrorState } from '@/components/ui/Misc';
import {
  RevenueAreaChart,
  ServicesBarChart,
  StatusPieChart,
} from '@/components/charts/Charts';

export default function FinanceiroPage() {
  const { data, loading, error } = useAsync(() => listAppointments(), []);

  const fin = useMemo(() => (data ? buildFinance(data, new Date()) : null), [data]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (!fin) return null;

  const statusPie = fin.statusCounts.map((s) => ({
    label: STATUS_META[s.status].label,
    value: s.count,
    color: STATUS_META[s.status].color,
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Faturamento */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Faturamento do dia" value={formatCurrency(fin.dayRevenue)} icon={Wallet} />
        <StatCard
          label="Da semana"
          value={formatCurrency(fin.weekRevenue)}
          icon={CalendarRange}
        />
        <StatCard
          label="Do mes"
          value={formatCurrency(fin.monthRevenue)}
          icon={TrendingUp}
          accent
        />
        <StatCard
          label="Ticket medio"
          value={formatCurrency(fin.ticketAverage)}
          icon={Receipt}
          hint="por atendimento"
        />
      </div>

      {/* Contadores de status */}
      <div className="grid grid-cols-3 gap-3">
        <MiniStat icon={CheckCircle2} label="Atendidos" value={fin.attended} tone="text-green-400" />
        <MiniStat icon={XCircle} label="Faltas" value={fin.noShows} tone="text-red-400" />
        <MiniStat icon={Ban} label="Cancelados" value={fin.cancellations} tone="text-zinc-400" />
      </div>

      {/* Grafico faturamento por dia */}
      <Card>
        <CardHeader>
          <CardTitle>Faturamento (ultimos 14 dias)</CardTitle>
        </CardHeader>
        <CardContent>
          <RevenueAreaChart data={fin.revenueByDay} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Servicos mais vendidos */}
        <Card>
          <CardHeader>
            <CardTitle>Servicos mais vendidos</CardTitle>
          </CardHeader>
          <CardContent>
            {fin.topServices.length ? (
              <ServicesBarChart data={fin.topServices} />
            ) : (
              <p className="py-10 text-center text-sm text-zinc-500">Sem dados no mes.</p>
            )}
          </CardContent>
        </Card>

        {/* Status dos agendamentos */}
        <Card>
          <CardHeader>
            <CardTitle>Status dos agendamentos (mes)</CardTitle>
          </CardHeader>
          <CardContent>
            <StatusPieChart data={statusPie} />
            <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1.5">
              {statusPie
                .filter((s) => s.value > 0)
                .map((s) => (
                  <span key={s.label} className="inline-flex items-center gap-1.5 text-xs text-zinc-400">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                    {s.label} ({s.value})
                  </span>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Clientes que mais gastaram */}
      <Card>
        <CardHeader>
          <CardTitle>Clientes que mais gastaram (mes)</CardTitle>
        </CardHeader>
        <CardContent>
          {fin.topClients.length ? (
            <div className="space-y-1.5">
              {fin.topClients.map((c, i) => (
                <div
                  key={c.name}
                  className="flex items-center gap-3 rounded-lg bg-ink-900 px-3 py-2.5"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gold/15 text-xs font-semibold text-gold">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">{c.name}</p>
                    <p className="text-xs text-zinc-500">{c.visits} atendimento(s)</p>
                  </div>
                  <span className="text-sm font-semibold text-gold">{formatCurrency(c.total)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-10 text-center text-sm text-zinc-500">Sem dados no mes.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Wallet;
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <Card className="flex flex-col items-center gap-1 p-4 text-center">
      <Icon className={`h-5 w-5 ${tone}`} />
      <span className="text-xl font-semibold text-white">{value}</span>
      <span className="text-[11px] text-zinc-500">{label}</span>
    </Card>
  );
}
