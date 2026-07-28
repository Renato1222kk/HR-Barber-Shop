import type { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Roda em todas as rotas, exceto:
     * - arquivos internos do Next (_next/static, _next/image)
     * - favicon, manifest, service worker e a logo
     * - qualquer arquivo com extensao (imagens, fontes, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)',
  ],
};
