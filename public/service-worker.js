// ✅ Import Workbox
importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.4.1/workbox-sw.js');

if (workbox) {
  console.log('✅ Workbox Loaded Successfully');

  // ✅ Precache assets
  workbox.precaching.precacheAndRoute(self.__WB_MANIFEST || []);

  // ✅ Cache Images (Cache-First Strategy)
  workbox.routing.registerRoute(
    ({ request }) => request.destination === 'image',
    new workbox.strategies.CacheFirst({
      cacheName: 'images-cache',
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 60,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
        }),
      ],
    })
  );

  // ✅ Cache CSS & JS (Stale-While-Revalidate Strategy)
  workbox.routing.registerRoute(
    ({ request }) => request.destination === 'script' || request.destination === 'style',
    new workbox.strategies.StaleWhileRevalidate({
      cacheName: 'static-resources',
    })
  );

  // ✅ Cache API Responses (Network-First Strategy)
  workbox.routing.registerRoute(
    ({ url }) => url.origin.includes('api.themoviedb.org'),
    new workbox.strategies.NetworkFirst({
      cacheName: 'api-cache',
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 50,
          maxAgeSeconds: 5 * 60, // 5 minutes
        }),
      ],
    })
  );

}

// ✅ Fetch Event Logging (Works outside Workbox)
self.addEventListener('fetch', (event) => {
    console.log(`📡 Fetch event detected: ${event.request.url}`);
  
    if (event.request.url.includes('api.themoviedb.org')) {
      console.log(`🎬 Intercepting API Request: ${event.request.url}`);
      
      event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
          return cachedResponse || fetch(event.request).then((response) => {
            console.log(`✅ API Response Fetched: ${event.request.url}`);
            return response;
          }).catch((err) => {
            console.error(`❌ API Fetch Failed: ${event.request.url}`, err);
            return new Response('API fetch failed', { status: 500 });
          });
        })
      );
    }
  });
  
// ✅ Background Sync Event (Syncing Watchlist)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-watchlist') {
    console.log('🔄 Sync event triggered: sync-watchlist');
    event.waitUntil(
      syncWatchlist().then(() => {
        console.log('✅ Sync successful');
      }).catch((err) => {
        console.error('❌ Sync failed:', err);
      })
    );
  }
});

// 🔄 Example Function to Sync Watchlist
async function syncWatchlist() {
  console.log('🔄 Syncing watchlist data...');
  return fetch('/sync-watchlist', { method: 'POST' })
    .then(() => console.log('✅ Sync request sent successfully!'))
    .catch(() => console.log('❌ Sync request failed, retrying later.'));
}

// ✅ Push Notification Event
self.addEventListener('push', (event) => {
  console.log('📩 Push notification received');

  const notificationData = event.data ? event.data.text() : '🎬 New movie update!';
  console.log(`📨 Push payload: ${notificationData}`);

  const options = {
    body: notificationData,
    icon: '/logo192.png',
    badge: '/logo192.png',
  };

  event.waitUntil(
    self.registration.showNotification('🎥 Movie House', options)
      .then(() => console.log('✅ Push notification sent successfully'))
      .catch((err) => console.error('❌ Push notification failed:', err))
  );
});

// ✅ Activate event - Cleanup old caches
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker activated');
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((cache) => {
          if (!['images-cache', 'static-resources', 'api-cache'].includes(cache)) {
            console.log('🗑 Deleting old cache:', cache);
            return caches.delete(cache);
          }
        })
      )
    )
  );
  self.clients.claim();
});
