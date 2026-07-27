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
  description = 'Este agendamento faz parte de uma série recorrente.',
  oneLabel = 'Apenas este agendamento',
  seriesLabel = 'Toda a série',
  loading,
  onChoose,
  onClose,
}: ScopeDialogProps) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="space-y-4">
        <div className="flex items-center gap-3 rounded-xl border border-ink-200 bg-ink-50 px-4 py-3 text-ink-700">
          <Repeat className="h-5 w-5 shrink-0 text-gold-600" />
          <p className="text-sm">{description}</p>
        </div>

        <div className="space-y-2.5">
          <button
            disabled={loading}
            onClick={() => onChoose('one')}
            className="flex w-full items-center gap-3 rounded-xl border border-ink-200 bg-white px-4 py-3.5 text-left transition-colors hover:border-ink-300 hover:bg-ink-50 disabled:opacity-50"
          >
            <CalendarCheck2 className="h-5 w-5 text-ink-500" />
            <span className="text-sm font-medium text-ink-900">{oneLabel}</span>
          </button>

          <button
            disabled={loading}
            onClick={() => onChoose('series')}
            className="flex w-full items-center gap-3 rounded-xl border border-ink-200 bg-white px-4 py-3.5 text-left transition-colors hover:border-ink-300 hover:bg-ink-50 disabled:opacity-50"
          >
            <CalendarClock className="h-5 w-5 text-ink-500" />
            <span className="text-sm font-medium text-ink-900">{seriesLabel}</span>
          </button>
        </div>

        <Button variant="secondary" className="w-full" onClick={onClose} disabled={loading}>
          Cancelar
        </Button>
      </div>
    </Modal>
  );
}
