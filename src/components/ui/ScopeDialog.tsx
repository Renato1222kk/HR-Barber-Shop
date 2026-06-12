'use client';

import { CalendarClock, CalendarCheck2, Repeat } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import type { EditScope } from '@/types';

interface ScopeDialogProps {
  open: boolean;
  title?: string;
  description?: string;
  oneLabel?: string;
  seriesLabel?: string;
  loading?: boolean;
  onChoose: (scope: EditScope) => void;
  onClose: () => void;
}

export function ScopeDialog({
  open,
  title = 'O que deseja alterar?',
  description = 'Este agendamento faz parte de uma serie recorrente.',
  oneLabel = 'Apenas este agendamento',
  seriesLabel = 'Toda a serie',
  loading,
  onChoose,
  onClose,
}: ScopeDialogProps) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="space-y-4">
        <div className="flex items-center gap-3 rounded-xl bg-gold/10 px-4 py-3 text-gold">
          <Repeat className="h-5 w-5 shrink-0" />
          <p className="text-sm">{description}</p>
        </div>

        <div className="space-y-2.5">
          <button
            disabled={loading}
            onClick={() => onChoose('one')}
            className="flex w-full items-center gap-3 rounded-xl border border-ink-600 bg-ink-900 px-4 py-3.5 text-left transition-colors hover:border-gold/50 hover:bg-ink-800 disabled:opacity-50"
          >
            <CalendarCheck2 className="h-5 w-5 text-zinc-300" />
            <span className="text-sm font-medium text-white">{oneLabel}</span>
          </button>

          <button
            disabled={loading}
            onClick={() => onChoose('series')}
            className="flex w-full items-center gap-3 rounded-xl border border-ink-600 bg-ink-900 px-4 py-3.5 text-left transition-colors hover:border-gold/50 hover:bg-ink-800 disabled:opacity-50"
          >
            <CalendarClock className="h-5 w-5 text-zinc-300" />
            <span className="text-sm font-medium text-white">{seriesLabel}</span>
          </button>
        </div>

        <Button variant="secondary" className="w-full" onClick={onClose} disabled={loading}>
          Cancelar
        </Button>
      </div>
    </Modal>
  );
}
