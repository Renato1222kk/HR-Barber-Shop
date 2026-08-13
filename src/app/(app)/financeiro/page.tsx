'use client';

import { useCallback, useMemo, useState } from 'react';
import { Download, Filter, Plus, X } from 'lucide-react';
import { useAsync } from '@/lib/hooks';
import { listAppointments, listFinancialEntries, removeFinancialEntry } from '@/services';
import {
  EMPTY_FILTERS,
  appointmentsCSV,
  buildFinanceReport,
  buildRange,
  countActiveFilters,
  exportFileName,
  movementsCSV,
  previousRange,
  shiftRange,
  type FinanceFilters as Filters,
  type PeriodMode,
} from '@/lib/data/finance';
import { addDaysISO, todayISO, type ISODate } from '@/lib/utils/date';
import { downloadTextFile } from '@/lib/utils/download';
import { errorMessage } from '@/lib/utils/error';
import { STATUS_META, PAYMENT_METHOD_LABELS } from '@/lib/constants';
import { formatCurrency } from '@/lib/utils/format';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ErrorState } from '@/components/ui/Misc';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useShell } from '@/components/layout/AppShell';
import { emitDataChanged } from '@/lib/events';
import { FinancePeriodSelector } from '@/components/financeiro/FinancePeriodSelector';
import { FinanceSummary } from '@/components/financeiro/FinanceSummary';
import { FinanceResult } from '@/components/financeiro/FinanceResult';
import { DaySummary } from '@/components/financeiro/DaySummary';
import { FinanceAppointmentList } from '@/components/financeiro/FinanceAppointmentList';
import { RevenueChart, IncomeExpenseChart } from '@/components/financeiro/RevenueChart';
import { PaymentMethods } from '@/components/financeiro/PaymentMethods';
import { TopServices } from '@/components/financeiro/TopServices';
import { TopDays } from '@/components/financeiro/TopDays';
import { ExpenseCategories } from '@/components/financeiro/ExpenseCategories';
import { FinancialMovements } from '@/components/financeiro/FinancialMovements';
import { FinancialInsights } from '@/components/financeiro/FinancialInsights';
import { FinanceFilters } from '@/components/financeiro/FinanceFilters';
import { FinanceQuickActions } from '@/components/financeiro/FinanceQuickActions';
import { FinanceSkeleton } from '@/components/financeiro/FinanceSkeleton';
import { DayDetailsSheet } from '@/components/financeiro/DayDetailsSheet';
import { BreakdownSheet, type BreakdownData } from '@/components/financeiro/BreakdownSheet';
import { Section } from '@/components/financeiro/FinanceSection';
import { EntryModal } from '@/components/financeiro/EntryModal';
import type { FinancialEntry } from '@/types';

/**
 * Painel financeiro.
 *
 * A pagina so orquestra: escolhe o periodo, carrega UMA vez os
 * atendimentos e UMA vez os lancamentos que cobrem o periodo (mais o
 * anterior, usado na comparacao) e entrega tudo a `buildFinanceReport`.
 * Nenhum calculo financeiro acontece aqui dentro.
 */
