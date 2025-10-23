import PropTypes from 'prop-types';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { fetchSystemPreferences } from '../api/learnerDashboardApi.js';
import { useAuth } from './AuthContext.jsx';

const DEFAULT_SYSTEM_PREFERENCES = Object.freeze({
  language: 'en',
  region: 'US',
  timezone: 'UTC',
  notificationsEnabled: true,
  digestEnabled: true,
  autoPlayMedia: false,
  highContrast: false,
  reducedMotion: false,
  preferences: {
    interfaceDensity: 'comfortable',
    analyticsOptIn: true,
    subtitleLanguage: 'en',
    audioDescription: false
  }
});

const SystemPreferencesContext = createContext({
  preferences: DEFAULT_SYSTEM_PREFERENCES,
  loading: false,
  error: null,
  refresh: async () => DEFAULT_SYSTEM_PREFERENCES,
  setPreferences: () => DEFAULT_SYSTEM_PREFERENCES
});

function normalisePreferences(payload = {}) {
  return {
    ...DEFAULT_SYSTEM_PREFERENCES,
    ...payload,
    preferences: {
      ...DEFAULT_SYSTEM_PREFERENCES.preferences,
      ...(payload.preferences ?? {})
    }
  };
}

function withDocument(callback) {
  if (typeof document === 'undefined') {
    return;
  }
  callback(document.body ?? null);
}

export function SystemPreferencesProvider({ children }) {
  const { session, isAuthenticated } = useAuth();
  const token = session?.tokens?.accessToken ?? null;
  const [preferences, setPreferencesState] = useState(DEFAULT_SYSTEM_PREFERENCES);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const applyDocumentAttributes = useCallback((prefs) => {
    if (!prefs) return;
    withDocument((body) => {
      if (!body) return;
      body.setAttribute('data-motion', prefs.reducedMotion ? 'reduce' : 'standard');
      body.setAttribute('data-contrast', prefs.highContrast ? 'high' : 'standard');
      body.setAttribute(
        'data-density',
        prefs.preferences?.interfaceDensity ?? DEFAULT_SYSTEM_PREFERENCES.preferences.interfaceDensity
      );
      body.dataset.motionSource = 'user';
      body.dataset.contrastSource = 'user';
    });
  }, []);

  const clearDocumentAttributes = useCallback(() => {
    withDocument((body) => {
      if (!body) return;
      body.removeAttribute('data-motion');
      body.removeAttribute('data-contrast');
      body.removeAttribute('data-density');
      delete body.dataset.motionSource;
      delete body.dataset.contrastSource;
    });
  }, []);

  const setPreferences = useCallback(
    (nextPreferences) => {
      const normalised = normalisePreferences(nextPreferences);
      setPreferencesState(normalised);
      applyDocumentAttributes(normalised);
      setError(null);
      return normalised;
    },
    [applyDocumentAttributes]
  );

  const refresh = useCallback(async () => {
    if (!isAuthenticated || !token) {
      setPreferencesState(DEFAULT_SYSTEM_PREFERENCES);
      clearDocumentAttributes();
      return DEFAULT_SYSTEM_PREFERENCES;
    }

    setLoading(true);
    try {
      const response = await fetchSystemPreferences({ token });
      const payload = response?.data ?? DEFAULT_SYSTEM_PREFERENCES;
      return setPreferences(payload);
    } catch (refreshError) {
      const normalisedError =
        refreshError instanceof Error
          ? refreshError
          : new Error('Unable to load system preferences');
      setError(normalisedError);
      throw normalisedError;
    } finally {
      setLoading(false);
    }
  }, [clearDocumentAttributes, isAuthenticated, setPreferences, token]);

  useEffect(() => {
    let cancelled = false;

    if (!isAuthenticated || !token) {
      setPreferencesState(DEFAULT_SYSTEM_PREFERENCES);
      clearDocumentAttributes();
      setLoading(false);
      setError(null);
      return () => {
        cancelled = true;
      };
    }

    setLoading(true);
    (async () => {
      try {
        const response = await fetchSystemPreferences({ token });
        if (cancelled) return;
        const payload = response?.data ?? DEFAULT_SYSTEM_PREFERENCES;
        setPreferences(payload);
      } catch (initialError) {
        if (cancelled) return;
        const normalisedError =
          initialError instanceof Error
            ? initialError
            : new Error('Unable to load system preferences');
        setError(normalisedError);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, token, setPreferences, clearDocumentAttributes]);

  const value = useMemo(
    () => ({
      preferences,
      loading,
      error,
      refresh,
      setPreferences
    }),
    [preferences, loading, error, refresh, setPreferences]
  );

  return <SystemPreferencesContext.Provider value={value}>{children}</SystemPreferencesContext.Provider>;
}

SystemPreferencesProvider.propTypes = {
  children: PropTypes.node.isRequired
};

export function useSystemPreferences() {
  const context = useContext(SystemPreferencesContext);
  if (!context) {
    throw new Error('useSystemPreferences must be used within a SystemPreferencesProvider');
  }
  return context;
}

export { DEFAULT_SYSTEM_PREFERENCES };
