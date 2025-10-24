import PropTypes from 'prop-types';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { fetchDashboard } from '../api/dashboardApi.js';
import { useAuth } from './AuthContext.jsx';

const DashboardContext = createContext(null);

const initialState = {
  profile: null,
  roles: [],
  dashboards: {},
  searchIndex: [],
  surfaceRegistry: {},
  alerts: [],
  tenantId: null,
  lastLoadedAt: null,
  loading: false,
  error: null
};

export function DashboardProvider({ children }) {
  const { session, isAuthenticated, activeTenantId } = useAuth();
  const [state, setState] = useState(initialState);
  const [activeRole, setActiveRole] = useState(null);
  const activeRequest = useRef(null);

  const loadDashboard = useCallback(
    async (signal) => {
      if (!isAuthenticated || !session?.tokens?.accessToken) {
        setState(initialState);
        setActiveRole(null);
        return;
      }

      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const payload = await fetchDashboard({
          token: session.tokens.accessToken,
          signal,
          tenantId: activeTenantId ?? session?.tenants?.[0]?.id,
          audience: session?.actor?.role === 'admin' ? 'ops' : undefined
        });

        setState({
          profile: payload.profile,
          roles: payload.roles,
          dashboards: payload.dashboards,
          searchIndex: payload.searchIndex,
          surfaceRegistry: payload.surfaceRegistry ?? {},
          alerts: payload.alerts ?? [],
          tenantId: payload.tenantId ?? activeTenantId ?? null,
          lastLoadedAt: payload.fetchedAt ?? new Date().toISOString(),
          loading: false,
          error: null
        });

        setActiveRole((current) => {
          if (current && payload.roles.some((role) => role.id === current)) {
            return current;
          }
          return payload.roles[0]?.id ?? null;
        });
      } catch (error) {
        if (signal?.aborted || error?.name === 'CanceledError') return;
        const normalisedError = error instanceof Error ? error : new Error('Failed to load dashboard data');
        setState((prev) => ({ ...prev, loading: false, error: normalisedError }));
      }
    },
    [activeTenantId, isAuthenticated, session?.actor?.role, session?.tenants, session?.tokens?.accessToken]
  );

  const triggerLoad = useCallback(() => {
    if (activeRequest.current) {
      activeRequest.current.abort();
    }
    const controller = new AbortController();
    activeRequest.current = controller;
    loadDashboard(controller.signal).finally(() => {
      if (activeRequest.current === controller) {
        activeRequest.current = null;
      }
    });
    return controller;
  }, [loadDashboard]);

  useEffect(() => {
    const controller = triggerLoad();
    return () => {
      controller.abort();
      activeRequest.current = null;
    };
  }, [triggerLoad, activeTenantId]);

  const refresh = useCallback(() => triggerLoad(), [triggerLoad]);

  const sectionIndex = useMemo(() => {
    const index = new Map();
    Object.entries(state.dashboards ?? {}).forEach(([roleId, dashboard]) => {
      const sections = Array.isArray(dashboard?.sections) ? dashboard.sections : [];
      sections.forEach((section) => {
        const key = section.id ?? section.key ?? section.slug ?? section.title;
        if (!key) {
          return;
        }
        index.set(`${roleId}:${key}`, { ...section, roleId });
      });
    });
    return index;
  }, [state.dashboards]);

  const operationsSnapshot = useMemo(() => {
    const metrics = [];
    const sections = [];

    sectionIndex.forEach((section) => {
      const sectionMetrics = Array.isArray(section.metrics) ? section.metrics : [];
      sectionMetrics.forEach((metric) => {
        metrics.push({
          roleId: section.roleId,
          sectionId: section.id ?? section.key ?? section.title,
          label: metric.label ?? 'Metric',
          value: metric.value ?? 0,
          trend: metric.trend ?? null,
          unit: metric.unit ?? null
        });
      });

      sections.push({
        roleId: section.roleId,
        id: section.id ?? section.key ?? section.title,
        status: section.status ?? 'operational',
        alerts: section.alerts ?? [],
        lastUpdated: section.updatedAt ?? section.syncedAt ?? state.lastLoadedAt
      });
    });

    return {
      metrics,
      sections,
      alerts: state.alerts ?? [],
      fetchedAt: state.lastLoadedAt,
      tenantId: state.tenantId
    };
  }, [sectionIndex, state.alerts, state.lastLoadedAt, state.tenantId]);

  const getSection = useCallback(
    (sectionKey, roleId = null) => {
      if (!sectionKey) {
        return null;
      }
      if (roleId) {
        return sectionIndex.get(`${roleId}:${sectionKey}`) ?? null;
      }
      const entry = [...sectionIndex.entries()].find(([, value]) => {
        return (
          value.id === sectionKey ||
          value.key === sectionKey ||
          value.slug === sectionKey ||
          value.title === sectionKey
        );
      });
      return entry ? entry[1] : null;
    },
    [sectionIndex]
  );

  const getDashboard = useCallback(
    (roleId, fallbackRoleId = activeRole) => {
      if (roleId && state.dashboards?.[roleId]) {
        return state.dashboards[roleId];
      }
      if (fallbackRoleId && state.dashboards?.[fallbackRoleId]) {
        return state.dashboards[fallbackRoleId];
      }
      const firstRoleId = Object.keys(state.dashboards ?? {})[0];
      return firstRoleId ? state.dashboards[firstRoleId] : null;
    },
    [activeRole, state.dashboards]
  );

  const value = useMemo(() => {
    const resolvedRole = activeRole ?? state.roles[0]?.id ?? null;
    return {
      activeRole: resolvedRole,
      setActiveRole,
      profile: state.profile,
      roles: state.roles,
      dashboards: state.dashboards,
      searchIndex: state.searchIndex,
      surfaceRegistry: state.surfaceRegistry,
      alerts: state.alerts,
      tenantId: state.tenantId,
      lastLoadedAt: state.lastLoadedAt,
      operationsSnapshot,
      getSection,
      getDashboard,
      loading: state.loading,
      error: state.error,
      refresh
    };
  }, [
    activeRole,
    getDashboard,
    getSection,
    operationsSnapshot,
    refresh,
    state.alerts,
    state.dashboards,
    state.error,
    state.lastLoadedAt,
    state.loading,
    state.profile,
    state.roles,
    state.searchIndex,
    state.surfaceRegistry,
    state.tenantId
  ]);

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

DashboardProvider.propTypes = {
  children: PropTypes.node.isRequired
};

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
}
