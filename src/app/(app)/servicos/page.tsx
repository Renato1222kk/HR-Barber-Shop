'use client';

import { useState } from 'react';
import { Plus, Scissors, Clock, Pencil, Trash2 } from 'lucide-react';
import { useAsync } from '@/lib/hooks';
import { listServices, updateService, removeService } from '@/services';
import { formatCurrency } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';
import { errorMessage } from '@/lib/utils/error';
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
  const [actionError, setActionError] = useState<string | null>(null);

  const { data, loading, error } = useAsync(() => listServices(), []);
  const services = data ?? [];

  const toggleActive = async (s: Service) => {
    setActionError(null);
    try {
      await updateService(s.id, { active: !s.active });
      emitDataChanged();
    } catch (e) {
      setActionError(errorMessage(e, 'Não foi possível alterar o serviço.'));
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    setActionError(null);
    try {
      await removeService(deleting.id);
      emitDataChanged();
      setDeleting(null);
    } catch (e) {
      setActionError(errorMessage(e, 'Não foi possível excluir o serviço.'));
      setDeleting(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-ink-500">
          {services.filter((s) => s.active).length} ativos · {services.length} no total
        </p>
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Novo serviço</span>
          <span className="sm:hidden">Novo</span>
        </Button>
      </div>

      {actionError && <ErrorState message={actionError} />}

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} />
      ) : services.length === 0 ? (
        <EmptyState
          icon={Scissors}
          title="Nenhum serviço cadastrado"
          description="Cadastre os serviços oferecidos na barbearia."
          action={
            <Button onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" /> Novo serviço
            </Button>
          }
        />
      ) : (
        <div className="space-y-2.5">
          {services.map((s) => (
            <Card key={s.id} className={cn('p-4', !s.active && 'opacity-60')}>
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ink-100 text-ink-700">
                  <Scissors className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-ink-900">{s.name}</p>
                    {!s.active && (
                      <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[10px] text-ink-600">
                        inativo
                      </span>
                    )}
                  </div>
                  {s.description && (
                    <p className="truncate text-xs text-ink-500">{s.description}</p>
                  )}
                  <div className="mt-1.5 flex items-center gap-3 text-xs text-ink-600">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" /> {s.duration_minutes} min
                    </span>
                    <span className="font-semibold text-ink-900">{formatCurrency(s.price)}</span>
                  </div>
                </div>
                <Toggle checked={s.active} onChange={() => toggleActive(s)} />
              </div>

              <div className="mt-3 flex gap-2 border-t border-ink-200 pt-3">
                <Button variant="ghost" size="sm" className="flex-1" onClick={() => setEditing(s)}>
                  <Pencil className="h-4 w-4" /> Editar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 text-red-600 hover:bg-red-50 hover:text-red-700"
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
        title="Excluir serviço?"
        description={deleting ? `"${deleting.name}" será removido.` : ''}
        loading={busy}
        onConfirm={confirmDelete}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
