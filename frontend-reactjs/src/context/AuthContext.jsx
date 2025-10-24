import PropTypes from 'prop-types';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';

import { httpClient } from '../api/httpClient.js';

const TOKEN_STORAGE_KEY = 'edulure.session';

const defaultAuthContext = {
  session: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  actor: null,
  permissions: [],
  hasPermission: () => false,
  activeTenantId: null,
  switchTenant: () => {},
  login: async () => {},
  logout: () => {},
  refresh: async () => {},
  setSession: () => {},
  sessionExpiresAt: null,
  lastAuthenticatedAt: null
};

export const AuthContext = createContext(defaultAuthContext);

function toISOString(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function normalisePermissionList(source) {
  if (!source) return [];
  if (Array.isArray(source)) {
    return [...new Set(source.map((item) => item && String(item).trim()).filter(Boolean))];
  }
  if (typeof source === 'object') {
    return Object.keys(source).filter((key) => Boolean(source[key]));
  }
  if (typeof source === 'string') {
    return source
      .split(',')
      .map((item) => item && item.trim())
      .filter(Boolean);
  }
  return [];
}

function normaliseTenantList(source) {
  if (!Array.isArray(source)) {
    return [];
  }
  return source
    .map((tenant) => {
      if (!tenant) return null;
      const id = tenant.id ?? tenant.tenantId ?? tenant.slug ?? null;
      if (!id) {
        return null;
      }
      return {
        id,
        name: tenant.name ?? tenant.label ?? 'Workspace',
        slug: tenant.slug ?? tenant.code ?? String(id),
        role: tenant.role ?? tenant.membershipRole ?? null,
        permissions: normalisePermissionList(tenant.permissions)
      };
    })
    .filter(Boolean);
}

function normaliseSession(raw) {
  if (!raw) {
    return null;
  }

  const user = raw.user ?? {};
  const tokens = raw.tokens ?? {};
  const permissions = normalisePermissionList(raw.permissions ?? user.permissions);
  const tenants = normaliseTenantList(raw.tenants ?? user.tenants ?? []);
  const expiresAt =
    toISOString(tokens.expiresAt ?? tokens.expires_at ?? raw.expiresAt ?? raw.sessionExpiresAt) ?? null;
  const actor = {
    id: user.id ?? null,
    email: user.email ?? null,
    name: user.name ?? user.fullName ?? user.displayName ?? null,
    role: user.role ?? 'learner',
    scopes: Array.isArray(tokens.scopes)
      ? tokens.scopes
      : Array.isArray(raw.scopes)
        ? raw.scopes
        : [],
    tenants,
    permissions
  };

  return {
    ...raw,
    user,
    tokens,
    permissions,
    tenants,
    actor,
    expiresAt
  };
}

function readStoredSession() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.tokens?.accessToken) return null;
    return normaliseSession(parsed);
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
  const [activeTenantId, setActiveTenantId] = useState(() => {
    const initial = readStoredSession();
    if (!initial) return null;
    return initial.activeTenantId ?? initial.tenants?.[0]?.id ?? null;
  });
  const [lastAuthenticatedAt, setLastAuthenticatedAt] = useState(() =>
    session ? new Date().toISOString() : null
  );
  const expiryTimerRef = useRef(null);

  useEffect(() => {
    if (session) {
      const payload = { ...session, activeTenantId };
      persistSession(payload);
      return;
    }
    persistSession(null);
  }, [session, activeTenantId]);

  useEffect(() => {
    setActiveTenantId((current) => {
      if (!session) {
        return null;
      }
      if (current && session.tenants?.some((tenant) => tenant.id === current)) {
        return current;
      }
      return session.activeTenantId ?? session.tenants?.[0]?.id ?? null;
    });
  }, [session]);

  useEffect(() => {
    if (expiryTimerRef.current) {
      window.clearTimeout(expiryTimerRef.current);
      expiryTimerRef.current = null;
    }

    const expiresAt = session?.expiresAt;
    if (!expiresAt) {
      return undefined;
    }
    const expiryDate = new Date(expiresAt);
    if (Number.isNaN(expiryDate.getTime())) {
      return undefined;
    }

    const delay = expiryDate.getTime() - Date.now();
    if (delay <= 0) {
      setSession(null);
      return undefined;
    }

    expiryTimerRef.current = window.setTimeout(() => {
      setSession(null);
    }, delay);

    return () => {
      if (expiryTimerRef.current) {
        window.clearTimeout(expiryTimerRef.current);
        expiryTimerRef.current = null;
      }
    };
  }, [session]);

  const login = useCallback(async (credentials) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await httpClient.post('/auth/login', credentials);
      if (!response?.data && !response?.tokens) {
        throw new Error('Unexpected login response');
      }
      const nextSession = normaliseSession(response.data ?? response);
      setSession(nextSession);
      setLastAuthenticatedAt(new Date().toISOString());
      setActiveTenantId(nextSession.activeTenantId ?? nextSession.tenants?.[0]?.id ?? null);
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
    setActiveTenantId(null);
    setLastAuthenticatedAt(null);
  }, []);

  const refresh = useCallback(async () => {
    if (!session?.tokens?.accessToken) {
      return null;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await httpClient.get('/auth/session', {
        token: session.tokens.accessToken,
        params: activeTenantId ? { tenantId: activeTenantId } : undefined
      });
      const nextSession = normaliseSession({ ...response, tokens: session.tokens });
      setSession(nextSession);
      setLastAuthenticatedAt(new Date().toISOString());
      return nextSession;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [activeTenantId, session]);

  const switchTenant = useCallback(
    async (tenantId) => {
      if (!tenantId || tenantId === activeTenantId) {
        return;
      }
      setActiveTenantId(tenantId);
      if (session?.tokens?.accessToken) {
        try {
          await httpClient.post(
            '/auth/switch-tenant',
            { tenantId },
            { token: session.tokens.accessToken, invalidateTags: ['dashboard:me'] }
          );
        } catch (error) {
          console.warn('Failed to inform backend about tenant switch', error);
        }
      }
    },
    [activeTenantId, session]
  );

  const hasPermission = useCallback(
    (permission) => {
      if (!permission) {
        return false;
      }
      const list = session?.permissions ?? [];
      return list.includes(permission);
    },
    [session]
  );

  const value = useMemo(
    () => ({
      session,
      isAuthenticated: Boolean(session?.tokens?.accessToken),
      isLoading,
      error,
      actor: session?.actor ?? null,
      permissions: session?.permissions ?? [],
      hasPermission,
      activeTenantId,
      switchTenant,
      login,
      logout,
      refresh,
      setSession,
      sessionExpiresAt: session?.expiresAt ?? null,
      lastAuthenticatedAt
    }),
    [
      session,
      isLoading,
      error,
      login,
      logout,
      refresh,
      hasPermission,
      activeTenantId,
      switchTenant,
      lastAuthenticatedAt
    ]
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
