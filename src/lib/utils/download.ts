'use client';

/** Dispara o download de um texto gerado no navegador (CSV do financeiro). */
export function downloadTextFile(filename: string, content: string, mime = 'text/csv'): void {
  if (typeof window === 'undefined') return;
  const blob = new Blob([content], { type: `${mime};charset=utf-8;` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Libera a memoria do blob depois que o navegador iniciou o download.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
