import PropTypes from 'prop-types';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { httpClient } from '../api/httpClient.js';
import { useAuth } from './AuthContext.jsx';

const RuntimeConfigContext = createContext({
  loading: true,
  error: null,
  featureFlags: {},
  runtimeConfig: {},
  refresh: async () => {},
  isFeatureEnabled: () => false,
  getConfigValue: () => null
});

export function RuntimeConfigProvider({ children }) {
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [featureFlags, setFeatureFlags] = useState({});
  const [runtimeConfig, setRuntimeConfig] = useState({});
  const isAdmin = session?.user?.role === 'admin';
  const isAuthenticated = Boolean(session?.tokens?.accessToken);

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

      if (!response?.data) {
        throw new Error('Runtime configuration payload missing data field');
      }

      setFeatureFlags(response.data.featureFlags ?? {});
      setRuntimeConfig(response.data.runtimeConfig ?? {});
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, isAuthenticated, session?.tokens?.accessToken]);

  useEffect(() => {
    fetchSnapshot();
  }, [fetchSnapshot]);

  const isFeatureEnabled = useCallback(
    (key, fallback = false) => {
      const entry = featureFlags[key];
      if (!entry) {
        return fallback;
      }
      return entry.enabled;
    },
    [featureFlags]
  );

  const getConfigValue = useCallback(
    (key, fallback = null) => {
      const entry = runtimeConfig[key];
      if (!entry) {
        return fallback;
      }
      return entry.value ?? fallback;
    },
    [runtimeConfig]
  );

  const value = useMemo(
    () => ({
      loading,
      error,
      featureFlags,
      runtimeConfig,
      refresh: fetchSnapshot,
      isFeatureEnabled,
      getConfigValue
    }),
    [loading, error, featureFlags, runtimeConfig, fetchSnapshot, isFeatureEnabled, getConfigValue]
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
