'use client';

import { ChevronRight, Clock, MapPin, Phone, Scissors } from 'lucide-react';
import { LogoMark } from '@/components/brand/Logo';
import { formatWhatsappDisplay } from '@/lib/utils/whatsapp';
import type { PublicService, PublicSettings } from '@/lib/booking/types';
import { formatDuration, Price } from './ui';

interface ServiceStepProps {
  services: PublicService[];
  settings: PublicSettings | null;
  selectedId: string | null;
  onSelect: (service: PublicService) => void;
}

export function ServiceStep({ services, settings, selectedId, onSelect }: ServiceStepProps) {
  const business = settings?.business_name || 'HR Barber Shop';

  return (
    <div className="animate-fade-in">
      {/* Hero de boas-vindas */}
      <div className="mb-6 flex flex-col items-center text-center">
        <LogoMark size="lg" priority className="mb-4 shadow-soft" />
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900 sm:text-3xl">
          Agende seu horário
        </h1>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink-500">
          Escolha seu serviço, data e horário na {business}. É rápido e fácil.
        </p>

        {/* Informações públicas discretas */}
        {settings && (
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-xs text-ink-500">
            {settings.address && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-gold-600" />
                {settings.address}
              </span>
            )}
            {settings.whatsapp && (
              <span className="inline-flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-gold-600" />
                {formatWhatsappDisplay(settings.whatsapp)}
              </span>
            )}
          </div>
        )}
      </div>

      <h2 className="mb-3 text-base font-semibold text-ink-900">Qual serviço você deseja?</h2>

      {services.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ink-300 bg-ink-50 px-6 py-10 text-center text-sm text-ink-500">
          Nenhum serviço disponível no momento.
        </div>
      ) : (
        <ul className="space-y-3">
          {services.map((service) => {
            const selected = service.id === selectedId;
            return (
              <li key={service.id}>
                <button
                  type="button"
                  onClick={() => onSelect(service)}
                  aria-pressed={selected}
                  className={[
                    'group flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition-all',
                    'min-h-[76px] active:scale-[0.99]',
                    selected
                      ? 'border-ink-900 bg-ink-50 ring-1 ring-ink-900'
                      : 'border-ink-200 bg-white hover:border-ink-300 hover:shadow-card',
                  ].join(' ')}
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ink-100 text-ink-700">
                    <Scissors className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-semibold text-ink-900">
                      {service.name}
                    </span>
                    <span className="mt-0.5 flex items-center gap-2 text-xs text-ink-500">
                      <Clock className="h-3.5 w-3.5" />
                      {formatDuration(service.duration_minutes)}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1.5">
                    <Price value={service.price} className="text-sm" />
                    <ChevronRight className="h-5 w-5 text-ink-300 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
