'use client';

import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Field, Input, Textarea } from '@/components/ui/Field';
import { ErrorState, Toggle } from '@/components/ui/Misc';
import { createService, updateService } from '@/lib/data/repository';
import { emitDataChanged } from '@/lib/events';
import type { Service, ServiceInput } from '@/types';

interface Props {
  open: boolean;
  onClose: () => void;
  service?: Service | null;
}

const empty: ServiceInput = {
  name: '',
  description: null,
  duration_minutes: 30,
  price: 0,
  active: true,
};

export function ServiceModal({ open, onClose, service }: Props) {
  const isEdit = Boolean(service);
  const [form, setForm] = useState<ServiceInput>(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (service) {
      const { id, created_at, user_id, ...rest } = service;
      setForm(rest);
    } else {
      setForm(empty);
    }
  }, [open, service]);

  const set = (patch: Partial<ServiceInput>) => setForm((f) => ({ ...f, ...patch }));

  const submit = async () => {
    if (!form.name.trim()) return setError('Informe o nome do servico.');
    setSaving(true);
    setError(null);
    try {
      if (isEdit && service) await updateService(service.id, form);
      else await createService(form);
      emitDataChanged();
      onClose();
    } catch (e: any) {
      setError(e?.message ?? 'Erro ao salvar servico.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar servico' : 'Novo servico'}
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
        <Field label="Nome do servico">
          <Input
            placeholder="Ex.: Corte Masculino"
            value={form.name}
            onChange={(e) => set({ name: e.target.value })}
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Duracao (min)">
            <Input
              type="number"
              min={5}
              step={5}
              value={form.duration_minutes}
              onChange={(e) => set({ duration_minutes: Number(e.target.value) || 0 })}
            />
          </Field>
          <Field label="Valor (R$)">
            <Input
              type="number"
              min={0}
              step={5}
              value={form.price}
              onChange={(e) => set({ price: Number(e.target.value) || 0 })}
            />
          </Field>
        </div>
        <Field label="Descricao">
          <Textarea
            placeholder="Detalhes do servico (opcional)"
            value={form.description ?? ''}
            onChange={(e) => set({ description: e.target.value || null })}
          />
        </Field>
        <div className="flex items-center justify-between rounded-xl bg-ink-900 px-4 py-3">
          <span className="text-sm text-zinc-300">Servico ativo</span>
          <Toggle checked={form.active} onChange={(v) => set({ active: v })} />
        </div>
      </div>
    </Modal>
  );
}
