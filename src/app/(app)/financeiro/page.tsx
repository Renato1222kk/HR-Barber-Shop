'use client';

import { useMemo, useState } from 'react';
import {
  Wallet,
  CalendarRange,
  TrendingUp,
  Receipt,
  CheckCircle2,
  Clock4,
  Ban,
  Plus,
  Pencil,
  Trash2,
  ArrowDownRight,
  ArrowUpRight,
  type LucideIcon,
} from 'lucide-react';
import { useAsync } from '@/lib/hooks';
import { listAppointments, listFinancialEntries, removeFinancialEntry } from '@/services';
import { buildEntriesSummary, buildFinance } from '@/lib/data/analytics';
import { formatCurrency, formatDateShort } from '@/lib/utils/format';
import { errorMessage } from '@/lib/utils/error';
import { STATUS_META } from '@/lib/constants';
import { StatCard } from '@/components/ui/StatCard';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/Misc';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { RevenueAreaChart, ServicesBarChart, StatusPieChart } from '@/components/charts/Charts';
import { EntryModal, categoryLabel } from '@/components/financeiro/EntryModal';
import { emitDataChanged } from '@/lib/events';
import type { FinancialEntry } from '@/types';

export default function FinanceiroPage() {
  const { data, loading, error } = useAsync(() => listAppointments(), []);
  const entriesQ = useAsync(() => listFinancialEntries(), []);

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<FinancialEntry | null>(null);
  const [deleting, setDeleting] = useState<FinancialEntry | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fin = useMemo(() => (data ? buildFinance(data, new Date()) : null), [data]);
  const entries = useMemo(() => entriesQ.data ?? [], [entriesQ.data]);
  const entriesSummary = useMemo(
    () => buildEntriesSummary(entries, fin?.monthRevenue ?? 0, new Date()),
    [entries, fin?.monthRevenue]
  );

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (!fin) return null;

  const statusPie = fin.statusCounts.map((s) => ({
    label: STATUS_META[s.status].label,
    value: s.count,
    color: STATUS_META[s.status].color,
  }));

  const confirmDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    setActionError(null);
    try {
      await removeFinancialEntry(deleting.id);
      emitDataChanged();
      setDeleting(null);
    } catch (e) {
      setActionError(errorMessage(e, 'Não foi possível excluir o lançamento.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Faturamento */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Faturamento do dia"
          value={formatCurrency(fin.dayRevenue)}
          icon={Wallet}
          hint={`${fin.dayCount} ${
            fin.dayCount === 1 ? 'atendimento concluído' : 'atendimentos concluídos'
          }`}
        />
        <StatCard label="Da semana" value={formatCurrency(fin.weekRevenue)} icon={CalendarRange} />
        <StatCard
          label="Do mês"
          value={formatCurrency(fin.monthRevenue)}
          icon={TrendingUp}
          accent
        />
        <StatCard
          label="Ticket médio"
          value={formatCurrency(fin.ticketAverage)}
          icon={Receipt}
          hint="por atendimento"
        />
      </div>

      {/* Contadores de status (mes) */}
      <div className="grid grid-cols-3 gap-3">
        <MiniStat
          icon={CheckCircle2}
          label="Concluídos"
          value={fin.completed}
          tone="text-ink-900"
        />
        <MiniStat icon={Clock4} label="Pendentes" value={fin.pending} tone="text-blue-600" />
        <MiniStat icon={Ban} label="Cancelados" value={fin.cancellations} tone="text-ink-600" />
      </div>

      {/* Grafico faturamento por dia */}
      <Card>
        <CardHeader>
          <CardTitle>Faturamento (últimos 14 dias)</CardTitle>
        </CardHeader>
        <CardContent>
          <RevenueAreaChart data={fin.revenueByDay} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Servicos mais realizados */}
        <Card>
          <CardHeader>
            <CardTitle>Serviços mais realizados</CardTitle>
          </CardHeader>
          <CardContent>
            {fin.topServices.length ? (
              <ServicesBarChart data={fin.topServices} />
            ) : (
              <p className="py-10 text-center text-sm text-ink-500">Sem dados no mês.</p>
            )}
          </CardContent>
        </Card>

        {/* Status dos agendamentos */}
        <Card>
          <CardHeader>
            <CardTitle>Status dos agendamentos (mês)</CardTitle>
          </CardHeader>
          <CardContent>
            <StatusPieChart data={statusPie} />
            <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1.5">
              {statusPie
                .filter((s) => s.value > 0)
                .map((s) => (
                  <span
                    key={s.label}
                    className="inline-flex items-center gap-1.5 text-xs text-ink-600"
                  >
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                    {s.label} ({s.value})
                  </span>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Faturamento por barbeiro */}
      <Card>
        <CardHeader>
          <CardTitle>Faturamento por barbeiro (mês)</CardTitle>
        </CardHeader>
        <CardContent>
          {fin.barbers.length ? (
            <div className="divide-y divide-ink-100">
              {fin.barbers.map((b) => (
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
          ) : (
            <p className="py-10 text-center text-sm text-ink-500">Sem dados no mês.</p>
          )}
        </CardContent>
      </Card>

      {/* Clientes que mais gastaram */}
      <Card>
        <CardHeader>
          <CardTitle>Clientes que mais gastaram (mês)</CardTitle>
        </CardHeader>
        <CardContent>
          {fin.topClients.length ? (
            <div className="divide-y divide-ink-100">
              {fin.topClients.map((c, i) => (
                <div key={c.name} className="flex items-center gap-3 px-1 py-2.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink-100 text-xs font-semibold text-ink-700">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink-900">{c.name}</p>
                    <p className="text-xs text-ink-500">{c.visits} atendimento(s)</p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-ink-900">
                    {formatCurrency(c.total)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-10 text-center text-sm text-ink-500">Sem dados no mês.</p>
          )}
        </CardContent>
      </Card>

      {/* Lancamentos manuais (receitas e despesas fora da agenda) */}
      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>Lançamentos do mês</CardTitle>
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> Novo lançamento
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <MiniStat
              icon={ArrowUpRight}
              label="Receitas avulsas"
              value={formatCurrency(entriesSummary.monthIncome)}
              tone="text-green-600"
            />
            <MiniStat
              icon={ArrowDownRight}
              label="Despesas"
              value={formatCurrency(entriesSummary.monthExpense)}
              tone="text-red-600"
            />
            <MiniStat
              icon={Wallet}
              label="Saldo do mês"
              value={formatCurrency(entriesSummary.monthBalance)}
              tone="text-ink-900"
            />
          </div>

          {actionError && <ErrorState message={actionError} />}
          {entriesQ.error && <ErrorState message={entriesQ.error} />}

          {entriesQ.loading ? (
            <LoadingState label="Carregando lançamentos..." />
          ) : entries.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="Nenhum lançamento registrado"
              description="Use os lançamentos para registrar despesas e receitas que não passam pela agenda."
              action={
                <Button onClick={() => setCreating(true)}>
                  <Plus className="h-4 w-4" /> Novo lançamento
                </Button>
              }
            />
          ) : (
            <div className="divide-y divide-ink-100">
              {entries.slice(0, 30).map((entry) => {
                const isIncome = entry.type === 'income';
                return (
                  <div key={entry.id} className="flex items-center gap-3 px-1 py-2.5">
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                        isIncome ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                      }`}
                    >
                      {isIncome ? (
                        <ArrowUpRight className="h-4 w-4" />
                      ) : (
                        <ArrowDownRight className="h-4 w-4" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink-900">
                        {entry.description}
                      </p>
                      <p className="truncate text-xs text-ink-500">
                        {formatDateShort(entry.occurred_at)} · {categoryLabel(entry.category)}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 text-sm font-semibold ${
                        isIncome ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {isIncome ? '+' : '−'} {formatCurrency(entry.amount)}
                    </span>
                    <div className="flex shrink-0 gap-1">
                      <button
                        onClick={() => setEditing(entry)}
                        aria-label={`Editar ${entry.description}`}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-900"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleting(entry)}
                        aria-label={`Excluir ${entry.description}`}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-500 transition-colors hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <EntryModal open={creating} onClose={() => setCreating(false)} />
      <EntryModal
        open={Boolean(editing)}
        entry={editing}
        onClose={() => setEditing(null)}
      />
      <ConfirmDialog
        open={Boolean(deleting)}
        title="Excluir lançamento?"
        description={deleting ? `"${deleting.description}" será removido.` : ''}
        loading={busy}
        onConfirm={confirmDelete}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: number | string;
  tone: string;
}) {
  return (
    <Card className="flex flex-col items-center gap-1 p-4 text-center">
      <Icon className={`h-5 w-5 ${tone}`} />
      <span className="w-full truncate text-lg font-semibold text-ink-900 sm:text-xl">{value}</span>
      <span className="text-[11px] text-ink-500">{label}</span>
    </Card>
  );
}
