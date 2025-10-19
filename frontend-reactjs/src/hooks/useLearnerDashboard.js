import { useMemo } from 'react';
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

  const { section, loading, error } = useMemo(() => {
    if (!dashboard || !sectionKey) {
      return { section: dashboard, loading: false, error: null };
    }

    const value = dashboard?.[sectionKey];
    if (value && typeof value === 'object' && ('data' in value || 'loading' in value || 'error' in value)) {
      return {
        section: value.data ?? null,
        loading: Boolean(value.loading ?? (value.status === 'loading')), // eslint-disable-line no-nested-ternary
        error: value.error ?? null
      };
    }

    if (Array.isArray(value)) {
      return { section: value.length > 0 ? value : [], loading: false, error: null };
    }

    return { section: value ?? null, loading: false, error: null };
  }, [dashboard, sectionKey]);

  return useMemo(
    () => ({
      role,
      isLearner,
      dashboard,
      section,
      loading,
      error,
      refresh
    }),
    [role, isLearner, dashboard, section, loading, error, refresh]
  );
}

export default useLearnerDashboardContext;
