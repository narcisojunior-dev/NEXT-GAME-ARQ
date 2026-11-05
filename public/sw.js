// Service Worker para execução 100% offline da PC Builder Academy em salas de aula (#24)
// - Navegação network-first: um deploy novo chega às máquinas que já abriram o jogo.
// - Arquivos com hash (/_next/static/) e modelos: cache-first.
// - Versão do cache vem do build (?v=<id do build> no registro), sem edição manual.
// - Uma versão nova NÃO assume a página no meio da montagem: ela espera o aluno tocar em
//   "Atualizar" (mensagem SKIP_WAITING). Só a primeira instalação assume na hora.
const VERSION = new URL(self.location.href).searchParams.get('v') || 'dev';
const CACHE_PREFIX = 'pc-builder-academy-';
const CACHE_NAME = `${CACHE_PREFIX}${VERSION}`;

const STATIC_ASSETS = ['/', '/manifest.json', '/icons/icon-192.svg', '/icons/icon-512.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)).then(() => {
      // Sem versão anterior ativa, não há montagem para interromper
      if (!self.registration.active) return self.skipWaiting();
      return undefined;
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith(CACHE_PREFIX) && k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const cacheResponse = (request, response) => {
  if (!response || response.status !== 200 || response.type !== 'basic') return response;
  const copy = response.clone();
  caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
  return response;
};

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  // API (Modo Professor, #66): dados ao vivo nunca passam pelo cache
  if (url.pathname.startsWith('/api/')) return;

  // Páginas (HTML): rede primeiro para receber a versão mais nova; cache só como fallback offline
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => cacheResponse(event.request, response))
        .catch(() => caches.match(event.request).then((cached) => cached || caches.match('/')))
    );
    return;
  }

  // Assets (chunks com hash, modelos GLB, ícones): cache primeiro, rede como complemento
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => cacheResponse(event.request, response)))
  );
});
