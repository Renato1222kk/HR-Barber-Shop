'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  CalendarDays,
  Wallet,
  CheckCircle2,
  Clock4,
  Ban,
  TrendingUp,
  CalendarPlus,
  ArrowRight,
  Scissors,
  UserCog,
} from 'lucide-react';
import { useAsync } from '@/lib/hooks';
import { getSettings, listAppointments, listWorkingHours } from '@/services';
import { buildDashboard } from '@/lib/data/analytics';
import { capitalize, formatCurrency } from '@/lib/utils/format';
import { StatCard } from '@/components/dashboard/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { AppointmentCard } from '@/components/agenda/AppointmentCard';
import { LoadingState, EmptyState, ErrorState } from '@/components/ui/Misc';
import { Button } from '@/components/ui/Button';
import { useShell } from '@/components/layout/AppShell';

export default function DashboardPage() {
  const { openNewAppointment } = useShell();
  const router = useRouter();

  const appts = useAsync(() => listAppointments(), []);
  const hours = useAsync(() => listWorkingHours(), []);
  const settings = useAsync(() => getSettings(), []);

  const today = new Date();

  const summary = useMemo(() => {
    if (!appts.data) return null;
    const wh = hours.data?.find((h) => h.weekday === new Date().getDay());
    return buildDashboard(appts.data, new Date(), {
      dayStart: wh?.start_time,
      dayEnd: wh?.end_time,
      avgDuration: 40,
    });
  }, [appts.data, hours.data]);

  if (appts.loading) return <LoadingState />;
  if (appts.error) return <ErrorState message={appts.error} />;
  if (!summary) return null;

  const greeting =
    today.getHours() < 12 ? 'Bom dia' : today.getHours() < 18 ? 'Boa tarde' : 'Boa noite';
  const owner = settings.data?.owner_name?.split(' ')[0] ?? '';

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm text-ink-500">
            {greeting}
            {owner ? `, ${owner}` : ''} 👋
          </p>
          <h2 className="text-xl font-semibold text-ink-900">
            {capitalize(
              today.toLocaleDateString('pt-BR', {
                weekday: 'long',
                day: '2-digit',
                month: 'long',
              })
            )}
          </h2>
        </div>
        <Button onClick={() => openNewAppointment()} className="hidden sm:inline-flex">
          <CalendarPlus className="h-4 w-4" />
          Agendar
        </Button>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard
          label="Agendamentos hoje"
          value={String(summary.todayCount)}
          icon={CalendarDays}
          accent
        />
        <StatCard
          label="Concluídos"
          value={String(summary.todayCompleted)}
          hint="atendimentos de hoje"
          icon={CheckCircle2}
        />
        <StatCard
          label="Pendentes"
          value={String(summary.todayPending)}
          hint="aguardando atendimento"
          icon={Clock4}
        />
        <StatCard
          label="Cancelamentos"
          value={String(summary.todayCancelled)}
          hint="hoje"
          icon={Ban}
        />
        <StatCard
          label="Faturamento do dia"
          value={formatCurrency(summary.todayRevenue)}
          hint={`previsto ${formatCurrency(summary.todayExpectedRevenue)}`}
          icon={Wallet}
          accent
        />
        <StatCard
          label="Faturamento do mês"
          value={formatCurrency(summary.monthRevenue)}
          hint="somente concluídos"
          icon={TrendingUp}
        />
      </div>

      {/* Proximos atendimentos */}
      <Card>
        <CardHeader className="flex items-center justify-between gap-3">
          <CardTitle>Próximos atendimentos</CardTitle>
          <Link
            href="/agenda"
            className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-ink-700 transition-colors hover:text-ink-900 hover:underline"
          >
            Ver agenda <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </CardHeader>
        <CardContent>
          {summary.upcoming.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="Nada mais para hoje"
              description="Aproveite para preencher a agenda dos próximos dias."
              action={
                <Button onClick={() => openNewAppointment()}>
                  <CalendarPlus className="h-4 w-4" />
                  Novo agendamento
                </Button>
              }
            />
          ) : (
            <div className="space-y-2.5">
              {summary.upcoming.map((a) => (
                <AppointmentCard
                  key={a.id}
                  appointment={a}
                  onClick={() => router.push('/agenda')}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Servicos mais realizados */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scissors className="h-4 w-4 text-gold-600" /> Serviços mais realizados
            </CardTitle>
          </CardHeader>
          <CardContent>
            {summary.topServices.length === 0 ? (
              <p className="py-8 text-center text-sm text-ink-500">Sem dados no mês.</p>
            ) : (
              <div className="divide-y divide-ink-100">
                {summary.topServices.map((s, i) => (
                  <div key={s.label} className="flex items-center gap-3 px-1 py-2.5">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink-100 text-xs font-semibold text-ink-700">
                      {i + 1}
                    </span>
                    <p className="min-w-0 flex-1 truncate text-sm text-ink-700">{s.label}</p>
                    <span className="shrink-0 text-xs text-ink-500">{s.value}x</span>
                    <span className="shrink-0 text-sm font-semibold text-ink-900">
                      {formatCurrency(s.revenue)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Desempenho por barbeiro */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCog className="h-4 w-4 text-gold-600" /> Desempenho por barbeiro
            </CardTitle>
          </CardHeader>
          <CardContent>
            {summary.barbers.length === 0 ? (
              <p className="py-8 text-center text-sm text-ink-500">Sem dados no mês.</p>
            ) : (
              <div className="divide-y divide-ink-100">
                {summary.barbers.map((b) => (
                  <div key={b.name} className="flex items-center gap-3 px-1 py-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink-100 text-xs font-semibold text-ink-700">
                      {b.name.charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink-900">{b.name}</p>
                      <p className="text-xs text-ink-500">
                        {b.completed} de {b.total} concluído(s)
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-ink-900">
                      {formatCurrency(b.revenue)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
