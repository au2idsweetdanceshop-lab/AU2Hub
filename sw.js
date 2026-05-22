const CACHE_NAME = 'au2hub-cache-v2'; // Dinaikkan versinya agar browser tahu ada update

// Event Install: Langsung aktif tanpa memaksakan download array statis (aman untuk Vercel)
self.addEventListener('install', (event) => {
  self.skipWaiting(); 
});

// Event Activate: Membersihkan cache lama jika ada update versi
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
  event.waitUntil(self.clients.claim());
});

// Event Fetch: Mengakali error Vercel. Ambil dari jaringan dulu, kalau gagal/offline baru cari di cache
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});
