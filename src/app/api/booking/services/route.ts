import { NextResponse } from 'next/server';
import { bookingClient } from '@/lib/booking/server';
import { BOOKING_GENERIC_ERROR } from '@/lib/booking/errors';
import type { PublicService } from '@/lib/booking/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Somente serviços ativos da barbearia (id, nome, duração, preço). */
export async function GET() {
  const supabase = bookingClient();
  if (!supabase) {
    return NextResponse.json({ error: BOOKING_GENERIC_ERROR }, { status: 503 });
  }

  const { data, error } = await supabase.rpc('public_booking_services');
  if (error) {
    return NextResponse.json({ error: BOOKING_GENERIC_ERROR }, { status: 500 });
  }

  const services = ((data ?? []) as PublicService[]).map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    duration_minutes: Number(s.duration_minutes),
    price: Number(s.price),
  }));

  return NextResponse.json({ services });
}
