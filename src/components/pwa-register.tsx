'use client';

import { useEffect } from 'react';

/**
 * Registra o service worker do PWA.
 *
 * Regras:
 * - só roda no cliente, depois da hidratação (não renderiza nada, então não
 *   existe risco de mismatch entre servidor e navegador);
 * - só em produção: em `next dev` o service worker serviria assets antigos e
 *   atrapalharia o hot reload;
 * - espera o `load` para não competir com o carregamento inicial da página;
 * - quando o navegador encontra uma versão nova, o novo worker assume no
 *   próximo carregamento. Não damos `location.reload()` aqui de propósito:
 *   recarregar sozinho causaria loop se a instalação falhasse.
 */
export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
        // Navegador sem suporte, modo privado ou origem sem HTTPS:
        // o app continua funcionando normalmente, apenas sem cache offline.
      });
    };

    if (document.readyState === 'complete') {
      register();
      return;
    }

    window.addEventListener('load', register);
    return () => window.removeEventListener('load', register);
  }, []);

  return null;
}
