// Traducao dos erros do agendamento publico para mensagens amigaveis.
//
// As funcoes RPC lancam textos-codigo (BOOKING_*). O cliente NUNCA deve
// ver erro de PostgreSQL, stack trace ou detalhe de constraint — apenas
// uma frase clara sobre o que fazer.

export const BOOKING_ERRORS: Record<string, string> = {
  BOOKING_SLOT_TAKEN: 'Esse horário acabou de ser reservado. Escolha outro horário.',
  BOOKING_INVALID_NAME: 'Informe seu nome completo.',
  BOOKING_INVALID_PHONE: 'Informe um WhatsApp válido com DDD.',
  BOOKING_INVALID_SERVICE: 'Serviço indisponível. Atualize a página e tente novamente.',
  BOOKING_INVALID_DATE: 'Escolha uma data válida.',
  BOOKING_INVALID_TIME: 'Escolha um horário válido.',
  BOOKING_UNAVAILABLE: 'O agendamento online está indisponível no momento.',
};

export const BOOKING_GENERIC_ERROR =
  'Não foi possível concluir seu agendamento. Tente novamente.';

/** Extrai o codigo BOOKING_* de um erro do PostgREST/Supabase, se houver. */
export function bookingErrorCode(message: string | null | undefined): string | null {
  if (!message) return null;
  const match = message.match(/BOOKING_[A-Z_]+/);
  return match ? match[0] : null;
}

/** Mensagem amigavel a partir de um codigo (ou a generica). */
export function bookingErrorMessage(code: string | null | undefined): string {
  if (code && BOOKING_ERRORS[code]) return BOOKING_ERRORS[code];
  return BOOKING_GENERIC_ERROR;
}
