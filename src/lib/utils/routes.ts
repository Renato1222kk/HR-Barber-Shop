import { HOME_ROUTE } from '@/lib/constants';

/**
 * Normaliza o destino de um redirecionamento.
 *
 * Aceita apenas caminhos internos (evita sair do app) e converte os links
 * antigos de `/dashboard`, que deixou de existir, para a rota principal —
 * assim ninguem cai em uma pagina inexistente.
 */
export function safeRedirectPath(path: string | null | undefined): string {
  if (!path || !path.startsWith('/') || path.startsWith('//')) return HOME_ROUTE;
  if (path === '/dashboard' || /^\/dashboard[/?#]/.test(path)) return HOME_ROUTE;
  return path;
}
