// ODEON Service Worker — Enables offline functionality & caching
const CACHE_NAME = 'odeon-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Install event - cache essential files
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('✓ Service Worker: Caching assets');
      return cache.addAll(ASSETS_TO_CACHE).catch(err => {
        console.log('⚠ Some assets could not be cached (expected for offline first load)');
      });
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(name => {
          if(name !== CACHE_NAME) {
            console.log('✓ Service Worker: Removing old cache:', name);
            return caches.delete(name);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', event => {
  const { request } = event;
  
  // Skip non-GET requests
  if(request.method !== 'GET') {
    return;
  }
  
  // Network first strategy for API calls
  if(request.url.includes('api.open-meteo.com') || 
     request.url.includes('metals') ||
     request.url.includes('spot')) {
    
    event.respondWith(
      fetch(request)
        .then(response => {
          // Cache successful API responses
          if(response.ok) {
            const cache = caches.open(CACHE_NAME);
            cache.then(c => c.put(request, response.clone()));
          }
          return response;
        })
        .catch(() => {
          // If offline, return cached version
          return caches.match(request)
            .then(cached => cached || createOfflineResponse());
        })
    );
  } 
  // Cache first strategy for static assets
  else {
    event.respondWith(
      caches.match(request)
        .then(cached => {
          if(cached) return cached;
          
          return fetch(request)
            .then(response => {
              // Cache new assets
              if(response.ok && (request.url.includes('.css') || request.url.includes('.js') || request.url.includes('.json'))) {
                const cache = caches.open(CACHE_NAME);
                cache.then(c => c.put(request, response.clone()));
              }
              return response;
            })
            .catch(() => {
              // Fallback for offline
              if(request.destination === 'document') {
                return caches.match('/') || createOfflineResponse();
              }
              return createOfflineResponse();
            });
        })
    );
  }
});

// Create offline response
function createOfflineResponse() {
  return new Response(
    `<html>
      <head>
        <title>ODEON — Offline</title>
        <style>
          body { font-family: system-ui; background: #fafaf8; color: #1a1a1a; padding: 40px 20px; text-align: center; }
          h1 { font-size: 28px; margin: 20px 0; }
          p { font-size: 14px; color: #808080; line-height: 1.6; }
          .icon { font-size: 60px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="icon">🔌</div>
        <h1>ODEON Offline</h1>
        <p>You're viewing cached data from your last session.</p>
        <p>Waiting for internet connection...</p>
        <p style="margin-top: 30px; font-size: 12px; color: #b0b0b0;">The app will auto-update when connected.</p>
      </body>
    </html>`,
    {
      status: 503,
      statusText: 'Service Unavailable',
      headers: new Headers({
        'Content-Type': 'text/html'
      })
    }
  );
}

// Background sync (optional - for future alert system)
self.addEventListener('sync', event => {
  if(event.tag === 'sync-alerts') {
    event.waitUntil(syncAlerts());
  }
});

async function syncAlerts() {
  // Future: sync alerts when back online
  console.log('✓ Service Worker: Syncing alerts');
}

// Push notifications (optional - for future alerts)
self.addEventListener('push', event => {
  if(!event.data) return;
  
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification('ODEON Alert', {
      body: data.body,
      icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><rect fill="%231a1a1a" width="192" height="192" rx="45"/><text x="96" y="96" font-size="120" font-weight="bold" text-anchor="middle" dominant-baseline="middle" fill="%23fafaf8" font-family="system-ui">O</text></svg>',
      badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect fill="%231a1a1a" width="96" height="96"/><text x="48" y="48" font-size="60" font-weight="bold" text-anchor="middle" dominant-baseline="middle" fill="%23fafaf8">O</text></svg>',
      tag: 'odeon-alert',
      requireInteraction: false
    })
  );
});

console.log('✓ ODEON Service Worker loaded');
