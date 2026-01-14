self.addEventListener('install', (event) => {
  console.log('Service Worker installing.');
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating.');
});

self.addEventListener('fetch', (event) => {
  // We are not adding any caching logic for now.
  // This file is just to enable PWA installation.
  event.respondWith(fetch(event.request));
});
