export function trackEvent(eventName, payload = {}) {
  if (typeof window === 'undefined') return;
  const detail = { event: eventName, ...payload, timestamp: Date.now() };
  try {
    window.dispatchEvent(new CustomEvent('edulure:analytics', { detail }));
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('Failed to dispatch analytics event', error);
  }
  if (Array.isArray(window.dataLayer)) {
    window.dataLayer.push(detail);
  }
  if (typeof window.analytics?.track === 'function') {
    window.analytics.track(eventName, payload);
  }
}

export function trackNavigationImpression(targetId, metadata = {}) {
  trackEvent('navigation:impression', { targetId, ...metadata });
}

export function trackNavigationSelect(targetId, metadata = {}) {
  trackEvent('navigation:select', { targetId, ...metadata });
}

export function trackNotificationOpen(notificationId, metadata = {}) {
  trackEvent('notification:open', { notificationId, ...metadata });
}

export function trackNotificationPreferenceChange(groupId, enabled) {
  trackEvent('notification:preference_change', { groupId, enabled });
}

export function trackDashboardSurfaceView(surfaceId, metadata = {}) {
  if (!surfaceId) return;
  trackEvent('dashboard:surface_view', { surfaceId, ...metadata });
}

export function trackDashboardSurfaceAction(surfaceId, action, metadata = {}) {
  if (!surfaceId || !action) return;
  trackEvent('dashboard:surface_action', { surfaceId, action, ...metadata });
}

