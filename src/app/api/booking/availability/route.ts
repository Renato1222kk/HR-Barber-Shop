import { NextResponse, type NextRequest } from 'next/server';
import { bookingClient, isUuid, isValidISODate } from '@/lib/booking/server';
import { BOOKING_GENERIC_ERROR } from '@/lib/booking/errors';
import type { AvailabilityResult } from '@/lib/booking/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Horários realmente livres para um serviço numa data. Toda a regra
 * (funcionamento, duração, intervalo, antecedência, conflitos) roda no
 * banco — aqui só validamos o formato e repassamos.
 */
export async function GET(request: NextRequest) {
  const serviceId = request.nextUrl.searchParams.get('serviceId');
  const date = request.nextUrl.searchParams.get('date');

  if (!isUuid(serviceId) || !date || !isValidISODate(date)) {
    return NextResponse.json({ error: 'Parâmetros inválidos.' }, { status: 400 });
  }

  const supabase = bookingClient();
  if (!supabase) {
    return NextResponse.json({ error: BOOKING_GENERIC_ERROR }, { status: 503 });
  }

  const { data, error } = await supabase.rpc('public_booking_availability', {
    p_service_id: serviceId,
    p_date: date,
  });
  if (error) {
    return NextResponse.json({ error: BOOKING_GENERIC_ERROR }, { status: 500 });
  }

  const slots = ((data ?? []) as string[]).map((t) => t.slice(0, 5));

  // Sem vaga no dia: sugere o próximo dia disponível.
  let nextAvailable: string | null = null;
  if (slots.length === 0) {
    const { data: nextData } = await supabase.rpc('public_booking_next_available', {
      p_service_id: serviceId,
      p_from: date,
    });
    nextAvailable = (nextData as string | null) ?? null;
  }

  const result: AvailabilityResult = { slots, next_available_date: nextAvailable };
  return NextResponse.json(result);
}
