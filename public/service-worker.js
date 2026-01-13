// self.skipWaiting();

const CACHE_NAME = 'ndara-afrique-cache-v1';
const urlsToCache = [
  '/offline.html',
  '/icon.svg',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/manifest.json'
];

// Installation du Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Stratégie de mise en cache : Network Falling Back to Cache
self.addEventListener('fetch', event => {
  // Ignorer les requêtes qui ne sont pas des GET
  if (event.request.method !== 'GET') {
    return;
  }

  // Ne pas mettre en cache les requêtes vers les API Firebase
  if (event.request.url.includes('googleapis.com')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(networkResponse => {
        // Si la requête réussit, on met la réponse en cache pour une utilisation future
        return caches.open(CACHE_NAME).then(cache => {
          // On ne met en cache que les requêtes valides (pas les erreurs serveur par ex.)
          if (networkResponse.ok) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        });
      })
      .catch(() => {
        // Si le réseau échoue (hors ligne), on tente de récupérer depuis le cache
        return caches.match(event.request)
          .then(cachedResponse => {
            // Si la ressource est dans le cache, on la renvoie
            // Sinon, pour la navigation, on renvoie la page offline.html
            if (cachedResponse) {
              return cachedResponse;
            }
            if (event.request.mode === 'navigate') {
              return caches.match('/offline.html');
            }
          });
      })
  );
});

// Nettoyage des anciens caches
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
