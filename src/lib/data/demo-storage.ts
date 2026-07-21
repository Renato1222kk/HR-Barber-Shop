'use client';

// Persistencia do modo demonstracao.
// Todo acesso ao localStorage do app passa por aqui: as paginas e componentes
// nunca falam direto com o storage do navegador.
import { seedDemoData, type DemoDatabase } from './demo-data';

export const STORAGE_KEY = 'hr-barber-shop:demo:v1';

// Cache em memoria para evitar JSON.parse a cada leitura.
let cache: DemoDatabase | null = null;

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function isValid(value: unknown): value is DemoDatabase {
  if (!value || typeof value !== 'object') return false;
  const db = value as Partial<DemoDatabase>;
  return (
    Array.isArray(db.barbers) &&
    Array.isArray(db.clients) &&
    Array.isArray(db.services) &&
    Array.isArray(db.appointments) &&
    Array.isArray(db.workingHours) &&
    Array.isArray(db.recurringGroups) &&
    Boolean(db.settings)
  );
}

function persist(): void {
  if (!isBrowser() || !cache) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {
    // Storage cheio ou indisponivel (aba anonima): o app segue com o cache em memoria.
  }
}

/**
 * Devolve o banco de demonstracao.
 * No servidor (SSR/build) retorna sempre uma copia nova dos dados iniciais,
 * sem cachear nada — as paginas so consultam dados no cliente.
 */
export function readDb(): DemoDatabase {
  if (!isBrowser()) return seedDemoData();
  if (cache) return cache;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (isValid(parsed)) {
        cache = parsed;
        return cache;
      }
    }
  } catch {
    // Conteudo corrompido: recomeca dos dados iniciais.
  }

  cache = seedDemoData();
  persist();
  return cache;
}

/** Aplica uma alteracao no banco e grava no navegador. */
export function writeDb<T>(mutate: (db: DemoDatabase) => T): T {
  const db = readDb();
  const result = mutate(db);
  persist();
  return result;
}

/** Apaga as alteracoes locais e volta aos dados iniciais de demonstracao. */
export function resetDb(): DemoDatabase {
  cache = seedDemoData();
  persist();
  return cache;
}

let idCounter = 0;

/** Identificador local unico e legivel (ex.: "a_1737045123456_3"). */
export function genId(prefix: string): string {
  idCounter += 1;
  return `${prefix}_${Date.now().toString(36)}_${idCounter}`;
}

export function nowISO(): string {
  return new Date().toISOString();
}
