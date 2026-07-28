/* Service Worker - HR Barber Shop
 *
 * Objetivo: deixar o aplicativo instalavel e utilizavel sem conexao nas
 * paginas ja visitadas, sem nunca guardar dados do Supabase nem respostas
 * de autenticacao.
 *
 * Ao mudar qualquer regra deste arquivo, suba a VERSION: os caches antigos
 * sao apagados no `activate`, entao a atualizacao chega sozinha.
 */
const VERSION = 'v4';
const SHELL_CACHE = `hr-barber-shell-${VERSION}`;
const PAGES_CACHE = `hr-barber-pages-${VERSION}`;
const ASSETS_CACHE = `hr-barber-assets-${VERSION}`;
const CURRENT_CACHES = [SHELL_CACHE, PAGES_CACHE, ASSETS_CACHE];

/* Arquivos publicos, sem nada de usuario. */
const SHELL = [
  '/login',
  '/manifest.webmanifest',
  '/hr-barber-shop-logo.jpeg',
  '/icons/favicon-32.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
];

/* Pagina mostrada quando nao ha rede nem versao em cache. */
const OFFLINE_HTML = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Sem conexão · HR Barber Shop</title>
<style>
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
    background:#f8f9fa;color:#111827;font-family:system-ui,-apple-system,sans-serif;padding:24px}
  .box{max-width:22rem;text-align:center;background:#fff;border:1px solid #e5e7eb;
    border-radius:20px;padding:32px 24px;box-shadow:0 8px 28px -12px rgba(17,24,39,.18)}
  h1{font-size:1.05rem;margin:0 0 8px}
  p{font-size:.875rem;line-height:1.6;color:#6b7280;margin:0}
</style></head>
<body><div class="box">
  <h1>Você está sem conexão</h1>
  <p>Reconecte-se à internet para carregar esta página do HR Barber Shop.</p>
</div></body></html>`;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL))
      .catch(() => {
        // Um arquivo ausente nao pode impedir a instalacao do worker.
      })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => !CURRENT_CACHES.includes(k)).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

/* O app avisa o worker ao sair da conta: as paginas guardadas sao descartadas. */
self.addEventListener('message', (event) => {
  if (event.data === 'clear-pages-cache') {
    event.waitUntil(caches.delete(PAGES_CACHE));
  }
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    /\.(?:png|jpe?g|svg|gif|webp|ico|woff2?|ttf|css|js)$/i.test(url.pathname)
  );
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Outras origens (Supabase, Google Fonts, etc.) passam direto pela rede:
  // nenhuma resposta com dados ou token entra no cache.
  if (url.origin !== self.location.origin) return;

  // Rotas de sessao e API tambem nunca sao guardadas.
  if (url.pathname.startsWith('/auth/') || url.pathname.startsWith('/api/')) return;

  // Dados de navegacao do Next (RSC/flight) carregam conteudo da conta.
  if (url.pathname.startsWith('/_next/data/') || url.searchParams.has('_rsc')) return;

  // ---- Navegacao: rede primeiro, cache como rede de seguranca ----
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // So o HTML da casca e guardado — os dados da barbearia sao
          // buscados no Supabase depois que a pagina abre.
          if (response && response.ok && response.type === 'basic') {
            const copy = response.clone();
            caches.open(PAGES_CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
          }
          return response;
        })
        .catch(async () => {
          const cached =
            (await caches.match(request, { ignoreSearch: true })) ||
            (await caches.match('/login'));
          return (
            cached ||
            new Response(OFFLINE_HTML, {
              status: 503,
              headers: { 'Content-Type': 'text/html; charset=utf-8' },
            })
          );
        })
    );
    return;
  }

  // ---- Assets estaticos: cache primeiro (sao versionados pelo Next) ----
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response && response.ok && response.type === 'basic') {
            const copy = response.clone();
            caches.open(ASSETS_CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
          }
          return response;
        });
      })
    );
    return;
  }

  // Qualquer outra coisa segue direto para a rede.
});
