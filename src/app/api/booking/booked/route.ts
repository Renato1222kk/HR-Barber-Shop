import { NextResponse, type NextRequest } from 'next/server';
import { bookingClient, isValidISODate } from '@/lib/booking/server';
import { BOOKING_GENERIC_ERROR } from '@/lib/booking/errors';
import type { BookedSlot, BookedSlotsResult } from '@/lib/booking/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_STORE = { 'Cache-Control': 'no-store, max-age=0' };

/**
 * Horários já marcados num dia (público, sem login).
 *
 * A anonimização acontece no banco (public_booked_slots): o nome completo,
 * WhatsApp e qualquer dado interno nunca chegam aqui. Mesmo assim, a
 * resposta é montada campo a campo — se a função passar a devolver algo a
 * mais no futuro, isso não vaza para o navegador.
 */
export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get('date');
  if (!date || !isValidISODate(date)) {
    return NextResponse.json({ error: 'Data inválida.' }, { status: 400, headers: NO_STORE });
  }

  const supabase = bookingClient();
  if (!supabase) {
    return NextResponse.json({ error: BOOKING_GENERIC_ERROR }, { status: 503, headers: NO_STORE });
  }

  const { data, error } = await supabase.rpc('public_booked_slots', { p_date: date });
  if (error) {
    return NextResponse.json(
      { error: 'Não foi possível carregar os horários. Tente novamente.' },
      { status: 500, headers: NO_STORE }
    );
  }

  const rows = (data ?? []) as Record<string, unknown>[];
  const appointments: BookedSlot[] = rows
    .map((row) => ({
      startTime: String(row.start_time ?? '').slice(0, 5),
      endTime: String(row.end_time ?? '').slice(0, 5),
      displayName: String(row.display_name ?? 'Cliente'),
    }))
    .filter((slot) => slot.startTime.length === 5)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const result: BookedSlotsResult = { date, appointments };
  return NextResponse.json(result, { headers: NO_STORE });
}
