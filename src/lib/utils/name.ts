// =====================================================================
// Validacao de nome completo — ponto unico de verdade.
//
// Usada pela pagina publica de agendamento (cliente) e revalidada no
// banco (create_public_booking). O objetivo e recusar "Joao" ou "Teste"
// sem ser agressivo com nomes legitimos: aceita acentos, nomes compostos
// e nao exige o padrao ocidental "nome + sobrenome".
// =====================================================================

export const FULL_NAME_MESSAGE = 'Informe seu nome completo.';

const MAX_NAME_LENGTH = 80;

/** Colapsa espacos e remove sobras nas pontas. */
export function normalizeFullName(raw: string): string {
  return (raw ?? '').replace(/\s+/g, ' ').trim();
}

/**
 * Nome e considerado completo quando, apos limpo, tem:
 *   * no minimo 3 caracteres e no maximo 80;
 *   * pelo menos duas palavras;
 *   * ao menos duas palavras com 2+ letras (evita "J P" ou "a b").
 * Aceita letras com acento, hifen e apostrofo (Sant'Ana, Jean-Paul).
 */
// Letras latinas com acentos (cobre o portugues). Sem o flag `u` para
// manter compatibilidade com o target de compilacao do projeto.
const LETTER = 'A-Za-zÀ-ÿ';
const NAME_RE = new RegExp(`^[${LETTER}][${LETTER}\\s'-]*$`);
const NON_LETTER_RE = new RegExp(`[^${LETTER}]`, 'g');

export function isValidFullName(raw: string): boolean {
  const name = normalizeFullName(raw);
  if (name.length < 3 || name.length > MAX_NAME_LENGTH) return false;

  // Apenas letras (com acentos), espacos, hifen e apostrofo.
  if (!NAME_RE.test(name)) return false;

  const words = name.split(' ');
  if (words.length < 2) return false;

  const significant = words.filter((w) => w.replace(NON_LETTER_RE, '').length >= 2);
  return significant.length >= 2;
}
