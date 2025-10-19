import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  fetchSupportOverview,
  fetchSupportTenants
} from '../api/operatorDashboardApi.js';
import { useAuth } from '../context/AuthContext.jsx';
import createPersistentCache from '../utils/persistentCache.js';
import { useInterval } from './useInterval.js';

const overviewCache = createPersistentCache('support-overview', { ttlMs: 5 * 60_000 });
const tenantCache = createPersistentCache('support-tenants', { ttlMs: 60 * 60_000 });

function getIsOffline() {
  if (typeof navigator === 'undefined') {
    return false;
  }
  return navigator.onLine === false;
}

function resolveDefaultTenant(current, available = [], fallback) {
  if (current && available.some((tenant) => tenant.id === current)) {
    return current;
  }
  if (fallback && available.some((tenant) => tenant.id === fallback)) {
    return fallback;
  }
  return available[0]?.id ?? null;
}

export default function useSupportDashboard({ pollIntervalMs = 180_000 } = {}) {
  const { session, isAuthenticated } = useAuth();
  const token = session?.tokens?.accessToken ?? null;
  const [tenantId, setTenantId] = useState(null);
  const [state, setState] = useState({
    loading: true,
    error: null,
    data: null,
    lastUpdated: null,
    stale: false,
    offline: getIsOffline()
  });
  const [tenantState, setTenantState] = useState({
    loading: true,
    error: null,
    items: []
  });
  const mountedRef = useRef(true);
  const abortController = useRef(null);

  const updateData = useCallback((updater) => {
    setState((prev) => ({
      ...prev,
      data: typeof updater === 'function' ? updater(prev.data) : updater
    }));
  }, []);

  const refreshOverview = useCallback(
    async ({ silent = false } = {}) => {
      if (!isAuthenticated || !token) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: new Error('You must be authenticated to load support tooling.')
        }));
        return;
      }

      if (!tenantId) {
        return;
      }

      if (abortController.current) {
        abortController.current.abort();
      }

      const controller = new AbortController();
      abortController.current = controller;

      if (!silent) {
        setState((prev) => ({ ...prev, loading: true, error: null }));
      }

      try {
        const overview = await fetchSupportOverview({ token, tenantId, signal: controller.signal });
        if (!mountedRef.current) {
          return;
        }

        await overviewCache.write(tenantId, overview);

        setState({
          loading: false,
          error: null,
          data: overview,
          lastUpdated: new Date().toISOString(),
          stale: false,
          offline: getIsOffline()
        });
      } catch (error) {
        if (!mountedRef.current || controller.signal.aborted) {
          return;
        }

        const cached = await overviewCache.read(tenantId);
        setState({
          loading: false,
          error,
          data: cached?.value ?? null,
          lastUpdated: cached?.storedAt ? new Date(cached.storedAt).toISOString() : null,
          stale: Boolean(cached?.value),
          offline: getIsOffline()
        });
      } finally {
        if (abortController.current === controller) {
          abortController.current = null;
        }
      }
    },
    [isAuthenticated, tenantId, token]
  );

  const refreshTenants = useCallback(async () => {
    if (!isAuthenticated || !token) {
      setTenantState({ loading: false, error: new Error('Authentication required'), items: [] });
      return;
    }

    setTenantState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetchSupportTenants({ token });
      if (!mountedRef.current) {
        return;
      }

      await tenantCache.write('tenants', response);

      setTenantState({ loading: false, error: null, items: response.items });
      setTenantId((current) => resolveDefaultTenant(current, response.items, response.defaultTenantId));
    } catch (error) {
      if (!mountedRef.current) {
        return;
      }

      const cached = await tenantCache.read('tenants');
      const fallback = cached?.value ?? {};
      const fallbackItems = Array.isArray(fallback.items) ? fallback.items : Array.isArray(fallback) ? fallback : [];
      const fallbackDefault = fallback.defaultTenantId ?? null;
      setTenantState({ loading: false, error, items: fallbackItems });
      setTenantId((current) => resolveDefaultTenant(current, fallbackItems, fallbackDefault));
    }
  }, [isAuthenticated, token]);

  useEffect(() => {
    mountedRef.current = true;
    refreshTenants();
    return () => {
      mountedRef.current = false;
      abortController.current?.abort();
    };
  }, [refreshTenants]);

  useEffect(() => {
    if (!tenantId) {
      return;
    }
    refreshOverview();
  }, [tenantId, refreshOverview]);

  useEffect(() => {
    function handleOnlineChange() {
      setState((prev) => ({ ...prev, offline: getIsOffline() }));
      if (!getIsOffline()) {
        refreshOverview({ silent: true });
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnlineChange);
      window.addEventListener('offline', handleOnlineChange);
      return () => {
        window.removeEventListener('online', handleOnlineChange);
        window.removeEventListener('offline', handleOnlineChange);
      };
    }

    return undefined;
  }, [refreshOverview]);

  useInterval(() => {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
      return;
    }
    refreshOverview({ silent: true });
  }, pollIntervalMs);

  const updateTicket = useCallback(
    (ticketId, updater) => {
      if (!ticketId) {
        return;
      }
      updateData((current) => {
        if (!current?.queue?.items?.length) {
          return current;
        }
        const items = current.queue.items.map((ticket) => {
          if (ticket.id !== ticketId) {
            return ticket;
          }
          const next = typeof updater === 'function' ? updater(ticket) : { ...ticket, ...updater };
          return { ...ticket, ...next };
        });
        return {
          ...current,
          queue: {
            ...current.queue,
            items
          }
        };
      });
    },
    [updateData]
  );

  const updateNotificationPolicy = useCallback(
    (policyId, updater) => {
      if (!policyId) {
        return;
      }
      updateData((current) => {
        if (!current?.settings?.notificationPolicies?.length) {
          return current;
        }
        const policies = current.settings.notificationPolicies.map((policy) => {
          if (policy.id !== policyId) {
            return policy;
          }
          const next = typeof updater === 'function' ? updater(policy) : { ...policy, ...updater };
          return { ...policy, ...next };
        });
        return {
          ...current,
          settings: {
            ...current.settings,
            notificationPolicies: policies
          }
        };
      });
    },
    [updateData]
  );

  const value = useMemo(
    () => ({
      tenantId,
      setTenantId,
      tenants: tenantState.items,
      tenantsLoading: tenantState.loading,
      tenantsError: tenantState.error,
      ...state,
      refresh: () => refreshOverview({ silent: false }),
      refreshSilently: () => refreshOverview({ silent: true }),
      refreshTenants,
      updateData,
      updateTicket,
      updateNotificationPolicy
    }),
    [refreshOverview, refreshTenants, state, tenantId, tenantState, updateData, updateNotificationPolicy, updateTicket]
  );

  return value;
}
