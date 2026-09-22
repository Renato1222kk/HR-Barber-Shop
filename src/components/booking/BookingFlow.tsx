'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { LogoMark } from '@/components/brand/Logo';
import { errorMessage } from '@/lib/utils/error';
import {
  createBooking,
  fetchAvailability,
  fetchPublicSettings,
  fetchServices,
} from '@/lib/booking/client';
import { BOOKING_ERRORS, BOOKING_GENERIC_ERROR } from '@/lib/booking/errors';
import type {
  CreateBookingResult,
  PublicService,
  PublicSettings,
} from '@/lib/booking/types';
import { BookingHeader } from './BookingHeader';
import { ServiceStep } from './ServiceStep';
import { DateStep } from './DateStep';
import { TimeStep } from './TimeStep';
import { DetailsStep, type DetailsValues } from './DetailsStep';
import { ConfirmStep } from './ConfirmStep';
import { SuccessStep } from './SuccessStep';
import { LoadingBlock, ErrorBlock } from './ui';

type Step = 'service' | 'date' | 'time' | 'details' | 'confirm' | 'success';

const EMPTY_DETAILS: DetailsValues = { name: '', whatsapp: '', notes: '' };

/** Passo do fluxo -> passo exibido no indicador (1..4; 0 = sem barra). */
const PROGRESS: Record<Step, number> = {
  service: 1,
  date: 2,
  time: 2,
  details: 3,
  confirm: 4,
  success: 0,
};

