const CACHE_NAME = 'unit-combiner-v6';
const appShellUrls = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json',
  './modules/apiService.js',
  './modules/cardRenderer.js',
  './modules/constants.js',
  './modules/dom.js',
  './modules/events.js',
  './modules/gameMode.js',
  './modules/imageExporter.js',
  './modules/longPress.js',
  './modules/modal.js',
  './modules/Roster.js',
  './modules/rosterCode.js',
  './modules/rules.js',
  './modules/state.js',
  './modules/ttsExporter.js',
  './modules/ui.js'
];

// Caches all card images robustly
const cacheCardImages = async (cache) => {
  try {
    const categoryFiles = [
      'Pilot.json', 'Drone.json', 'Back.json', 'Chassis.json',
      'Left.json', 'Right.json', 'Torso.json', 'Projectile.json', 'Tactical.json'
    ];

    const fetchPromises = categoryFiles.map(file =>
      fetch(`data/${file}?v=${new Date().getTime()}`).then(res => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status} for file ${file}`);
        return res.json();
      })
    );

    const arraysOfCards = await Promise.all(fetchPromises);
    const allCardData = arraysOfCards.flat();

    const cardImageUrls = allCardData.map(card => `Cards/${card.category}/${card.fileName}`);
    console.log(`Service Worker: Attempting to cache ${cardImageUrls.length} card images.`);

    let successfullyCached = 0;
    await Promise.all(
      cardImageUrls.map(url =>
        cache.add(url).then(() => {
          successfullyCached++;
        }).catch(err => {
          console.warn(`Service Worker: Failed to cache image ${url}`, err);
        })
      )
    );
    console.log(`Service Worker: Successfully cached ${successfullyCached} out of ${cardImageUrls.length} images.`);

  } catch (error) {
    console.error('Service Worker: Failed to cache card images.', error);
  }
};

// Install a service worker
self.addEventListener('install', event => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(async (cache) => {
        console.log('Service Worker: Caching app shell');
        await cache.addAll(appShellUrls);
        await cacheCardImages(cache);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate the service worker
self.addEventListener('activate', event => {
  console.log('Service Worker: Activating...');
  // Remove old caches
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log(`Service Worker: Clearing old cache (${cache})`);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Fetch event to serve content from cache
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        // Not in cache - fetch from network
        return fetch(event.request);
      })
  );
});
