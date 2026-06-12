'use client';

// Bus minimo para avisar paginas que os dados mudaram (refetch).
const EVENT = 'bruno:data-changed';

export function emitDataChanged() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(EVENT));
}

export function onDataChanged(handler: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}
