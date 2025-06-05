const CACHE_NAME = 'tyokalu-app-v5';  // Increment version to force cache refresh
const STATIC_CACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/female-greeting.mp3',
  '/icons/favicon.ico',
  '/icons/maskable-192.png',
  '/icons/maskable-512.png'
];

// Define regex patterns for assets that should NOT be cached
const NEVER_CACHE_PATTERNS = [
  /\.js$/,  // Don't cache JS files - they're hashed by Vite and change with each build
  /\.css$/,  // Don't cache CSS files - they're also hashed
  /assets\//  // Don't cache anything in the assets directory
];

// Install event - cache static resources
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Caching static resources');
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .then(() => {
        console.log('Static resources cached');
      })
  );
});

// Activate event - clean old caches and take control immediately
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  
  // Take control of all clients immediately
  event.waitUntil(
    Promise.all([
      // Clean old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Take control of all clients immediately
      self.clients.claim()
    ]).then(() => {
      console.log('Service Worker activated and claimed all clients');
    })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip external requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }
  
  // Check if this is a resource we should never cache
  const url = new URL(event.request.url);
  const shouldNotCache = NEVER_CACHE_PATTERNS.some(pattern => pattern.test(url.pathname));
  
  // For JavaScript, CSS, and assets files, always go to network first
  if (shouldNotCache) {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          // Only fall back to cache if network fails completely
          return caches.match(event.request);
        })
    );
    return;
  }

  // For other resources, try cache first, then network
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version if available
        if (response) {
          console.log('Serving from cache:', event.request.url);
          return response;
        }

        // Otherwise fetch from network
        console.log('Fetching from network:', event.request.url);
        return fetch(event.request)
          .then((response) => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response since it's a stream
            const responseToCache = response.clone();

            // Only cache static assets in the STATIC_CACHE_URLS list
            if (STATIC_CACHE_URLS.includes(url.pathname)) {
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseToCache);
                });
            }

            return response;
          })
          .catch(() => {
            // Return offline page for navigation requests
            if (event.request.mode === 'navigate') {
              return caches.match('/');
            }
          });
      })
  );
});

// Message handler for update commands
self.addEventListener('message', (event) => {
  console.log('Service Worker received message:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('Service Worker skipping waiting phase');
    // Force immediate activation
    self.skipWaiting().then(() => {
      console.log('skipWaiting completed, now claiming clients');
      // Explicitly claim clients to ensure the update takes effect
      self.clients.claim().then(() => {
        console.log('All clients claimed by new service worker');
        
        // Notify all clients that the worker has been updated
        self.clients.matchAll().then(clients => {
          clients.forEach(client => {
            client.postMessage({ type: 'SW_UPDATED' });
          });
        });
      });
    });
  }
});

// Background sync for offline uploads
self.addEventListener('sync', (event) => {
  if (event.tag === 'upload-audio') {
    console.log('Background sync: upload-audio');
    event.waitUntil(
      // Handle offline audio uploads when connection is restored
      self.registration.showNotification('Työkalu App', {
        body: 'Yhteys palautettu. Voit jatkaa äänikeskustelua.',
        icon: '/icons/maskable-192.png'
      })
    );
  }
  
  if (event.tag === 'upload-file' || event.tag === 'upload-photo') {
    console.log('Background sync:', event.tag);
    event.waitUntil(
      // Handle offline file uploads when connection is restored
      self.registration.showNotification('Työkalu App', {
        body: 'Yhteys palautettu. Tiedostot lähetetään.',
        icon: '/icons/maskable-192.png'
      })
    );
  }

  if (event.tag === 'sync-inspections') {
    console.log('Background sync: sync-inspections');
    event.waitUntil(
      handleInspectionSync()
    );
  }
});

// Handle inspection sync in background
async function handleInspectionSync() {
  try {
    // Import idb-keyval dynamically
    const { get, set, del, keys } = await import('https://cdn.skypack.dev/idb-keyval');
    
    // Get all offline inspections
    const allKeys = await keys();
    const offlineKeys = allKeys.filter(key => 
      typeof key === 'string' && key.startsWith('offline-inspection-')
    );
    
    if (offlineKeys.length === 0) {
      console.log('No offline inspections to sync');
      return;
    }

    let synced = 0;
    let failed = 0;

    // Try to sync each inspection
    for (const key of offlineKeys) {
      const inspection = await get(key);
      if (!inspection) continue;

      try {
        // Try to sync with webhook
        const formData = new FormData();
        formData.append('file', inspection.blob, inspection.fileName);
        formData.append('fileName', inspection.fileName);
        formData.append('language', inspection.language);
        formData.append('wantAudio', inspection.wantAudio.toString());

        // Use the default webhook URL - in real app this should come from config
        const webhookUrl = 'https://n8n.artbachmann.eu/webhook/c995af71-fd09-431d-ab51-05476d66d0ba';
        
        const response = await fetch(webhookUrl, {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          // Success - remove from offline storage
          await del(key);
          synced++;
          console.log(`Synced inspection: ${inspection.fileName}`);
        } else {
          failed++;
          console.log(`Failed to sync inspection: ${inspection.fileName}`);
        }
      } catch (error) {
        failed++;
        console.log(`Error syncing inspection: ${inspection.fileName}`, error);
      }
    }

    // Show notification about sync results
    if (synced > 0) {
      await self.registration.showNotification('Työkalu App', {
        body: `${synced} kuvaa synkronoitu onnistuneesti${failed > 0 ? `, ${failed} epäonnistui` : ''}`,
        icon: '/icons/maskable-192.png',
        badge: '/icons/maskable-192.png'
      });
    }
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}
