/**
 * Service Worker for Obsidian Protocol Roster Builder
 * Handles offline caching of the app shell and card images.
 */

const CACHE_VERSION = 'v7';
const CACHE_NAME = `unit-combiner-${CACHE_VERSION}`;

// Core application files (App Shell)
const APP_SHELL_FILES = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json'
];

// JavaScript modules
const MODULE_FILES = [
  'apiService.js',
  'cardRenderer.js',
  'constants.js',
  'dom.js',
  'events.js',
  'gameMode.js',
  'imageExporter.js',
  'longPress.js',
  'modal.js',
  'Roster.js',
  'rosterCode.js',
  'rules.js',
  'state.js',
  'ttsExporter.js',
  'ui.js'
].map(file => `./modules/${file}`);

const ALL_ASSETS = [...APP_SHELL_FILES, ...MODULE_FILES];

/**
 * Caches all card images robustly by fetching their metadata first.
 */
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

// Install: Cache app shell and images
self.addEventListener('install', event => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(async (cache) => {
        console.log('Service Worker: Caching assets');
        await cache.addAll(ALL_ASSETS);
        await cacheCardImages(cache);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate: Clean up old caches
self.addEventListener('activate', event => {
  console.log('Service Worker: Activating...');
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

// Fetch: Network first, then fallback to cache (better for development/updates)
// or Cache first, then fallback to network (better for performance/offline)
// Here we use Cache First for better offline experience.
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});
