export function pushAnalyticsEvent(eventPayload) {
  if (typeof window === 'undefined') {
    return;
  }
  if (!eventPayload) {
    return;
  }
  try {
    if (!Array.isArray(window.dataLayer)) {
      window.dataLayer = [];
    }
    window.dataLayer.push(eventPayload);
  } catch (_error) {
    // Silently ignore analytics push failures to avoid impacting UX.
  }
}

export function trackMarketingCta({
  surface,
  action,
  label,
  plan,
  addon,
  meta = {}
} = {}) {
  const payload = {
    event: 'marketing_cta',
    surface: surface ?? 'unknown',
    action: action ?? 'click',
    label: label ?? null,
    plan: plan ?? null,
    addon: addon ?? null,
    ...meta
  };
  pushAnalyticsEvent(payload);
}

export default {
  pushAnalyticsEvent,
  trackMarketingCta
};
