const CACHE_NAME = 'au2hub-cache-v4'; // 🚀 NAIKKAN ANGKA INI SETIAP KALI ANDA UPDATE CODINGAN

// Event Install: Langsung aktif tanpa memaksakan download array statis (Aman untuk Vercel)
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

// Event Fetch: Network-First dengan Dynamic Caching (Bebas Nyangkut + Anti Offline)
self.addEventListener('fetch', (event) => {
  // Abaikan request ekstensi browser atau request non-HTTP (mencegah error)
  if (!event.request.url.startsWith('http')) return;

  // Abaikan request API Supabase atau Google Script agar selalu real-time
  if (event.request.url.includes('supabase.co') || event.request.url.includes('script.google.com') || event.request.url.includes('/api/')) {
    return; 
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // 🔥 PERBAIKAN: Jika berhasil ambil dari jaringan, simpan salinannya ke cache!
        // Jadi brankas cache akan terisi otomatis seiring player membuka aplikasi
        return caches.open(CACHE_NAME).then((cache) => {
          // Hanya simpan response yang sukses (status 200 OK)
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        });
      })
      .catch(() => {
        // Jika jaringan mati/offline, ambil salinan terakhir dari brankas cache
        return caches.match(event.request);
      })
  );
});
