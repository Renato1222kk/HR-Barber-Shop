'use client';

import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select } from '@/components/ui/Field';
import { ErrorState } from '@/components/ui/Misc';
import { cn } from '@/lib/utils/cn';
import { toISODate } from '@/lib/utils/format';
import { errorMessage } from '@/lib/utils/error';
import { createFinancialEntry, updateFinancialEntry } from '@/services';
import { emitDataChanged } from '@/lib/events';
import type {
  FinancialEntry,
  FinancialEntryInput,
  FinancialEntryType,
  PaymentMethod,
} from '@/types';

interface Props {
  open: boolean;
  onClose: () => void;
  entry?: FinancialEntry | null;
}

export const ENTRY_CATEGORIES = [
  'produtos',
  'comissao',
  'aluguel',
  'salario',
  'marketing',
  'manutencao',
  'outros',
];

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  dinheiro: 'Dinheiro',
  pix: 'Pix',
  debito: 'Cartão de débito',
  credito: 'Cartão de crédito',
  outro: 'Outro',
};

const CATEGORY_LABELS: Record<string, string> = {
  produtos: 'Produtos',
  comissao: 'Comissão',
  aluguel: 'Aluguel',
  salario: 'Salário',
  marketing: 'Marketing',
  manutencao: 'Manutenção',
  outros: 'Outros',
};

export function categoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? category;
}

const emptyEntry = (): FinancialEntryInput => ({
  appointment_id: null,
  type: 'expense',
  category: 'outros',
  description: '',
  amount: 0,
  payment_method: null,
  occurred_at: toISODate(new Date()),
});

/** Cadastro de receita ou despesa avulsa (fora da agenda). */
export function EntryModal({ open, onClose, entry }: Props) {
  const isEdit = Boolean(entry);
  const [form, setForm] = useState<FinancialEntryInput>(emptyEntry);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (entry) {
      const { id, created_at, ...rest } = entry;
      setForm(rest);
    } else {
      setForm(emptyEntry());
    }
  }, [open, entry]);

  const set = (patch: Partial<FinancialEntryInput>) => setForm((f) => ({ ...f, ...patch }));

  const submit = async () => {
    if (!form.description.trim()) {
      setError('Informe uma descrição para o lançamento.');
      return;
    }
    if (!(form.amount > 0)) {
      setError('O valor precisa ser maior que zero.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (isEdit && entry) await updateFinancialEntry(entry.id, form);
      else await createFinancialEntry(form);
      emitDataChanged();
      onClose();
    } catch (e) {
      setError(errorMessage(e, 'Erro ao salvar o lançamento.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar lançamento' : 'Novo lançamento'}
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

        {/* Tipo do lancamento */}
        <div className="grid grid-cols-2 gap-2">
          {(['income', 'expense'] as FinancialEntryType[]).map((type) => {
            const active = form.type === type;
            const isIncome = type === 'income';
            return (
              <button
                key={type}
                type="button"
                onClick={() => set({ type })}
                className={cn(
                  'rounded-xl border px-4 py-3 text-sm font-medium transition-colors',
                  active
                    ? isIncome
                      ? 'border-green-300 bg-green-50 text-green-700'
                      : 'border-red-300 bg-red-50 text-red-700'
                    : 'border-ink-200 text-ink-600 hover:border-ink-300 hover:text-ink-900'
                )}
              >
                {isIncome ? 'Receita' : 'Despesa'}
              </button>
            );
          })}
        </div>

        <Field label="Descrição">
          <Input
            placeholder="Ex.: compra de pomadas"
            value={form.description}
            onChange={(e) => set({ description: e.target.value })}
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Valor (R$)">
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={form.amount}
              onChange={(e) => set({ amount: Number(e.target.value) || 0 })}
            />
          </Field>
          <Field label="Data">
            <Input
              type="date"
              value={form.occurred_at}
              onChange={(e) => set({ occurred_at: e.target.value })}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Categoria">
            <Select value={form.category} onChange={(e) => set({ category: e.target.value })}>
              {ENTRY_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {categoryLabel(category)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Forma de pagamento">
            <Select
              value={form.payment_method ?? ''}
              onChange={(e) =>
                set({ payment_method: (e.target.value || null) as PaymentMethod | null })
              }
            >
              <option value="">Não informado</option>
              {(Object.keys(PAYMENT_LABELS) as PaymentMethod[]).map((method) => (
                <option key={method} value={method}>
                  {PAYMENT_LABELS[method]}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </div>
    </Modal>
  );
}
