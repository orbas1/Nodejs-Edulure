import type { ApiRequestOptions } from '../generated/core/ApiRequestOptions';

import { createTokenStore } from './tokenStore';
import type { TokenSet, TokenStore, TokenStoreListener } from './tokenStore';

const DEFAULT_REFRESH_MARGIN_MS = 30_000;

type Clock = () => number;

type HeaderMap = Record<string, string>;

export type TokenRefreshHandler = (current: TokenSet | null) => Promise<TokenSet | null | undefined>;

export type SessionManagerEvents = {
  onRefreshStart?: (current: TokenSet | null) => void;
  onRefreshSuccess?: (next: TokenSet | null) => void;
  onRefreshError?: (error: unknown) => void;
};

export type SessionManagerOptions = SessionManagerEvents & {
  store?: TokenStore;
  refresh?: TokenRefreshHandler;
  refreshMarginMs?: number;
  clock?: Clock;
};

export interface SessionManager {
  readonly store: TokenStore;
  getTokenSet(): Promise<TokenSet | null>;
  setTokenSet(tokenSet: TokenSet | null): Promise<void>;
  updateTokenSet(patch: Partial<TokenSet>): Promise<TokenSet | null>;
  getAccessToken(): Promise<string | null>;
  ensureFreshToken(): Promise<string | null>;
  refresh(): Promise<TokenSet | null>;
  clear(): Promise<void>;
  subscribe(listener: TokenStoreListener): () => void;
  isExpired(graceMs?: number): Promise<boolean>;
}

type AsyncHeaderResolver = (options: ApiRequestOptions) => Promise<HeaderMap> | HeaderMap;

export type AuthorizationHeaderOptions = {
  header?: string;
  scheme?: string;
  refresh?: boolean;
  allowEmpty?: boolean;
};

function resolveClock(clock?: Clock): Clock {
  return typeof clock === 'function' ? clock : () => Date.now();
}

export function createSessionManager({
  store: providedStore,
  refresh,
  refreshMarginMs = DEFAULT_REFRESH_MARGIN_MS,
  clock,
  onRefreshStart,
  onRefreshSuccess,
  onRefreshError,
}: SessionManagerOptions = {}): SessionManager {
  const resolvedClock = resolveClock(clock);
  const store = providedStore ?? createTokenStore({ clock: resolvedClock });
  const margin = Math.max(0, refreshMarginMs ?? DEFAULT_REFRESH_MARGIN_MS);
  let refreshPromise: Promise<TokenSet | null> | null = null;

  const runRefresh = async (force: boolean): Promise<TokenSet | null> => {
    if (!refresh) {
      return store.get();
    }

    if (refreshPromise) {
      return refreshPromise;
    }

    refreshPromise = (async () => {
      const current = await store.get();
      if (!force) {
        const expired = await store.isExpired(margin);
        if (!expired) {
          return current;
        }
      }

      onRefreshStart?.(current);

      try {
        const next = await refresh(current);
        if (next !== undefined) {
          await store.set(next);
        }
        const resolved = next !== undefined ? next : await store.get();
        onRefreshSuccess?.(resolved ?? null);
        return resolved ?? null;
      } catch (error) {
        onRefreshError?.(error);
        throw error;
      } finally {
        refreshPromise = null;
      }
    })();

    return refreshPromise;
  };

  const manager: SessionManager = {
    store,

    async getTokenSet() {
      return store.get();
    },

    async setTokenSet(tokenSet) {
      await store.set(tokenSet ?? null);
    },

    async updateTokenSet(patch) {
      return store.update(patch);
    },

    async getAccessToken() {
      const tokenSet = await store.get();
      return tokenSet?.accessToken ?? null;
    },

    async ensureFreshToken() {
      if (!refresh) {
        const tokenSet = await store.get();
        return tokenSet?.accessToken ?? null;
      }
      const expired = await store.isExpired(margin);
      if (!expired) {
        const tokenSet = await store.get();
        return tokenSet?.accessToken ?? null;
      }
      const refreshed = await runRefresh(true);
      if (refreshed?.accessToken) {
        return refreshed.accessToken;
      }
      const fallback = await store.get();
      return fallback?.accessToken ?? null;
    },

    async refresh() {
      return runRefresh(true);
    },

    async clear() {
      await store.clear();
    },

    subscribe(listener) {
      return store.subscribe(listener);
    },

    async isExpired(graceMs) {
      return store.isExpired(graceMs ?? margin);
    },
  };

  return manager;
}

export function formatAuthorizationHeader(token: string, scheme = 'Bearer'): string {
  if (!scheme) {
    return token;
  }
  return `${scheme} ${token}`;
}

export function createAuthorizationHeaderResolver(
  session: SessionManager,
  { header = 'Authorization', scheme = 'Bearer', refresh = true, allowEmpty = false }: AuthorizationHeaderOptions = {}
): AsyncHeaderResolver {
  return async () => {
    const token = refresh ? await session.ensureFreshToken() : await session.getAccessToken();
    if (!token) {
      return allowEmpty ? { [header]: '' } : {};
    }
    const value = scheme ? formatAuthorizationHeader(token, scheme) : token;
    return { [header]: value };
  };
}
