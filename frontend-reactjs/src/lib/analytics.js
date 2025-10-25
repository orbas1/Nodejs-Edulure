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

export function trackNotificationPanelView(metadata = {}) {
  trackEvent('notification:panel_view', metadata);
}

export function trackDashboardSurfaceView(surfaceId, metadata = {}) {
  if (!surfaceId) return;
  trackEvent('dashboard:surface_view', { surfaceId, ...metadata });
}

export function trackDashboardSurfaceAction(surfaceId, action, metadata = {}) {
  if (!surfaceId || !action) return;
  trackEvent('dashboard:surface_action', { surfaceId, action, ...metadata });
}

function trackAuthEvent(event, metadata = {}) {
  trackEvent(`auth:${event}`, metadata);
}

export function trackAuthView(surface, metadata = {}) {
  if (!surface) return;
  trackAuthEvent('view', { surface, ...metadata });
}

export function trackAuthAttempt(surface, outcome, metadata = {}) {
  if (!surface || !outcome) return;
  trackAuthEvent('attempt', { surface, outcome, ...metadata });
}

export function trackAuthInteraction(surface, interaction, metadata = {}) {
  if (!surface || !interaction) return;
  trackAuthEvent('interaction', { surface, interaction, ...metadata });
}

export function trackAuthAutoSave(surface, status, metadata = {}) {
  if (!surface || !status) return;
  trackAuthEvent('autosave', { surface, status, ...metadata });
}

function trackIntegrationInvite(event, metadata = {}) {
  trackEvent(`integration_invite:${event}`, metadata);
}

export function trackIntegrationInviteInteraction(interaction, metadata = {}) {
  if (!interaction) return;
  trackIntegrationInvite('interaction', { interaction, ...metadata });
}

export function trackIntegrationInviteEvent(event, metadata = {}) {
  if (!event) return;
  trackIntegrationInvite(event, metadata);
}

export function trackIntegrationInviteStatus(status, metadata = {}) {
  if (!status) return;
  trackIntegrationInvite('status', { status, ...metadata });
}

export function trackIntegrationInviteSubmit(outcome, metadata = {}) {
  if (!outcome) return;
  trackIntegrationInvite('submit', { outcome, ...metadata });
}

