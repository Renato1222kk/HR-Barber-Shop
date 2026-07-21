'use client';

import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Field, Input, Textarea } from '@/components/ui/Field';
import { ErrorState } from '@/components/ui/Misc';
import { createClient, updateClient } from '@/lib/data/repository';
import { errorMessage } from '@/lib/utils/error';
import { emitDataChanged } from '@/lib/events';
import type { Client, ClientInput } from '@/types';

interface Props {
  open: boolean;
  onClose: () => void;
  client?: Client | null;
}

const empty: ClientInput = { name: '', whatsapp: '', birth_date: null, notes: null };

export function ClientModal({ open, onClose, client }: Props) {
  const isEdit = Boolean(client);
  const [form, setForm] = useState<ClientInput>(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (client) {
      const { id, created_at, ...rest } = client;
      setForm(rest);
    } else {
      setForm(empty);
    }
  }, [open, client]);

  const set = (patch: Partial<ClientInput>) => setForm((f) => ({ ...f, ...patch }));

  const submit = async () => {
    if (!form.name.trim()) {
      setError('Informe o nome do cliente.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (isEdit && client) await updateClient(client.id, form);
      else await createClient(form);
      emitDataChanged();
      onClose();
    } catch (e) {
      setError(errorMessage(e, 'Erro ao salvar cliente.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar cliente' : 'Novo cliente'}
      footer={
        <>
          <Button variant="secondary" className="flex-1" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button className="flex-1" onClick={submit} loading={saving}>
            Salvar
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <ErrorState message={error} />}
        <Field label="Nome">
          <Input
            placeholder="Nome completo"
            value={form.name}
            onChange={(e) => set({ name: e.target.value })}
          />
        </Field>
        <Field label="WhatsApp" hint="Apenas números, com DDD">
          <Input
            inputMode="numeric"
            placeholder="11988887777"
            value={form.whatsapp}
            onChange={(e) => set({ whatsapp: e.target.value })}
          />
        </Field>
        <Field label="Data de nascimento">
          <Input
            type="date"
            value={form.birth_date ?? ''}
            onChange={(e) => set({ birth_date: e.target.value || null })}
          />
        </Field>
        <Field label="Observações">
          <Textarea
            placeholder="Preferências, histórico, etc."
            value={form.notes ?? ''}
            onChange={(e) => set({ notes: e.target.value || null })}
          />
        </Field>
      </div>
    </Modal>
  );
}
