'use client';

import type { PostgrestError } from '@supabase/supabase-js';
import {
  requireSupabaseBrowserClient,
  type AppSupabaseClient,
} from '@/lib/supabase/client';

/**
 * Mensagem unica de conflito de agenda, usada pela interface inteira.
 * Com um unico profissional, citar o barbeiro so confunde: o que importa
 * e que o horario ja esta ocupado.
 */
export const BARBER_CONFLICT_MESSAGE = 'Já existe um atendimento nesse horário.';

export const SESSION_EXPIRED_MESSAGE =
  'Sua sessão expirou. Entre novamente para continuar.';

export const CONNECTION_ERROR_MESSAGE =
  'Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.';

export const FORBIDDEN_MESSAGE =
  'Você não tem permissão para acessar estes dados.';

/** Cliente Supabase do navegador (lanca erro se faltar configuracao). */
export function db(): AppSupabaseClient {
  return requireSupabaseBrowserClient();
}

/**
 * Id do usuario logado — vira `owner_id` de tudo que for gravado.
 * Le a sessao em cache (sem ida ao servidor); quem realmente garante o
 * isolamento dos dados sao as politicas de RLS.
 */
export async function requireOwnerId(): Promise<string> {
  const { data, error } = await db().auth.getSession();
  if (error) throw new Error(SESSION_EXPIRED_MESSAGE);
  const userId = data.session?.user.id;
  if (!userId) throw new Error(SESSION_EXPIRED_MESSAGE);
  return userId;
}

function isPostgrestError(error: unknown): error is PostgrestError {
  return typeof error === 'object' && error !== null && 'code' in error && 'message' in error;
}

/**
 * Traduz o erro do Supabase para uma mensagem que faz sentido na tela.
 * `fallback` e usado quando o erro nao se encaixa em nenhum caso conhecido.
 */
export function toFriendlyError(error: unknown, fallback: string): Error {
  if (isPostgrestError(error)) {
    switch (error.code) {
      // Constraint de exclusao: dois atendimentos do mesmo barbeiro no
      // mesmo intervalo. E a protecao definitiva contra corrida.
      case '23P01':
        return new Error(BARBER_CONFLICT_MESSAGE);
      // Violacao de RLS.
      case '42501':
        return new Error(FORBIDDEN_MESSAGE);
      // JWT expirado / ausente.
      case 'PGRST301':
      case 'PGRST302':
        return new Error(SESSION_EXPIRED_MESSAGE);
      // Chave estrangeira apontando para um registro que nao existe mais.
      case '23503':
        return new Error('Registro relacionado não encontrado. Atualize a página e tente de novo.');
      default:
        break;
    }
    if (error.message?.includes('appointments_no_barber_overlap')) {
      return new Error(BARBER_CONFLICT_MESSAGE);
    }
    return new Error(error.message || fallback);
  }

  if (error instanceof Error) {
    // fetch falha assim quando nao ha rede ou o projeto esta pausado.
    if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
      return new Error(CONNECTION_ERROR_MESSAGE);
    }
    return error;
  }

  return new Error(fallback);
}

/** Lanca a versao amigavel do erro quando a consulta falhou. */
export function assertOk(error: PostgrestError | null, fallback: string): void {
  if (error) throw toFriendlyError(error, fallback);
}

/**
 * Envolve uma operacao de service: qualquer erro sai daqui ja traduzido.
 * Mantem um unico ponto de tratamento em vez de try/catch espalhado.
 */
export async function run<T>(fallback: string, operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw toFriendlyError(error, fallback);
  }
}

/**
 * O PostgREST devolve no maximo 1000 linhas por requisicao. Este helper
 * pagina ate acabar, para que relatorios e faturamento nunca trabalhem
 * com uma lista silenciosamente cortada.
 */
const PAGE_SIZE = 1000;
const MAX_PAGES = 50; // trava de seguranca: 50 mil registros

export async function fetchAllPages<T>(
  fetchPage: (from: number, to: number) => PromiseLike<{
    data: T[] | null;
    error: PostgrestError | null;
  }>
): Promise<T[]> {
  const all: T[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const from = page * PAGE_SIZE;
    const { data, error } = await fetchPage(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    const rows = data ?? [];
    all.push(...rows);
    if (rows.length < PAGE_SIZE) break;
  }
  return all;
}

/** Numeric do Postgres pode chegar como string; a interface espera number. */
export function toNumber(value: number | string | null): number {
  if (value === null) return 0;
  return typeof value === 'number' ? value : Number(value) || 0;
}

/** "09:00:00" -> "09:00" (a interface usa sempre HH:mm). */
export function toHHmm(value: string | null): string {
  return (value ?? '').slice(0, 5);
}
