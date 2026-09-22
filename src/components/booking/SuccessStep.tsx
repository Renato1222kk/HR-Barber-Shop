'use client';

import { Check, CalendarPlus, MessageCircle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatDateLong } from '@/lib/utils/format';
import { bookingWhatsappMessage, whatsappLink } from '@/lib/utils/whatsapp';
import { downloadICS } from '@/lib/utils/calendar';
import { BRAND } from '@/lib/constants';
import type { CreateBookingResult, PublicSettings } from '@/lib/booking/types';

interface SuccessStepProps {
  result: CreateBookingResult;
  settings: PublicSettings | null;
  onReset: () => void;
}

export function SuccessStep({ result, settings, onReset }: SuccessStepProps) {
  const business = settings?.business_name || BRAND.name;

  const handleWhatsapp = () => {
    if (!settings?.whatsapp) return;
    const message = bookingWhatsappMessage({
      name: result.client_name,
      date: result.date,
      time: result.start_time,
      service: result.service_name,
      business,
    });
    window.open(whatsappLink(settings.whatsapp, message), '_blank', 'noopener,noreferrer');
  };

  const handleCalendar = () => {
    downloadICS(
      {
        title: `${business} — ${result.service_name}`,
        description: `Agendamento de ${result.service_name} na ${business}.`,
        location: settings?.address || undefined,
        date: result.date,
        start: result.start_time,
        end: result.end_time,
      },
      'agendamento-hr-barber-shop.ics'
    );
  };

  return (
    <div className="flex animate-fade-in flex-col items-center py-6 text-center">
      <span className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-green-50 text-green-600 ring-8 ring-green-50/60 animate-scale-in">
        <Check className="h-10 w-10" strokeWidth={2.5} />
      </span>

      <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
        Seu horário está marcado!
      </h1>
      <p className="mt-2 max-w-xs text-sm leading-relaxed text-ink-500">
        Esperamos você na {business}.
      </p>

      {/* Resumo */}
      <div className="mt-6 w-full rounded-2xl border border-ink-200 bg-white p-5 text-left shadow-card">
        <p className="text-base font-semibold text-ink-900">{result.service_name}</p>
        <p className="mt-1 text-sm text-ink-600">{capitalize(formatDateLong(result.date))}</p>
        <p className="mt-0.5 text-sm text-ink-600">
          {result.start_time} – {result.end_time}
        </p>
        <div className="mt-3 border-t border-ink-100 pt-3">
          <p className="text-xs text-ink-400">Nome</p>
          <p className="text-sm font-medium text-ink-900">{result.client_name}</p>
        </div>
      </div>

      {/* Ações */}
      <div className="mt-6 w-full space-y-2.5">
        {settings?.whatsapp && (
          <Button size="lg" className="w-full" onClick={handleWhatsapp}>
            <MessageCircle className="h-4 w-4" />
            Falar com a {business}
          </Button>
        )}
        <Button variant="secondary" size="lg" className="w-full" onClick={handleCalendar}>
          <CalendarPlus className="h-4 w-4" />
          Adicionar ao calendário
        </Button>
        <Button variant="ghost" className="w-full" onClick={onReset}>
          <RotateCcw className="h-4 w-4" />
          Agendar outro horário
        </Button>
      </div>
    </div>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
