import { useCallback, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';

import { trackDashboardSurfaceAction, trackDashboardSurfaceView } from '../lib/analytics.js';

function normaliseSurface(surfaceId, registry) {
  if (!surfaceId) {
    return null;
  }
  const surface = registry?.[surfaceId];
  if (!surface) {
    return null;
  }

  const lastSyncedAt = typeof surface.lastSyncedAt === 'number' ? surface.lastSyncedAt : null;
  return {
    ...surface,
    lastSyncedAt,
    metrics: Array.isArray(surface.metrics) ? surface.metrics : [],
    unreadCount: typeof surface.unreadCount === 'number' ? surface.unreadCount : 0,
    pendingCount: typeof surface.pendingCount === 'number' ? surface.pendingCount : 0,
    serviceHealth: surface.serviceHealth ?? 'unknown',
    description: surface.description ?? null
  };
}

export default function useDashboardSurface(surfaceId, options = {}) {
  const outletContext = useOutletContext() ?? {};
  const role = outletContext.role ?? null;
  const refresh = typeof outletContext.refresh === 'function' ? outletContext.refresh : null;
  const registry = outletContext.surfaceRegistry ?? {};

  const surface = useMemo(() => normaliseSurface(surfaceId, registry), [surfaceId, registry]);

  const trackView = useCallback(
    (metadata = {}) => {
      if (!surfaceId) return;
      trackDashboardSurfaceView(surfaceId, { role, origin: options.origin ?? 'surface', ...metadata });
    },
    [surfaceId, role, options.origin]
  );

  const trackAction = useCallback(
    (action, metadata = {}) => {
      if (!surfaceId || !action) return;
      trackDashboardSurfaceAction(surfaceId, action, { role, ...metadata });
    },
    [surfaceId, role]
  );

  return {
    role,
    refresh,
    surface,
    trackView,
    trackAction,
    context: outletContext
  };
}
