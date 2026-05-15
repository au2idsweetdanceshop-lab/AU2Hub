const CACHE_NAME = 'au2hub-v2';
const assets = [
  '/',
  '/index.html',
  '/manifest-v2.json',
  '/icon-192.png',
  '/icon-512.png'
];

// Tahap Install - Simpan file ke HP
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(assets);
    })
  );
});

// Tahap Fetch - Ambil dari HP kalau offline
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
