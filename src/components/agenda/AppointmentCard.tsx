'use client';

import { Clock, MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { STATUS_META } from '@/lib/constants';
import { formatCurrency, formatTime } from '@/lib/utils/format';
import { StatusBadge } from '@/components/ui/Misc';
import { WhatsAppButton } from '@/components/WhatsAppButton';
import { confirmationMessage } from '@/lib/utils/whatsapp';
import type { Appointment } from '@/types';

interface Props {
  appointment: Appointment;
  onClick?: () => void;
  compact?: boolean;
  showWhatsapp?: boolean;
}

export function AppointmentCard({ appointment: a, onClick, compact, showWhatsapp = true }: Props) {
  const meta = STATUS_META[a.status];

  return (
    <button
      onClick={onClick}
      className={cn(
        'group flex w-full items-center gap-3 rounded-xl border border-ink-700/60 border-l-4 bg-ink-850 px-3 py-3 text-left transition-colors hover:border-ink-600 hover:bg-ink-800',
        meta.bar
      )}
    >
      <div className="flex w-14 shrink-0 flex-col items-center">
        <span className="text-base font-semibold text-white">{formatTime(a.start_time)}</span>
        <span className="text-[11px] text-zinc-500">{formatTime(a.end_time)}</span>
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-white">{a.client_name}</p>
        <p className="truncate text-xs text-zinc-400">
          {a.service_name}
          {a.barber_name && <span className="text-zinc-500"> · {a.barber_name}</span>}
        </p>
        {!compact && (
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <StatusBadge status={a.status} />
            <span className="inline-flex items-center gap-1 text-[11px] text-zinc-500">
              <Clock className="h-3 w-3" />
              {a.duration_minutes}min
            </span>
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <span className="text-sm font-semibold text-gold">{formatCurrency(a.price)}</span>
        {showWhatsapp && a.client_whatsapp && (
          <span onClick={(e) => e.stopPropagation()}>
            <WhatsAppButton
              iconOnly
              number={a.client_whatsapp}
              message={confirmationMessage({
                name: a.client_name,
                date: a.date,
                time: a.start_time,
                service: a.service_name,
              })}
            />
          </span>
        )}
        <MoreVertical className="h-4 w-4 text-zinc-600 group-hover:text-zinc-400" />
      </div>
    </button>
  );
}
