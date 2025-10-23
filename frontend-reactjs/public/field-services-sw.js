const CACHE_NAME = 'edulure-field-services-v1';
const CACHE_PATHS = ['/api/v1/dashboard/me', '/api/v1/dashboard/learner/field-services'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

function shouldHandleRequest(request) {
  if (request.method !== 'GET') {
    return false;
  }
  try {
    const url = new URL(request.url);
    return CACHE_PATHS.some((path) => url.pathname.startsWith(path));
  } catch (error) {
    return false;
  }
}

self.addEventListener('fetch', (event) => {
  if (!shouldHandleRequest(event.request)) {
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      try {
        const networkResponse = await fetch(event.request);
        if (networkResponse && networkResponse.ok) {
          cache.put(event.request, networkResponse.clone());
        }
        return networkResponse;
      } catch (error) {
        const cachedResponse = await cache.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }
        throw error;
      }
    })
  );
});
