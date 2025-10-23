const bufferedEvents = [];

function pushToDataLayer(event) {
  if (typeof window === 'undefined') {
    bufferedEvents.push(event);
    return;
  }

  const targetLayer = Array.isArray(window.dataLayer) ? window.dataLayer : (window.dataLayer = []);
  targetLayer.push(event);
}

export function trackEvent(eventName, payload = {}) {
  if (!eventName || typeof eventName !== 'string') {
    return;
  }

  const event = {
    event: eventName,
    ...payload,
    timestamp: payload.timestamp ?? new Date().toISOString()
  };
  pushToDataLayer(event);
}

export function getBufferedAnalyticsEvents() {
  return [...bufferedEvents];
}

export default {
  trackEvent,
  getBufferedAnalyticsEvents
};
