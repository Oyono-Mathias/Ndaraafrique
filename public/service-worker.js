// public/service-worker.js

const CACHE_NAME = 'ndara-afrique-cache-v1';
const OFFLINE_URL = 'offline.html';

// Liste des fichiers à mettre en cache lors de l'installation
const urlsToCache = [
  '/',
  '/offline.html',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  console.log('[Service Worker] Install');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching app shell');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activate');
  // Supprimer les anciens caches
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});


self.addEventListener('fetch', (event) => {
    // Ne pas mettre en cache les requêtes vers les API Firebase/Google
    if (event.request.url.includes('googleapis.com')) {
      return;
    }

    event.respondWith(
        (async () => {
            try {
                // 1. Essayer le réseau d'abord
                const networkResponse = await fetch(event.request);
                return networkResponse;
            } catch (error) {
                // Le réseau a échoué, essayer de trouver dans le cache
                console.log('[Service Worker] Network request failed, trying cache for:', event.request.url);
                const cache = await caches.open(CACHE_NAME);
                const cachedResponse = await cache.match(event.request);
                
                if (cachedResponse) {
                    return cachedResponse;
                }
                
                // Si la requête est une navigation et que la ressource n'est pas dans le cache,
                // renvoyer la page hors ligne personnalisée.
                if (event.request.mode === 'navigate') {
                    console.log('[Service Worker] Serving offline page.');
                    const offlinePage = await cache.match(OFFLINE_URL);
                    return offlinePage;
                }

                // Pour les autres types de requêtes (images, etc.) qui ne sont pas dans le cache,
                // retourner une erreur standard.
                return new Response(JSON.stringify({ error: 'Network error' }), {
                    headers: { 'Content-Type': 'application/json' },
                    status: 503,
                });
            }
        })()
    );
});
