/* Service worker — generato da genera_pwa.py per la versione 3.5. NON modificare a mano. */
var VERSION = '3.5', CACHE = 'toliso-' + VERSION;
var FILES = ["./", "./index.html", "./manifest.webmanifest", "./icons/icon-192.png", "./icons/icon-512.png", "./icons/apple-touch-icon.png"];
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES); }));   /* niente skipWaiting: l'aggiornamento lo decide chi usa l'app */
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('message', function (e) { if (e.data === 'skipWaiting') self.skipWaiting(); });
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  var nav = e.request.mode === 'navigate';
  if (nav) {
    /* PAGINE: prima la rete (così un aggiornamento arriva alla prima apertura), poi la cache (senza rete).
       Mai rispondere con «niente»: in ultima istanza si ritorna l'indice in cache, che è l'app intera. */
    e.respondWith(fetch(e.request).then(function (res) {
      if (res && res.ok) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(e.request, copy); }); return res; }
      return caches.match(e.request, { ignoreSearch: true }).then(function (hit) { return hit || caches.match('./index.html'); }).then(function (hit) { return hit || res; });
    }).catch(function () {
      return caches.match(e.request, { ignoreSearch: true }).then(function (hit) { return hit || caches.match('./index.html'); });
    }));
    return;
  }
  /* RISORSE (manifest, icone): prima la cache, poi la rete */
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(function (hit) {
    if (hit) return hit;
    return fetch(e.request).then(function (res) {
      if (res && res.ok) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(e.request, copy); }); }
      return res;
    });
  }));
});
