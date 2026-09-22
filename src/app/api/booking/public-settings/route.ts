import { NextResponse } from 'next/server';
import { bookingClient } from '@/lib/booking/server';
import { BOOKING_GENERIC_ERROR } from '@/lib/booking/errors';
import type { PublicSettings } from '@/lib/booking/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Dados PUBLICOS da barbearia: nome, WhatsApp, endereço e horários. */
export async function GET() {
  const supabase = bookingClient();
  if (!supabase) {
    return NextResponse.json({ error: BOOKING_GENERIC_ERROR }, { status: 503 });
  }

  const { data, error } = await supabase.rpc('public_booking_settings');
  if (error) {
    return NextResponse.json({ error: BOOKING_GENERIC_ERROR }, { status: 500 });
  }

  const settings = (data ?? null) as PublicSettings | null;
  return NextResponse.json({ settings });
}
