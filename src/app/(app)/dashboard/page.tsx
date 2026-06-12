'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  CalendarDays,
  Wallet,
  UserCheck,
  Clock4,
  Users,
  TrendingUp,
  CalendarPlus,
  ArrowRight,
} from 'lucide-react';
import { useAsync } from '@/lib/hooks';
import { listAppointments, listClients, listWorkingHours } from '@/lib/data/repository';
import { buildDashboard } from '@/lib/data/analytics';
import { formatCurrency, formatTime } from '@/lib/utils/format';
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
  const clients = useAsync(() => listClients(), []);
  const hours = useAsync(() => listWorkingHours(), []);

  const today = new Date();

  const summary = useMemo(() => {
    if (!appts.data) return null;
    const wd = today.getDay();
    const wh = hours.data?.find((h) => h.weekday === wd);
    return buildDashboard(appts.data, today, {
      dayStart: wh?.start_time,
      dayEnd: wh?.end_time,
      avgDuration: 40,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appts.data, hours.data]);

  if (appts.loading || clients.loading) return <LoadingState />;
  if (appts.error) return <ErrorState message={appts.error} />;
  if (!summary) return null;

  const greeting =
    today.getHours() < 12 ? 'Bom dia' : today.getHours() < 18 ? 'Boa tarde' : 'Boa noite';

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-sm text-zinc-500">{greeting}, Bruno 👋</p>
          <h2 className="text-xl font-semibold text-white">
            {today.toLocaleDateString('pt-BR', {
              weekday: 'long',
              day: '2-digit',
              month: 'long',
            })}
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
          label="Faturamento previsto"
          value={formatCurrency(summary.todayExpectedRevenue)}
          icon={Wallet}
          hint="hoje"
        />
        <StatCard
          label="Proximo cliente"
          value={summary.nextAppointment?.client_name ?? '—'}
          hint={
            summary.nextAppointment
              ? `${formatTime(summary.nextAppointment.start_time)} · ${summary.nextAppointment.service_name}`
              : 'sem proximos hoje'
          }
          icon={UserCheck}
        />
        <StatCard
          label="Horarios livres"
          value={String(summary.freeSlots)}
          hint="estimativa hoje"
          icon={Clock4}
        />
        <StatCard
          label="Clientes"
          value={String(clients.data?.length ?? 0)}
          hint="cadastrados"
          icon={Users}
        />
        <StatCard
          label="Faturamento do mes"
          value={formatCurrency(summary.monthRevenue)}
          icon={TrendingUp}
          accent
        />
      </div>

      {/* Proximos agendamentos do dia */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Agenda de hoje</CardTitle>
          <Link
            href="/agenda"
            className="inline-flex items-center gap-1 text-xs font-medium text-gold hover:underline"
          >
            Ver agenda <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </CardHeader>
        <CardContent>
          {summary.todayList.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="Nenhum agendamento hoje"
              description="Aproveite para preencher a agenda ou descansar."
              action={
                <Button onClick={() => openNewAppointment()}>
                  <CalendarPlus className="h-4 w-4" />
                  Novo agendamento
                </Button>
              }
            />
          ) : (
            <div className="space-y-2.5">
              {summary.todayList.map((a) => (
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
    </div>
  );
}
