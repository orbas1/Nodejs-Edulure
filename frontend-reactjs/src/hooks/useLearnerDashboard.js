import { useCallback, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';

function normaliseOutletContext(context) {
  if (!context || typeof context !== 'object') {
    return { role: null, dashboard: null, refresh: null };
  }

  const role = typeof context.role === 'string' ? context.role.toLowerCase() : null;
  const refresh = typeof context.refresh === 'function' ? context.refresh : null;
  const dashboard = context.dashboard && typeof context.dashboard === 'object' ? context.dashboard : null;

  return { role, dashboard, refresh };
}

function toPathSegments(sectionKey) {
  if (!sectionKey && sectionKey !== 0) return [];
  if (Array.isArray(sectionKey)) {
    return sectionKey
      .map((segment) => (typeof segment === 'string' ? segment.trim() : segment))
      .filter((segment) => segment !== undefined && segment !== null && `${segment}`.length > 0);
  }
  if (typeof sectionKey === 'string') {
    return sectionKey
      .split('.')
      .map((part) => part.trim())
      .filter((part) => part.length > 0);
  }
  return [`${sectionKey}`];
}

function resolveSectionValue(dashboard, sectionKey) {
  if (!dashboard || !sectionKey) return dashboard ?? null;
  const segments = toPathSegments(sectionKey);
  if (segments.length === 0) {
    return dashboard ?? null;
  }
  let value = dashboard;
  for (const segment of segments) {
    if (value && typeof value === 'object' && segment in value) {
      value = value[segment];
    } else {
      return null;
    }
  }
  return value ?? null;
}

export function useLearnerDashboardContext() {
  const outletContext = useOutletContext();
  const { role, dashboard, refresh } = normaliseOutletContext(outletContext);
  const isLearner = role === 'learner';

  return useMemo(
    () => ({
      role,
      isLearner,
      dashboard: isLearner ? dashboard : null,
      refresh
    }),
    [role, isLearner, dashboard, refresh]
  );
}

export function useLearnerDashboardSection(sectionKey) {
  const { role, isLearner, dashboard, refresh } = useLearnerDashboardContext();

  const section = useMemo(() => {
    const value = resolveSectionValue(dashboard, sectionKey);
    if (Array.isArray(value)) {
      return value.length > 0 ? value : [];
    }
    return value ?? null;
  }, [dashboard, sectionKey]);

  const refreshAfterAction = useCallback(
    async (mutation) => {
      if (typeof mutation !== 'function') {
        throw new Error('A mutation callback is required to refresh learner data');
      }
      const result = await mutation();
      if (typeof refresh === 'function') {
        await Promise.resolve(refresh());
      }
      return result;
    },
    [refresh]
  );

  return useMemo(
    () => ({
      role,
      isLearner,
      dashboard,
      section,
      refresh,
      refreshAfterAction
    }),
    [role, isLearner, dashboard, section, refresh, refreshAfterAction]
  );
}

export default useLearnerDashboardContext;