export default function FinanceiroPage() {
  const today = useMemo<ISODate>(() => todayISO(), []);
  const { openNewAppointment } = useShell();

  // ---- Periodo em foco
  const [mode, setMode] = useState<PeriodMode>('day');
  const [anchor, setAnchor] = useState<ISODate>(today);
  const [custom, setCustom] = useState<{ start: ISODate; end: ISODate }>({
    start: today,
    end: today,
  });

  const range = useMemo(() => buildRange(mode, anchor, custom), [mode, anchor, custom]);

  // ---- Filtros
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const activeFilters = countActiveFilters(filters);

  // ---- Dados: duas consultas cobrindo periodo + comparacao + serie do grafico
  const bounds = useMemo(() => {
    const previous = previousRange(range);
    const chartStart = addDaysISO(range.start, -6);
    const from = [previous.start, chartStart].sort()[0];
    return { from, to: range.end };
  }, [range]);

  const apptQ = useAsync(
    () => listAppointments({ from: bounds.from, to: bounds.to }),
    [bounds.from, bounds.to]
  );
  const entryQ = useAsync(
    () => listFinancialEntries({ from: bounds.from, to: bounds.to }),
    [bounds.from, bounds.to]
  );

  const appointments = useMemo(() => apptQ.data ?? [], [apptQ.data]);
  const entries = useMemo(() => entryQ.data ?? [], [entryQ.data]);

  const report = useMemo(
    () => buildFinanceReport({ appointments, entries, range, filters }),
    [appointments, entries, range, filters]
  );

  // Opcoes do filtro de servico saem do proprio periodo carregado.
  const serviceOptions = useMemo(
    () =>
      Array.from(
        new Set(
          appointments
            .filter((a) => a.date >= range.start && a.date <= range.end)
            .map((a) => a.service_name)
            .filter(Boolean)
        )
      ).sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [appointments, range.start, range.end]
  );

  // ---- Detalhes e lancamentos
  const [dayDetail, setDayDetail] = useState<ISODate | null>(null);
  const [breakdown, setBreakdown] = useState<BreakdownData | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<FinancialEntry | null>(null);
  const [deleting, setDeleting] = useState<FinancialEntry | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const focusDay = useCallback((iso: ISODate) => {
    setMode('day');
    setAnchor(iso);
  }, []);

  // Ao sair do personalizado, a ancora passa a ser o inicio do intervalo em
  // foco — trocar de aba nao pode teleportar o usuario para outro mes.
  const changeMode = (next: PeriodMode) => {
    if (mode === 'custom') setAnchor(custom.start);
    setMode(next);
  };

  const shift = (step: number) => {
    const moved = shiftRange(range, step);
    if (moved.mode === 'custom') setCustom({ start: moved.start, end: moved.end });
    else setAnchor(moved.start);
  };

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

  const reloadAll = () => {
    apptQ.reload();
    entryQ.reload();
  };

  const loading = apptQ.loading || entryQ.loading;
  const loadError = apptQ.error || entryQ.error;

  return (
    <div className="space-y-4 animate-fade-in">
      <FinancePeriodSelector
        range={range}
        today={today}
        onModeChange={changeMode}
        onShift={shift}
        onToday={() => {
          setAnchor(today);
          if (mode === 'custom') setCustom({ start: today, end: today });
        }}
        onPickDate={(iso) => {
          setAnchor(iso);
          if (mode === 'custom') setCustom({ start: iso, end: iso });
        }}
        onCustom={(start, end) => {
          setCustom({ start, end });
          setMode('custom');
        }}
      />

      {/* Ações do período */}
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        <Button variant="secondary" onClick={() => setFiltersOpen(true)} className="min-w-0">
          <Filter className="h-4 w-4 shrink-0" />
          <span className="truncate">Filtros{activeFilters > 0 ? ` (${activeFilters})` : ''}</span>
        </Button>
        <Button variant="secondary" onClick={() => setExportOpen(true)} className="min-w-0">
          <Download className="h-4 w-4 shrink-0" />
          <span className="truncate">Exportar</span>
        </Button>
        <Button
          onClick={() => setCreating(true)}
          className="col-span-2 hidden sm:inline-flex"
        >
          <Plus className="h-4 w-4" />
          Nova movimentação
        </Button>
      </div>

      {activeFilters > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-ink-200 bg-white px-4 py-2.5">
          <p className="min-w-0 truncate text-xs text-ink-600">
            {activeFilters} filtro(s) aplicado(s) a toda a tela
          </p>
          <button
            onClick={() => setFilters(EMPTY_FILTERS)}
            className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-ink-900"
          >
            <X className="h-3.5 w-3.5" /> Limpar
          </button>
        </div>
      )}

      {actionError && <ErrorState message={actionError} />}

      {loading ? (
        <FinanceSkeleton />
      ) : loadError ? (
        <div className="space-y-3">
          <ErrorState message={loadError} />
          <Button variant="secondary" onClick={reloadAll} className="w-full sm:w-auto">
            Tentar novamente
          </Button>
        </div>
      ) : (
        <>
          <FinanceSummary report={report} onOpenDay={setDayDetail} />

          {range.mode === 'day' && (
            <>
              <DaySummary report={report} />
              <Section
                title="Atendimentos do dia"
                description={`${report.appointments.length} na agenda · ${report.completed} concluído(s)`}
              >
                <FinanceAppointmentList
                  appointments={report.appointments}
                  emptyLabel="Nenhum atendimento neste dia."
                />
              </Section>
            </>
          )}

          <Section
            title={report.seriesTitle}
            description={
              report.seriesGranularity === 'day'
                ? 'Toque em uma coluna para ver o dia'
                : 'Agrupado por semana'
            }
            flush
          >
            <RevenueChart
              data={report.series}
              onSelectDay={setDayDetail}
              highlight={range.mode === 'day' ? range.start : null}
            />
          </Section>

          {(report.expense > 0 || report.extraIncome > 0) && (
            <Section title="Receitas × despesas" flush>
              <IncomeExpenseChart data={report.series} />
            </Section>
          )}

          <FinanceResult report={report} />

          {range.mode !== 'day' && (
            <TopDays
              days={report.topDays.slice(0, 5)}
              title={range.mode === 'month' ? 'Melhores dias do mês' : 'Melhores dias do período'}
              onSelect={setDayDetail}
            />
          )}

          <PaymentMethods
            payments={report.payments}
            total={report.totalIncome}
            onSelect={(slice) =>
              setBreakdown({
                title: slice.label,
                subtitle: 'Recebido no período',
                total: slice.value,
                count: slice.count,
                appointments: report.completedAppointments.filter((a) =>
                  slice.method === 'nao_informado'
                    ? !a.payment_method
                    : a.payment_method === slice.method
                ),
                facts: [
                  {
                    label: 'Participação',
                    value: `${slice.percent.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`,
                  },
                  { label: 'Recebimentos', value: String(slice.count) },
                  {
                    label: 'Forma de pagamento',
                    value:
                      slice.method === 'nao_informado'
                        ? 'Não informado'
                        : PAYMENT_METHOD_LABELS[slice.method],
                  },
                ],
              })
            }
          />

          <TopServices
            services={report.services}
            onSelect={(service) =>
              setBreakdown({
                title: service.name,
                subtitle: 'Faturamento no período',
                total: service.revenue,
                count: service.count,
                appointments: report.completedAppointments.filter(
                  (a) => a.service_name === service.name
                ),
                facts: [
                  {
                    label: 'Participação no faturamento',
                    value: `${service.percent.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`,
                  },
                  {
                    label: 'Ticket médio',
                    value: formatCurrency(service.count ? service.revenue / service.count : 0),
                  },
                ],
              })
            }
          />

          {report.expense > 0 && (
            <ExpenseCategories categories={report.expenseCategories} total={report.expense} />
          )}

          <FinancialMovements
            movements={report.movements}
            onNew={() => setCreating(true)}
            onEditEntry={setEditing}
            onDeleteEntry={setDeleting}
            onOpenDay={setDayDetail}
          />

          <FinancialInsights insights={report.insights} />
        </>
      )}

      <FinanceQuickActions
        onNewMovement={() => setCreating(true)}
        onNewAppointment={() => openNewAppointment({ date: range.start })}
      />

      <FinanceFilters
        open={filtersOpen}
        filters={filters}
        services={serviceOptions}
        onClose={() => setFiltersOpen(false)}
        onApply={(next) => {
          setFilters(next);
          setFiltersOpen(false);
        }}
      />

      <DayDetailsSheet
        iso={dayDetail}
        appointments={appointments}
        entries={entries}
        filters={filters}
        today={today}
        onClose={() => setDayDetail(null)}
        onFocusDay={focusDay}
      />

      <BreakdownSheet data={breakdown} onClose={() => setBreakdown(null)} />

      <ExportSheet
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        onExportAppointments={() => {
          downloadTextFile(
            exportFileName('atendimentos', range),
            appointmentsCSV(report, (status) => STATUS_META[status].label)
          );
          setExportOpen(false);
        }}
        onExportMovements={() => {
          downloadTextFile(exportFileName('movimentacoes', range), movementsCSV(report));
          setExportOpen(false);
        }}
        appointmentsCount={report.appointments.length}
        movementsCount={report.movements.length}
      />

      <EntryModal
        open={creating}
        onClose={() => setCreating(false)}
        defaultDate={range.mode === 'day' ? range.start : today}
      />
      <EntryModal open={Boolean(editing)} entry={editing} onClose={() => setEditing(null)} />

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

function ExportSheet({
  open,
  onClose,
  onExportAppointments,
  onExportMovements,
  appointmentsCount,
  movementsCount,
}: {
  open: boolean;
  onClose: () => void;
  onExportAppointments: () => void;
  onExportMovements: () => void;
  appointmentsCount: number;
  movementsCount: number;
}) {
  return (
    <Modal open={open} onClose={onClose} title="Exportar período">
      <div className="space-y-2 pb-2">
        <ExportOption
          title="Atendimentos (CSV)"
          description={`${appointmentsCount} registro(s) · data, cliente, serviço, valor, pagamento e status`}
          disabled={appointmentsCount === 0}
          onClick={onExportAppointments}
        />
        <ExportOption
          title="Movimentações (CSV)"
          description={`${movementsCount} registro(s) · entradas e despesas do período`}
          disabled={movementsCount === 0}
          onClick={onExportMovements}
        />
      </div>
    </Modal>
  );
}

function ExportOption({
  title,
  description,
  disabled,
  onClick,
}: {
  title: string;
  description: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center gap-3 rounded-xl border border-ink-200 p-4 text-left transition-colors hover:bg-ink-50 active:bg-ink-100 disabled:cursor-not-allowed disabled:opacity-40"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ink-100 text-ink-700">
        <Download className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-ink-900">{title}</span>
        <span className="block text-xs text-ink-500">{description}</span>
      </span>
    </button>
  );
}
