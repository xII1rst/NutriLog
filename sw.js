/* ============================================================
   NutriLog — Service Worker
   ============================================================ */
const CACHE_NAME = 'nutrilog-v5';
const ASSETS = [
  '/',
  '/index.html',
  '/nutrilog.css',
  '/nutrilog.js',
  '/manifest.webmanifest'
];

// Instalar: cachear todos los assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activar: limpiar caches viejas
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch: stale-while-revalidate para assets propios
// Sirve caché inmediatamente, pero siempre busca la versión nueva en red
// para la próxima carga. Nunca queda pegado en versión vieja.
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Solo interceptar requests del mismo origen
  if (url.origin !== location.origin) return;

  const isAppAsset = ASSETS.some(a =>
    url.pathname === a || url.pathname.endsWith(a.replace('/', ''))
  );

  if (isAppAsset) {
    e.respondWith(
      caches.open(CACHE_NAME).then(cache =>
        cache.match(e.request).then(cached => {
          // Siempre lanza la request a la red para actualizar el caché
          const networkFetch = fetch(e.request).then(response => {
            if (response.ok) cache.put(e.request, response.clone());
            return response;
          }).catch(() => null);

          // Sirve el caché si existe (rápido), si no espera la red
          return cached || networkFetch;
        })
      )
    );
    return;
  }

  // Para el resto: network con fallback a caché
  e.respondWith(
    fetch(e.request).catch(() => {
      if (e.request.mode === 'navigate') {
        return caches.match('/index.html');
      }
    })
  );
});
