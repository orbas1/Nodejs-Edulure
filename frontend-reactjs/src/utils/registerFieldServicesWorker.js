const WORKER_URL = '/field-services-sw.js';
let registrationPromise = null;

export default function registerFieldServicesWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return Promise.resolve(null);
  }

  if (registrationPromise) {
    return registrationPromise;
  }

  registrationPromise = navigator.serviceWorker
    .register(WORKER_URL, { scope: '/' })
    .then((registration) => {
      if (registration.waiting) {
        return registration;
      }
      if (registration.installing) {
        registration.installing.addEventListener('statechange', (event) => {
          if (event.target?.state === 'activated' && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({ type: 'FIELD_SERVICES_READY' });
          }
        });
      }
      return registration;
    })
    .catch((error) => {
      console.warn('[field-services] Failed to register service worker', error);
      return null;
    });

  return registrationPromise;
}
