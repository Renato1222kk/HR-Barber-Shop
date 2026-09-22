// Utilidades server-side compartilhadas pelas rotas /api/booking/*.
//
// Centraliza: validacao de formato, chamada de RPC e uma protecao simples
// contra POST duplicado (duplo clique / reenvio). Nenhuma chave
// administrativa e usada aqui — o cliente publico so alcanca as funcoes
// SECURITY DEFINER via a chave publishable.

import { createPublicBookingClient } from '@/lib/supabase/booking';
import { isValidISODate, isValidTime } from '@/lib/utils/date';

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}

export { isValidISODate, isValidTime };

/** Cliente publico ou `null` quando o Supabase nao esta configurado. */
export function bookingClient() {
  return createPublicBookingClient();
}

// ---------------------------------------------------------------------
// Anti-reenvio: bloqueia POSTs identicos numa janela curta.
//
// Guarda em memoria (por instancia) a ultima vez que uma combinacao
// nome+telefone+servico+data+horario foi recebida. A protecao definitiva
// contra horario duplicado e a constraint do banco; isto so evita o
// duplo clique acidental gerar trabalho/erro.
// ---------------------------------------------------------------------
const DEDUP_WINDOW_MS = 4000;
const recent = new Map<string, number>();

export function isDuplicateSubmission(key: string, now: number): boolean {
  // Limpeza oportunista para a memoria nao crescer.
  if (recent.size > 500) {
    recent.forEach((ts, k) => {
      if (now - ts > DEDUP_WINDOW_MS) recent.delete(k);
    });
  }
  const last = recent.get(key);
  recent.set(key, now);
  return last !== undefined && now - last < DEDUP_WINDOW_MS;
}