export function BookingFlow() {
  const [bootLoading, setBootLoading] = useState(true);
  const [bootError, setBootError] = useState<string | null>(null);
  const [settings, setSettings] = useState<PublicSettings | null>(null);
  const [services, setServices] = useState<PublicService[]>([]);

  const [step, setStep] = useState<Step>('service');
  const [service, setService] = useState<PublicService | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [details, setDetails] = useState<DetailsValues>(EMPTY_DETAILS);

  const [slots, setSlots] = useState<string[]>([]);
  const [nextAvailable, setNextAvailable] = useState<string | null>(null);
  const [availLoading, setAvailLoading] = useState(false);
  const [availError, setAvailError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<CreateBookingResult | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // ---- Carga inicial: serviços (obrigatório) + dados públicos (opcional) ----
  const boot = useCallback(async () => {
    setBootLoading(true);
    setBootError(null);
    try {
      const [settingsResult, servicesResult] = await Promise.allSettled([
        fetchPublicSettings(),
        fetchServices(),
      ]);
      if (settingsResult.status === 'fulfilled') setSettings(settingsResult.value);
      if (servicesResult.status === 'rejected') throw servicesResult.reason;
      setServices(servicesResult.value);
    } catch (e) {
      setBootError(errorMessage(e, BOOKING_GENERIC_ERROR));
    } finally {
      setBootLoading(false);
    }
  }, []);

  useEffect(() => {
    boot();
  }, [boot]);

  // ---- Disponibilidade real (banco) ----
  const loadAvailability = useCallback(async (serviceId: string, day: string) => {
    setAvailLoading(true);
    setAvailError(null);
    try {
      const data = await fetchAvailability(serviceId, day);
      setSlots(data.slots);
      setNextAvailable(data.next_available_date);
    } catch (e) {
      setSlots([]);
      setNextAvailable(null);
      setAvailError(errorMessage(e, BOOKING_GENERIC_ERROR));
    } finally {
      setAvailLoading(false);
    }
  }, []);

  // ---- Handlers de navegação ----
  const handleSelectService = (next: PublicService) => {
    setService((prev) => {
      if (prev?.id !== next.id) {
        setTime(null);
        setSlots([]);
      }
      return next;
    });
    setStep('date');
  };

  const handleSelectDate = (day: string) => {
    setDate(day);
    setTime(null);
    setNotice(null);
    setStep('time');
    if (service) loadAvailability(service.id, day);
  };

  const handleGoToDate = (day: string) => {
    setDate(day);
    setTime(null);
    if (service) loadAvailability(service.id, day);
  };

  const handleSelectTime = (t: string) => {
    setTime(t);
    setNotice(null);
    setStep('details');
  };

  const handleSubmitDetails = (values: DetailsValues) => {
    setDetails(values);
    setSubmitError(null);
    setStep('confirm');
  };

  const handleConfirm = async () => {
    if (!service || !date || !time) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const booking = await createBooking({
        serviceId: service.id,
        date,
        startTime: time,
        name: details.name,
        whatsapp: details.whatsapp,
        notes: details.notes || undefined,
      });
      setResult(booking);
      setStep('success');
    } catch (e) {
      const message = errorMessage(e, BOOKING_GENERIC_ERROR);
      // Corrida: o horário foi reservado por outra pessoa. Volta para a
      // seleção de horário com a lista atualizada.
      if (message === BOOKING_ERRORS.BOOKING_SLOT_TAKEN) {
        setNotice(message);
        setTime(null);
        setStep('time');
        loadAvailability(service.id, date);
      } else {
        setSubmitError(message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    setNotice(null);
    setSubmitError(null);
    setStep((s) => {
      switch (s) {
        case 'date':
          return 'service';
        case 'time':
          return 'date';
        case 'details':
          return 'time';
        case 'confirm':
          return 'details';
        default:
          return s;
      }
    });
  };

  const handleReset = () => {
    setStep('service');
    setService(null);
    setDate(null);
    setTime(null);
    setDetails(EMPTY_DETAILS);
    setSlots([]);
    setNextAvailable(null);
    setResult(null);
    setNotice(null);
    setSubmitError(null);
  };

  const showBack = step === 'date' || step === 'time' || step === 'details' || step === 'confirm';

  return (
    <div className="flex min-h-dvh flex-col">
      <BookingHeader
        businessName={settings?.business_name || 'HR Barber Shop'}
        current={PROGRESS[step]}
        showBack={showBack}
        onBack={handleBack}
      />

      <main className="flex-1">
        <div className="mx-auto w-full max-w-[640px] px-4 py-6 sm:px-6">
          {bootLoading && <LogoLoading />}

          {!bootLoading && bootError && (
            <div className="pt-6">
              <ErrorBlock
                message={bootError}
                action={
                  <Button size="sm" variant="secondary" onClick={boot}>
                    Tentar novamente
                  </Button>
                }
              />
            </div>
          )}

          {!bootLoading && !bootError && (
            <>
              {notice && step === 'time' && (
                <div className="mb-4">
                  <ErrorBlock message={notice} />
                </div>
              )}

              {step === 'service' && (
                <ServiceStep
                  services={services}
                  settings={settings}
                  selectedId={service?.id ?? null}
                  onSelect={handleSelectService}
                />
              )}

              {step === 'date' && (
                <DateStep settings={settings} selected={date} onSelect={handleSelectDate} />
              )}

              {step === 'time' && date && (
                <TimeStep
                  date={date}
                  slots={slots}
                  loading={availLoading}
                  error={availError}
                  nextAvailableDate={nextAvailable}
                  selected={time}
                  onSelect={handleSelectTime}
                  onGoToDate={handleGoToDate}
                  onRetry={() => service && loadAvailability(service.id, date)}
                />
              )}

              {step === 'details' && (
                <DetailsStep initial={details} onSubmit={handleSubmitDetails} />
              )}

              {step === 'confirm' && service && date && time && (
                <ConfirmStep
                  service={service}
                  date={date}
                  time={time}
                  name={details.name}
                  whatsapp={details.whatsapp}
                  notes={details.notes}
                  submitting={submitting}
                  error={submitError}
                  onConfirm={handleConfirm}
                  onEdit={() => setStep('details')}
                />
              )}

              {step === 'success' && result && (
                <SuccessStep result={result} settings={settings} onReset={handleReset} />
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function LogoLoading() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20">
      <LogoMark size="lg" priority className="animate-pulse" />
      <LoadingBlock label="Carregando..." />
    </div>
  );
}
