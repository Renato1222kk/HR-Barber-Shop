'use client';

import { useMemo, useState } from 'react';
import { Plus, UserCog, Clock, Pencil, Trash2, Phone } from 'lucide-react';
import { useAsync } from '@/lib/hooks';
import { deleteBarber, listAppointments, listBarbers, updateBarber } from '@/lib/data/repository';
import { formatCurrency } from '@/lib/utils/format';
import { formatWhatsappDisplay } from '@/lib/utils/whatsapp';
import { buildBarberPerformance } from '@/lib/data/analytics';
import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { LoadingState, EmptyState, ErrorState, Toggle } from '@/components/ui/Misc';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { BarberModal } from '@/components/barbers/BarberModal';
import { emitDataChanged } from '@/lib/events';
import type { Barber } from '@/types';

export default function BarbeirosPage() {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Barber | null>(null);
  const [deleting, setDeleting] = useState<Barber | null>(null);
  const [busy, setBusy] = useState(false);

  const barbersQ = useAsync(() => listBarbers(), []);
  const apptsQ = useAsync(() => listAppointments(), []);
  const barbers = barbersQ.data ?? [];

  const performance = useMemo(() => {
    const map = new Map<string, { total: number; completed: number; revenue: number }>();
    buildBarberPerformance(apptsQ.data ?? []).forEach((p) => map.set(p.name, p));
    return map;
  }, [apptsQ.data]);

  const toggleActive = async (b: Barber) => {
    await updateBarber(b.id, { active: !b.active });
    emitDataChanged();
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await deleteBarber(deleting.id);
      emitDataChanged();
      setDeleting(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-zinc-500">
          {barbers.filter((b) => b.active).length} ativos · {barbers.length} no total
        </p>
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Novo barbeiro</span>
          <span className="sm:hidden">Novo</span>
        </Button>
      </div>

      {barbersQ.loading ? (
        <LoadingState />
      ) : barbersQ.error ? (
        <ErrorState message={barbersQ.error} />
      ) : barbers.length === 0 ? (
        <EmptyState
          icon={UserCog}
          title="Nenhum barbeiro cadastrado"
          description="Cadastre a equipe da barbearia para organizar a agenda."
          action={
            <Button onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" /> Novo barbeiro
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-2">
          {barbers.map((b) => {
            const stats = performance.get(b.name);
            return (
              <Card key={b.id} className={cn('p-4', !b.active && 'opacity-60')}>
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gold/15 text-sm font-semibold text-gold">
                    {b.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold text-white">{b.name}</p>
                      {!b.active && (
                        <span className="shrink-0 rounded-full bg-ink-700 px-2 py-0.5 text-[10px] text-zinc-400">
                          inativo
                        </span>
                      )}
                    </div>
                    {b.specialty && (
                      <p className="truncate text-xs text-zinc-500">{b.specialty}</p>
                    )}
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-400">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" /> {b.work_start} – {b.work_end}
                      </span>
                      {b.phone && (
                        <span className="inline-flex items-center gap-1">
                          <Phone className="h-3.5 w-3.5" /> {formatWhatsappDisplay(b.phone)}
                        </span>
                      )}
                    </div>
                  </div>
                  <Toggle checked={b.active} onChange={() => toggleActive(b)} />
                </div>

                {stats && (
                  <div className="mt-3 grid grid-cols-3 gap-2 border-t border-ink-700/60 pt-3 text-center">
                    <Stat label="Atendimentos" value={String(stats.total)} />
                    <Stat label="Concluídos" value={String(stats.completed)} />
                    <Stat label="Faturamento" value={formatCurrency(stats.revenue)} accent />
                  </div>
                )}

                <div className="mt-3 flex gap-2 border-t border-ink-700/60 pt-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1"
                    onClick={() => setEditing(b)}
                  >
                    <Pencil className="h-4 w-4" /> Editar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 text-red-400 hover:bg-red-500/10"
                    onClick={() => setDeleting(b)}
                  >
                    <Trash2 className="h-4 w-4" /> Excluir
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <BarberModal open={creating} onClose={() => setCreating(false)} />
      <BarberModal open={Boolean(editing)} barber={editing} onClose={() => setEditing(null)} />
      <ConfirmDialog
        open={Boolean(deleting)}
        title="Excluir barbeiro?"
        description={
          deleting
            ? `"${deleting.name}" será removido. Os agendamentos existentes não serão apagados.`
            : ''
        }
        loading={busy}
        onConfirm={confirmDelete}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-lg bg-ink-900 px-2 py-2">
      <p className={cn('truncate text-sm font-semibold', accent ? 'text-gold' : 'text-white')}>
        {value}
      </p>
      <p className="mt-0.5 text-[10px] text-zinc-500">{label}</p>
    </div>
  );
}
