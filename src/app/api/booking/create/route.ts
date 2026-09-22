import { NextResponse, type NextRequest } from 'next/server';
import {
  bookingClient,
  isDuplicateSubmission,
  isUuid,
  isValidISODate,
  isValidTime,
} from '@/lib/booking/server';
import {
  bookingErrorCode,
  bookingErrorMessage,
  BOOKING_GENERIC_ERROR,
} from '@/lib/booking/errors';
import { isValidFullName, normalizeFullName } from '@/lib/utils/name';
import { isValidWhatsapp, whatsappDigits } from '@/lib/utils/whatsapp';
import type { CreateBookingResult } from '@/lib/booking/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Cria o agendamento. A validação e a re-checagem de disponibilidade
 * definitivas acontecem dentro da função create_public_booking (uma única
 * transação, com a constraint GiST fechando a corrida). Aqui filtramos
 * formato, bloqueamos reenvio duplicado e traduzimos erros.
 */
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Requisição inválida.' }, { status: 400 });
  }

  const serviceId = body.serviceId;
  const date = body.date;
  const startTime = body.startTime;
  const rawName = typeof body.name === 'string' ? body.name : '';
  const rawWhatsapp = typeof body.whatsapp === 'string' ? body.whatsapp : '';
  const rawNotes = typeof body.notes === 'string' ? body.notes : '';

  // ---- Validação de formato (defesa + anti-spam) ----
  if (!isUuid(serviceId)) {
    return NextResponse.json({ error: bookingErrorMessage('BOOKING_INVALID_SERVICE') }, { status: 400 });
  }
  if (typeof date !== 'string' || !isValidISODate(date)) {
    return NextResponse.json({ error: bookingErrorMessage('BOOKING_INVALID_DATE') }, { status: 400 });
  }
  if (typeof startTime !== 'string' || !isValidTime(startTime)) {
    return NextResponse.json({ error: bookingErrorMessage('BOOKING_INVALID_TIME') }, { status: 400 });
  }
  const name = normalizeFullName(rawName);
  if (!isValidFullName(name)) {
    return NextResponse.json({ error: bookingErrorMessage('BOOKING_INVALID_NAME') }, { status: 400 });
  }
  if (!isValidWhatsapp(rawWhatsapp)) {
    return NextResponse.json({ error: bookingErrorMessage('BOOKING_INVALID_PHONE') }, { status: 400 });
  }
  const notes = rawNotes.trim().slice(0, 500);

  // ---- Anti-reenvio (duplo clique / POST repetido) ----
  const now = Date.now();
  const key = `${whatsappDigits(rawWhatsapp)}|${serviceId}|${date}|${startTime}`;
  if (isDuplicateSubmission(key, now)) {
    return NextResponse.json(
      { error: 'Recebemos seu pedido. Aguarde um instante.' },
      { status: 429 }
    );
  }

  const supabase = bookingClient();
  if (!supabase) {
    return NextResponse.json({ error: BOOKING_GENERIC_ERROR }, { status: 503 });
  }

  const { data, error } = await supabase.rpc('create_public_booking', {
    p_service_id: serviceId,
    p_date: date,
    p_start_time: startTime,
    p_client_name: name,
    p_client_whatsapp: rawWhatsapp,
    p_notes: notes || null,
  });

  if (error) {
    const code = bookingErrorCode(error.message);
    const status = code === 'BOOKING_SLOT_TAKEN' ? 409 : code ? 422 : 500;
    return NextResponse.json({ error: bookingErrorMessage(code) }, { status });
  }

  const booking = data as CreateBookingResult;
  return NextResponse.json({ booking }, { status: 201 });
}
