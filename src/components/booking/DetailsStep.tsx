'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui/Button';
import { FULL_NAME_MESSAGE, isValidFullName, normalizeFullName } from '@/lib/utils/name';
import { isValidWhatsapp, maskWhatsappInput } from '@/lib/utils/whatsapp';
import { StepTitle, StickyActionBar } from './ui';

export interface DetailsValues {
  name: string;
  whatsapp: string;
  notes: string;
}

interface DetailsStepProps {
  initial: DetailsValues;
  onSubmit: (values: DetailsValues) => void;
}

const inputClass =
  'w-full rounded-xl border border-ink-200 bg-white px-4 py-3 text-base text-ink-900 placeholder:text-ink-400 outline-none transition-colors focus:border-ink-900 focus:ring-1 focus:ring-ink-900';

export function DetailsStep({ initial, onSubmit }: DetailsStepProps) {
  const [name, setName] = useState(initial.name);
  const [whatsapp, setWhatsapp] = useState(initial.whatsapp);
  const [notes, setNotes] = useState(initial.notes);
  const [touched, setTouched] = useState({ name: false, whatsapp: false });

  const nameValid = isValidFullName(name);
  const whatsappValid = isValidWhatsapp(whatsapp);
  const showNameError = touched.name && !nameValid;
  const showWhatsappError = touched.whatsapp && !whatsappValid;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ name: true, whatsapp: true });
    if (!nameValid || !whatsappValid) return;
    onSubmit({ name: normalizeFullName(name), whatsapp, notes: notes.trim() });
  };

  return (
    <form onSubmit={handleSubmit} className="animate-fade-in" noValidate>
      <StepTitle
        title="Agora precisamos dos seus dados"
        subtitle="Usamos seu WhatsApp apenas para confirmar o atendimento."
      />

      <div className="space-y-4">
        <div>
          <label htmlFor="booking-name" className="mb-1.5 block text-sm font-medium text-ink-700">
            Nome completo <span className="text-red-500">*</span>
          </label>
          <input
            id="booking-name"
            type="text"
            autoComplete="name"
            autoCapitalize="words"
            enterKeyHint="next"
            placeholder="Ex.: Renato Oliveira"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, name: true }))}
            className={cn(inputClass, showNameError && 'border-red-400 focus:border-red-500 focus:ring-red-500')}
            aria-invalid={showNameError}
          />
          {showNameError && <p className="mt-1.5 text-xs text-red-600">{FULL_NAME_MESSAGE}</p>}
        </div>

        <div>
          <label htmlFor="booking-whatsapp" className="mb-1.5 block text-sm font-medium text-ink-700">
            WhatsApp <span className="text-red-500">*</span>
          </label>
          <input
            id="booking-whatsapp"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            enterKeyHint="next"
            placeholder="(32) 98483-8707"
            value={whatsapp}
            onChange={(e) => setWhatsapp(maskWhatsappInput(e.target.value))}
            onBlur={() => setTouched((t) => ({ ...t, whatsapp: true }))}
            className={cn(
              inputClass,
              showWhatsappError && 'border-red-400 focus:border-red-500 focus:ring-red-500'
            )}
            aria-invalid={showWhatsappError}
          />
          {showWhatsappError && (
            <p className="mt-1.5 text-xs text-red-600">Informe um WhatsApp válido com DDD.</p>
          )}
        </div>

        <div>
          <label htmlFor="booking-notes" className="mb-1.5 block text-sm font-medium text-ink-700">
            Observação <span className="font-normal text-ink-400">(opcional)</span>
          </label>
          <textarea
            id="booking-notes"
            rows={3}
            maxLength={500}
            placeholder="Alguma preferência? Conte pra gente."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className={cn(inputClass, 'resize-none')}
          />
        </div>
      </div>

      <StickyActionBar>
        <Button type="submit" size="lg" className="w-full">
          Revisar agendamento
        </Button>
      </StickyActionBar>
    </form>
  );
}
