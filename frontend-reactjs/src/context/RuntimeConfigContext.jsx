import PropTypes from 'prop-types';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { httpClient } from '../api/httpClient.js';
import { useAuth } from './AuthContext.jsx';

const RuntimeConfigContext = createContext({
  loading: true,
  error: null,
  featureFlags: {},
  runtimeConfig: {},
  segments: [],
  fetchedAt: null,
  audience: 'public',
  refresh: async () => {},
  isFeatureEnabled: () => false,
  getConfigValue: () => null,
  getFeatureVariant: () => null
});

export function RuntimeConfigProvider({ children }) {
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [featureFlags, setFeatureFlags] = useState({});
  const [runtimeConfig, setRuntimeConfig] = useState({});
  const [segments, setSegments] = useState([]);
  const [snapshotMeta, setSnapshotMeta] = useState({ fetchedAt: null, audience: 'public', ttlMs: null });
  const isAdmin = session?.user?.role === 'admin';
  const isAuthenticated = Boolean(session?.tokens?.accessToken);
  const refreshTimer = useRef(null);

  const fetchSnapshot = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const endpoint = isAdmin ? '/runtime/snapshot' : isAuthenticated ? '/runtime/user' : '/runtime/public';
      const params = isAdmin
        ? {
            audience: 'ops',
            includeFlags: true,
            includeConfigs: true,
            includeSensitive: false
          }
        : undefined;
      const response = await httpClient.get(endpoint, {
        params,
        token: isAuthenticated ? session?.tokens?.accessToken : undefined
      });

      const payload = response?.data ? response.data : response;
      if (!payload || typeof payload !== 'object') {
        throw new Error('Runtime configuration payload missing data field');
      }

      setFeatureFlags(payload.featureFlags ?? {});
      setRuntimeConfig(payload.runtimeConfig ?? {});
      setSegments(Array.isArray(payload.segments) ? payload.segments : []);
      setSnapshotMeta({
        fetchedAt: payload.generatedAt ?? payload.fetchedAt ?? new Date().toISOString(),
        audience: payload.audience ?? (isAdmin ? 'ops' : isAuthenticated ? 'user' : 'public'),
        ttlMs: Number.isFinite(Number(payload.ttlMs)) ? Number(payload.ttlMs) : null
      });
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, isAuthenticated, session?.tokens?.accessToken]);

  useEffect(() => {
    fetchSnapshot();
    return () => {
      if (refreshTimer.current) {
        window.clearTimeout(refreshTimer.current);
        refreshTimer.current = null;
      }
    };
  }, [fetchSnapshot]);

  useEffect(() => {
    if (!snapshotMeta.ttlMs || snapshotMeta.ttlMs <= 0) {
      return undefined;
    }
    if (refreshTimer.current) {
      window.clearTimeout(refreshTimer.current);
    }
    refreshTimer.current = window.setTimeout(() => {
      fetchSnapshot().catch(() => {});
    }, snapshotMeta.ttlMs);
    return () => {
      if (refreshTimer.current) {
        window.clearTimeout(refreshTimer.current);
        refreshTimer.current = null;
      }
    };
  }, [fetchSnapshot, snapshotMeta.ttlMs]);

  const isFeatureEnabled = useCallback(
    (key, fallback = false) => {
      const entry = featureFlags[key];
      if (!entry) {
        return fallback;
      }
      if (entry.enabled !== undefined) {
        return Boolean(entry.enabled);
      }
      if (entry.variant) {
        return entry.variant !== 'off';
      }
      return fallback;
    },
    [featureFlags]
  );

  const getFeatureVariant = useCallback(
    (key, fallback = null) => {
      const entry = featureFlags[key];
      if (!entry) {
        return fallback;
      }
      if (entry.variant !== undefined) {
        return entry.variant;
      }
      if (entry.enabled !== undefined) {
        return entry.enabled ? 'on' : 'off';
      }
      return fallback;
    },
    [featureFlags]
  );

  const getConfigValue = useCallback(
    (key, fallback = null) => {
      if (!key) {
        return fallback;
      }
      const parts = key.split('.');
      const [namespace, name] = parts.length > 1 ? [parts[0], parts.slice(1).join('.')] : [null, parts[0]];
      if (namespace) {
        const scoped = runtimeConfig[namespace];
        if (scoped && typeof scoped === 'object') {
          const entry = scoped[name];
          if (!entry) {
            return fallback;
          }
          return entry.value ?? entry ?? fallback;
        }
      }
      const entry = runtimeConfig[name];
      if (!entry) {
        return fallback;
      }
      return entry.value ?? entry ?? fallback;
    },
    [runtimeConfig]
  );

  const value = useMemo(
    () => ({
      loading,
      error,
      featureFlags,
      runtimeConfig,
      segments,
      fetchedAt: snapshotMeta.fetchedAt,
      audience: snapshotMeta.audience,
      refresh: fetchSnapshot,
      isFeatureEnabled,
      getConfigValue,
      getFeatureVariant
    }),
    [
      loading,
      error,
      featureFlags,
      runtimeConfig,
      segments,
      snapshotMeta.audience,
      snapshotMeta.fetchedAt,
      fetchSnapshot,
      isFeatureEnabled,
      getConfigValue,
      getFeatureVariant
    ]
  );

  return <RuntimeConfigContext.Provider value={value}>{children}</RuntimeConfigContext.Provider>;
}

RuntimeConfigProvider.propTypes = {
  children: PropTypes.node.isRequired
};

export function useRuntimeConfig() {
  const context = useContext(RuntimeConfigContext);
  if (!context) {
    throw new Error('useRuntimeConfig must be used within a RuntimeConfigProvider');
  }
  return context;
}
