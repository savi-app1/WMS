/* WMS — Service Worker : mise en cache des ressources statiques uniquement.
   Les commandes et sessions passent toujours par le réseau (données fraîches). */
'use strict';

const CACHE = 'wms-v1';
const ASSETS = [
  '/',
  '/static/css/main.css',
  '/static/js/app.js',
  '/static/img/wms-logo.jpeg',
  '/static/img/wms-banner.jpeg',
  '/manifest.webmanifest',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== location.origin) return;
  // Jamais de cache pour l'admin, le suivi, la confirmation ou les API
  if (url.pathname.startsWith('/admin') || url.pathname.startsWith('/api')
      || url.pathname.startsWith('/commande') || url.pathname.startsWith('/suivi')) {
    return;
  }
  // Statique : cache-first
  if (url.pathname.startsWith('/static/') || url.pathname.startsWith('/uploads/')) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, clone));
        }
        return response;
      }).catch(() => cached))
    );
    return;
  }
  // Pages publiques : network-first avec repli cache
  event.respondWith(
    fetch(request).then((response) => {
      if (response.ok) {
        const clone = response.clone();
        caches.open(CACHE).then((cache) => cache.put(request, clone));
      }
      return response;
    }).catch(() => caches.match(request).then((cached) => cached || caches.match('/')))
  );
});
