// sw.js - Service Worker Dasar
self.addEventListener('fetch', (event) => {
    // Kode ini memungkinkan aplikasi berjalan lebih cepat dan mendukung offline basic
    event.respondWith(
        fetch(event.request).catch(() => caches.match(event.request))
    );
});
