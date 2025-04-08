const CACHE_NAME = 'flappy-dog-cache-v1'; // Change version to force update
const urlsToCache = [
  '/', // Cache the root HTML
  'index.html',
  'style.css',
  'js/game.js',
  'js/sounds.js',
  'js/leaderboard.js',
  // Add specific asset paths (important!)
  'assets/images/flappy-dog.png',
  'assets/images/8bit taz.png',
  'assets/images/8 bit chloe.png',
  'assets/images/pipe-top.png',
  'assets/images/pipe-bottom.png',
  'assets/images/background.png',
  'assets/images/ground.png',
  // Add icon paths from manifest
  'assets/icons/icon-192x192.png',
  'assets/icons/icon-512x512.png',
  'assets/icons/icon-maskable-192x192.png',
  'assets/icons/icon-maskable-512x512.png',
  // Add font paths if locally hosted, otherwise they are fetched online
  'https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap',
  // Add other assets if any
];

// Install event: Cache core assets
self.addEventListener('install', event => {
  console.log('[ServiceWorker] Install');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[ServiceWorker] Caching core assets');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting()) // Activate worker immediately
  );
});

// Activate event: Clean up old caches
self.addEventListener('activate', event => {
  console.log('[ServiceWorker] Activate');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[ServiceWorker] Removing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // Take control immediately
  );
});

// Fetch event: Serve cached assets first, fallback to network
self.addEventListener('fetch', event => {
  // console.log('[ServiceWorker] Fetch', event.request.url);
  // Use a cache-first strategy
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        // Not in cache - fetch from network
        return fetch(event.request).then(
          response => {
            // Check if we received a valid response
            if (!response || response.status !== 200 || response.type !== 'basic' && response.type !== 'cors') {
                 // Don't cache opaque responses (like from CDNs without CORS)
                 // Also don't cache font responses from Google Fonts here - let browser handle that.
                 // Check if it's a google fonts request
                 if(event.request.url.indexOf('https://fonts.gstatic.com') === 0) {
                     return response;
                 }
                 // Consider caching other basic/cors responses if needed
                 // return response;
            }

            // IMPORTANT: Clone the response. A response is a stream
            // and because we want the browser to consume the response
            // as well as the cache consuming the response, we need
            // to clone it so we have two streams.
            // --> We are *not* caching network fallbacks in this basic example
            // --> to keep it simple. Add caching here if offline fallback is critical.
            /*
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            */
            return response;
          }
        );
      })
  );
}); 