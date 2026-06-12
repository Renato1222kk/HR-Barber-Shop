'use client';

import { useState } from 'react';
import { Plus, Scissors, Clock, Pencil, Trash2 } from 'lucide-react';
import { useAsync } from '@/lib/hooks';
import { listServices, updateService, deleteService } from '@/lib/data/repository';
import { formatCurrency } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { LoadingState, EmptyState, ErrorState, Toggle } from '@/components/ui/Misc';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ServiceModal } from '@/components/services/ServiceModal';
import { emitDataChanged } from '@/lib/events';
import type { Service } from '@/types';

export default function ServicosPage() {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [deleting, setDeleting] = useState<Service | null>(null);
  const [busy, setBusy] = useState(false);

  const { data, loading, error } = useAsync(() => listServices(), []);
  const services = data ?? [];

  const toggleActive = async (s: Service) => {
    await updateService(s.id, { active: !s.active });
    emitDataChanged();
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await deleteService(deleting.id);
      emitDataChanged();
      setDeleting(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500">
          {services.filter((s) => s.active).length} ativos · {services.length} no total
        </p>
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" /> Novo servico
        </Button>
      </div>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} />
      ) : services.length === 0 ? (
        <EmptyState
          icon={Scissors}
          title="Nenhum servico cadastrado"
          description="Cadastre os servicos oferecidos na barbearia."
          action={
            <Button onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" /> Novo servico
            </Button>
          }
        />
      ) : (
        <div className="space-y-2.5">
          {services.map((s) => (
            <Card key={s.id} className={cn('p-4', !s.active && 'opacity-60')}>
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold">
                  <Scissors className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-white">{s.name}</p>
                    {!s.active && (
                      <span className="rounded-full bg-ink-700 px-2 py-0.5 text-[10px] text-zinc-400">
                        inativo
                      </span>
                    )}
                  </div>
                  {s.description && (
                    <p className="truncate text-xs text-zinc-500">{s.description}</p>
                  )}
                  <div className="mt-1.5 flex items-center gap-3 text-xs text-zinc-400">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" /> {s.duration_minutes} min
                    </span>
                    <span className="font-semibold text-gold">{formatCurrency(s.price)}</span>
                  </div>
                </div>
                <Toggle checked={s.active} onChange={() => toggleActive(s)} />
              </div>

              <div className="mt-3 flex gap-2 border-t border-ink-700/60 pt-3">
                <Button variant="ghost" size="sm" className="flex-1" onClick={() => setEditing(s)}>
                  <Pencil className="h-4 w-4" /> Editar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 text-red-400 hover:bg-red-500/10"
                  onClick={() => setDeleting(s)}
                >
                  <Trash2 className="h-4 w-4" /> Excluir
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ServiceModal open={creating} onClose={() => setCreating(false)} />
      <ServiceModal open={Boolean(editing)} service={editing} onClose={() => setEditing(null)} />
      <ConfirmDialog
        open={Boolean(deleting)}
        title="Excluir servico?"
        description={deleting ? `"${deleting.name}" sera removido.` : ''}
        loading={busy}
        onConfirm={confirmDelete}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
