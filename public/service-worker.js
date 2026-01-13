// This is a basic service worker file for PWA installation.
// It can be expanded later for caching, offline support, and push notifications.

self.addEventListener('install', (event) => {
  console.log('Ndara Afrique Service Worker installing...');
  // event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache)));
});

self.addEventListener('fetch', (event) => {
  // For now, we just pass the request through.
  // This can be updated to implement caching strategies.
  event.respondWith(fetch(event.request));
});
