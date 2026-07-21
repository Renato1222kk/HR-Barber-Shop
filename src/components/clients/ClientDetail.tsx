'use client';

import { useState } from 'react';
import { Pencil, Trash2, Phone, Cake, History, Scissors } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { StatusBadge } from '@/components/ui/Misc';
import { WhatsAppButton } from '@/components/WhatsAppButton';
import {
  formatCurrency,
  formatDateFull,
  formatDateShort,
  daysSince,
} from '@/lib/utils/format';
import { formatWhatsappDisplay, comebackMessage } from '@/lib/utils/whatsapp';
import { deleteClient } from '@/lib/data/repository';
import { emitDataChanged } from '@/lib/events';
import type { Appointment, ClientWithStats } from '@/types';

interface Props {
  client: ClientWithStats | null;
  appointments: Appointment[];
  onClose: () => void;
  onEdit: (c: ClientWithStats) => void;
}

export function ClientDetail({ client, appointments, onClose, onEdit }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!client) return null;

  const history = appointments
    .filter((a) => a.client_id === client.id)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 12);

  const handleDelete = async () => {
    setBusy(true);
    try {
      await deleteClient(client.id);
      emitDataChanged();
      setConfirming(false);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Modal open={Boolean(client)} onClose={onClose} title="Cliente" size="lg">
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gold/15 text-base font-semibold text-gold">
              {client.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-lg font-semibold text-white">{client.name}</h3>
              {client.whatsapp && (
                <p className="flex items-center gap-1.5 text-sm text-zinc-400">
                  <Phone className="h-3.5 w-3.5" /> {formatWhatsappDisplay(client.whatsapp)}
                </p>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2.5">
            <Stat label="Atendimentos" value={String(client.appointments_count)} />
            <Stat label="Total gasto" value={formatCurrency(client.total_spent)} accent />
            <Stat
              label="Última visita"
              value={client.last_visit ? formatDateShort(client.last_visit) : '—'}
            />
          </div>

          <div className="space-y-1.5 rounded-xl bg-ink-900 p-4 text-sm">
            {client.top_service && (
              <div className="flex items-center gap-2.5 text-zinc-300">
                <Scissors className="h-4 w-4 text-zinc-500" /> Serviço frequente:{' '}
                <span className="font-medium text-white">{client.top_service}</span>
              </div>
            )}
            {client.birth_date && (
              <div className="flex items-center gap-2.5 text-zinc-300">
                <Cake className="h-4 w-4 text-zinc-500" /> {formatDateFull(client.birth_date)}
              </div>
            )}
            {client.notes && <p className="pt-1 text-zinc-400">{client.notes}</p>}
          </div>

          {/* Botao retorno cliente sumido */}
          {client.whatsapp && client.last_visit && daysSince(client.last_visit) > 30 && (
            <WhatsAppButton
              number={client.whatsapp}
              message={comebackMessage(client.name)}
              label="Chamar de volta (sem visita há tempo)"
              className="w-full"
            />
          )}

          {/* Historico */}
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-zinc-400">
              <History className="h-3.5 w-3.5" /> Histórico de atendimentos
            </p>
            {history.length === 0 ? (
              <p className="rounded-xl bg-ink-900 px-4 py-6 text-center text-sm text-zinc-500">
                Sem atendimentos registrados.
              </p>
            ) : (
              <div className="space-y-1.5">
                {history.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between rounded-lg bg-ink-900 px-3 py-2.5 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-white">{a.service_name}</p>
                      <p className="truncate text-xs text-zinc-500">
                        {formatDateFull(a.date)}
                        {a.barber_name && ` · ${a.barber_name}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <StatusBadge status={a.status} />
                      <span className="font-medium text-gold">{formatCurrency(a.price)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => onEdit(client)}>
              <Pencil className="h-4 w-4" /> Editar
            </Button>
            <Button variant="danger" className="flex-1" onClick={() => setConfirming(true)}>
              <Trash2 className="h-4 w-4" /> Excluir
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirming}
        title="Excluir cliente?"
        description={`${client.name} será removido. Os agendamentos não serão apagados.`}
        loading={busy}
        onConfirm={handleDelete}
        onClose={() => setConfirming(false)}
      />
    </>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl bg-ink-900 p-3 text-center">
      <p className={`text-base font-semibold ${accent ? 'text-gold' : 'text-white'}`}>{value}</p>
      <p className="mt-0.5 text-[11px] text-zinc-500">{label}</p>
    </div>
  );
}
