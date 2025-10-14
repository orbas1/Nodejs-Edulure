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

  const section = useMemo(() => {
    if (!dashboard || !sectionKey) return dashboard;
    const value = dashboard?.[sectionKey];
    if (Array.isArray(value)) {
      return value.length > 0 ? value : [];
    }
    return value ?? null;
  }, [dashboard, sectionKey]);

  return useMemo(
    () => ({
      role,
      isLearner,
      dashboard,
      section,
      refresh
    }),
    [role, isLearner, dashboard, section, refresh]
  );
}

export default useLearnerDashboardContext;
