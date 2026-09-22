'use client';

// Ponte do navegador com as rotas /api/booking/*. O cliente publico só
// conhece estes endpoints — nunca fala direto com o Supabase.

import { BOOKING_GENERIC_ERROR } from './errors';
import type {
  AvailabilityResult,
  CreateBookingInput,
  CreateBookingResult,
  PublicService,
  PublicSettings,
} from './types';

/** Lê a mensagem de erro amigável enviada pela API (ou uma padrão). */
async function readError(res: Response): Promise<string> {
  try {
    const body = await res.json();
    if (body && typeof body.error === 'string') return body.error;
  } catch {
    // corpo sem JSON — cai na mensagem padrão
  }
  return BOOKING_GENERIC_ERROR;
}

export async function fetchPublicSettings(): Promise<PublicSettings | null> {
  const res = await fetch('/api/booking/public-settings', { cache: 'no-store' });
  if (!res.ok) throw new Error(await readError(res));
  const body = await res.json();
  return (body.settings ?? null) as PublicSettings | null;
}

export async function fetchServices(): Promise<PublicService[]> {
  const res = await fetch('/api/booking/services', { cache: 'no-store' });
  if (!res.ok) throw new Error(await readError(res));
  const body = await res.json();
  return (body.services ?? []) as PublicService[];
}

export async function fetchAvailability(
  serviceId: string,
  date: string
): Promise<AvailabilityResult> {
  const params = new URLSearchParams({ serviceId, date });
  const res = await fetch(`/api/booking/availability?${params.toString()}`, {
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as AvailabilityResult;
}

export async function createBooking(
  input: CreateBookingInput
): Promise<CreateBookingResult> {
  const res = await fetch('/api/booking/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await readError(res));
  const body = await res.json();
  return body.booking as CreateBookingResult;
}
