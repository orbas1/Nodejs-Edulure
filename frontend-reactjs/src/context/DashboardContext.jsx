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
  loading: false,
  error: null
};

export function DashboardProvider({ children }) {
  const { session, isAuthenticated } = useAuth();
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
        const payload = await fetchDashboard({ token: session.tokens.accessToken, signal });
        setState({
          profile: payload.profile,
          roles: payload.roles,
          dashboards: payload.dashboards,
          searchIndex: payload.searchIndex,
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
    [isAuthenticated, session?.tokens?.accessToken]
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
  }, [triggerLoad]);

  const refresh = useCallback(() => triggerLoad(), [triggerLoad]);

  const value = useMemo(() => {
    const resolvedRole = activeRole ?? state.roles[0]?.id ?? null;
    return {
      activeRole: resolvedRole,
      setActiveRole,
      profile: state.profile,
      roles: state.roles,
      dashboards: state.dashboards,
      searchIndex: state.searchIndex,
      loading: state.loading,
      error: state.error,
      refresh
    };
  }, [activeRole, state, refresh]);

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
