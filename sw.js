const CACHE_NAME = 'au2hub-cache-v1';

// Daftar file utama. 
// PENTING: Jika satu saja file di bawah ini 404, Service Worker akan gagal install!
const assets = [
  '/',
  '/index.html',
  '/manifest-v2.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('SW: Cache berhasil dibuka');
      // Gunakan catch agar kalau ada gambar/file yang gagal diload, SW tidak ikut hancur
      return cache.addAll(assets).catch(err => console.error('SW: Gagal cache assets', err));
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('SW: Menghapus cache lama', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
