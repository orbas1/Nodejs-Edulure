import PropTypes from 'prop-types';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { httpClient } from '../api/httpClient.js';

const TOKEN_STORAGE_KEY = 'edulure.session';

const AuthContext = createContext({
  session: null,
  isAuthenticated: false,
  login: async () => {},
  logout: () => {},
  setSession: () => {}
});

function readStoredSession() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.tokens?.accessToken) return null;
    return parsed;
  } catch (error) {
    console.error('Failed to parse stored session', error);
    return null;
  }
}

function persistSession(session) {
  if (typeof window === 'undefined') return;
  if (!session) {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(session));
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => readStoredSession());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    persistSession(session);
  }, [session]);

  const login = useCallback(async (credentials) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await httpClient.post('/auth/login', credentials);
      if (!response?.data) {
        throw new Error('Unexpected login response');
      }
      const nextSession = {
        user: response.data.user,
        tokens: response.data.tokens
      };
      setSession(nextSession);
      return nextSession;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setSession(null);
  }, []);

  const value = useMemo(
    () => ({
      session,
      isAuthenticated: Boolean(session?.tokens?.accessToken),
      isLoading,
      error,
      login,
      logout,
      setSession
    }),
    [session, isLoading, error, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
