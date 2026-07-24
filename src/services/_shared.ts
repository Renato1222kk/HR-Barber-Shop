'use client';

// Utilidades compartilhadas pelos services do Supabase.
import type { PostgrestError } from '@supabase/supabase-js';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export { getSupabaseBrowserClient as db };

/** Códigos de erro do Postgres tratados de forma amigável. */
export const PG_EXCLUSION_VIOLATION = '23P01';

/** Converte um PostgrestError em Error com mensagem legível. */
export function toError(error: PostgrestError, fallback = 'Falha ao acessar os dados.'): Error {
  if (error.code === 'PGRST301' || error.message?.includes('JWT')) {
    return new Error('Sessão expirada. Faça login novamente.');
  }
  return new Error(error.message || fallback);
}

/** Normaliza "HH:MM:SS" (Postgres) para "HH:mm" usado no app. */
export function toHm(value: string | null | undefined): string {
  return value ? value.slice(0, 5) : '';
}

/** Igual a toHm, mas preserva null (campos opcionais como intervalo). */
export function toHmOrNull(value: string | null | undefined): string | null {
  return value ? value.slice(0, 5) : null;
}

/** Garante número a partir do numeric do Postgres (que pode vir como string). */
export function toNum(value: number | string | null | undefined): number {
  return Number(value ?? 0);
}
