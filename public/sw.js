const CACHE_NAME = 'promarcas-v3';

self.addEventListener('install', (event) => {
  event.waitUntil(caches.delete(CACHE_NAME).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Nunca interceptar módulos do dev server (Vite) nem atualizações do HMR
  if (url.pathname.startsWith('/src/') || url.pathname.startsWith('/@') || url.pathname === '/sw.js') return;

  // Network-first: sempre tenta a rede; só usa o cache quando estiver offline.
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() =>
        caches.match(request).then(
          (cached) =>
            cached ||
            (request.mode === 'navigate'
              ? caches.match('/index.html').then((i) => i || Response.error())
              : Response.error())
        )
      )
  );
});
