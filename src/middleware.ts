import type { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

// Renova a sessão do Supabase e protege as rotas privadas a cada navegação.
export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Aplica a todas as rotas, exceto:
     * - arquivos estáticos do Next (_next/static, _next/image)
     * - favicon, manifesto, service worker, ícones e a logo
     * - qualquer arquivo com extensão (imagens, fontes etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icons/|.*\\.[^/]+$).*)',
  ],
};
