'use client';

import { useState } from 'react';
import { CalendarPlus, Plus, Wallet, type LucideIcon } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';

export interface QuickAction {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  onSelect: () => void;
  disabled?: boolean;
}

interface Props {
  onNewMovement: () => void;
  onNewAppointment: () => void;
}

/**
 * Botao de acoes do Financeiro (mobile).
 *
 * Fica no canto inferior direito, acima da barra de navegacao — o "+" do
 * centro da barra continua sendo o de novo agendamento.
 *
 * Lancamento por voz entra aqui como mais um item da lista `actions`
 * quando existir; nada mais precisa mudar.
 */
export function FinanceQuickActions({ onNewMovement, onNewAppointment }: Props) {
  const [open, setOpen] = useState(false);

  const actions: QuickAction[] = [
    {
      id: 'movement',
      label: 'Nova movimentação',
      description: 'Registrar uma entrada ou despesa',
      icon: Wallet,
      onSelect: onNewMovement,
    },
    {
      id: 'appointment',
      label: 'Novo agendamento',
      description: 'Abrir a agenda e marcar um horário',
      icon: CalendarPlus,
      onSelect: onNewAppointment,
    },
  ];

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Ações do financeiro"
        className="fixed right-4 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-30 flex h-14 w-14 items-center justify-center rounded-full bg-ink-950 text-white shadow-soft ring-4 ring-white transition-transform active:scale-95 lg:hidden"
      >
        <Plus className="h-6 w-6" strokeWidth={2.5} />
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="O que você quer registrar?">
        <div className="space-y-2 pb-2">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                type="button"
                disabled={action.disabled}
                onClick={() => {
                  setOpen(false);
                  action.onSelect();
                }}
                className="flex w-full items-center gap-3 rounded-xl border border-ink-200 p-4 text-left transition-colors hover:bg-ink-50 active:bg-ink-100 disabled:opacity-40"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ink-100 text-ink-700">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-ink-900">{action.label}</span>
                  <span className="block text-xs text-ink-500">{action.description}</span>
                </span>
              </button>
            );
          })}
        </div>
      </Modal>
    </>
  );
}
