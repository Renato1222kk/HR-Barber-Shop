'use client';

import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import { ErrorState, Toggle } from '@/components/ui/Misc';
import { createBarber, updateBarber } from '@/lib/data/repository';
import { errorMessage } from '@/lib/utils/error';
import { emitDataChanged } from '@/lib/events';
import type { Barber, BarberInput } from '@/types';

interface Props {
  open: boolean;
  onClose: () => void;
  barber?: Barber | null;
}

const empty: BarberInput = {
  name: '',
  phone: '',
  specialty: '',
  active: true,
  work_start: '09:00',
  work_end: '19:00',
};

export function BarberModal({ open, onClose, barber }: Props) {
  const isEdit = Boolean(barber);
  const [form, setForm] = useState<BarberInput>(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (barber) {
      const { id, created_at, ...rest } = barber;
      setForm(rest);
    } else {
      setForm(empty);
    }
  }, [open, barber]);

  const set = (patch: Partial<BarberInput>) => setForm((f) => ({ ...f, ...patch }));

  const submit = async () => {
    if (!form.name.trim()) {
      setError('Informe o nome do barbeiro.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (isEdit && barber) await updateBarber(barber.id, form);
      else await createBarber(form);
      emitDataChanged();
      onClose();
    } catch (e) {
      setError(errorMessage(e, 'Erro ao salvar barbeiro.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar barbeiro' : 'Novo barbeiro'}
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
            placeholder="Nome do barbeiro"
            value={form.name}
            onChange={(e) => set({ name: e.target.value })}
          />
        </Field>
        <Field label="Telefone" hint="Apenas números, com DDD">
          <Input
            inputMode="numeric"
            placeholder="11988887777"
            value={form.phone}
            onChange={(e) => set({ phone: e.target.value })}
          />
        </Field>
        <Field label="Especialidade">
          <Input
            placeholder="Ex.: degradê, barba, navalhado"
            value={form.specialty}
            onChange={(e) => set({ specialty: e.target.value })}
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Início do expediente">
            <Input
              type="time"
              value={form.work_start}
              onChange={(e) => set({ work_start: e.target.value })}
            />
          </Field>
          <Field label="Fim do expediente">
            <Input
              type="time"
              value={form.work_end}
              onChange={(e) => set({ work_end: e.target.value })}
            />
          </Field>
        </div>
        <div className="flex items-center justify-between rounded-xl bg-ink-900 px-4 py-3">
          <span className="text-sm text-zinc-300">Barbeiro ativo</span>
          <Toggle checked={form.active} onChange={(v) => set({ active: v })} />
        </div>
      </div>
    </Modal>
  );
}
