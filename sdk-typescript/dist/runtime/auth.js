import { createTokenStore } from './tokenStore';
import { MissingAccessTokenError, TokenRefreshFailedError } from './errors';
const DEFAULT_REFRESH_MARGIN_MS = 30000;
const DEFAULT_BACKGROUND_INTERVAL_MS = 60000;
function resolveClock(clock) {
    return typeof clock === 'function' ? clock : () => Date.now();
}
export function createSessionManager({ store: providedStore, tokenStoreOptions, refresh, refreshMarginMs = DEFAULT_REFRESH_MARGIN_MS, clock, onRefreshStart, onRefreshSuccess, onRefreshError, backgroundRefresh, } = {}) {
    const resolvedClock = resolveClock(clock);
    const store = providedStore ??
        createTokenStore({
            ...(tokenStoreOptions ?? {}),
            clock: tokenStoreOptions?.clock ?? resolvedClock,
        });
    const margin = Math.max(0, refreshMarginMs ?? DEFAULT_REFRESH_MARGIN_MS);
    let refreshPromise = null;
    let backgroundTimer = null;
    const backgroundConfig = (() => {
        if (!refresh) {
            return null;
        }
        if (typeof backgroundRefresh === 'boolean') {
            return backgroundRefresh ? {} : null;
        }
        if (backgroundRefresh && typeof backgroundRefresh === 'object') {
            return backgroundRefresh;
        }
        return null;
    })();
    const backgroundInterval = backgroundConfig
        ? Math.max(1000, backgroundConfig.intervalMs ?? Math.max(margin, DEFAULT_BACKGROUND_INTERVAL_MS))
        : null;
    const runRefresh = async (force) => {
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
            }
            catch (error) {
                const wrapped = error instanceof TokenRefreshFailedError
                    ? error
                    : new TokenRefreshFailedError('Failed to refresh access token', { cause: error });
                onRefreshError?.(wrapped);
                throw wrapped;
            }
            finally {
                refreshPromise = null;
            }
        })();
        return refreshPromise;
    };
    const manager = {
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
            if (backgroundTimer) {
                clearInterval(backgroundTimer);
                backgroundTimer = null;
            }
        },
        subscribe(listener) {
            return store.subscribe(listener);
        },
        async isExpired(graceMs) {
            return store.isExpired(graceMs ?? margin);
        },
        startBackgroundRefresh() {
            if (!refresh || backgroundTimer || !backgroundInterval) {
                return;
            }
            backgroundTimer = setInterval(() => {
                void (async () => {
                    try {
                        const expired = await store.isExpired(margin);
                        if (expired) {
                            await runRefresh(false);
                        }
                    }
                    catch (error) {
                        onRefreshError?.(error);
                    }
                })();
            }, backgroundInterval);
        },
        stopBackgroundRefresh() {
            if (backgroundTimer) {
                clearInterval(backgroundTimer);
                backgroundTimer = null;
            }
        },
        isBackgroundRefreshRunning() {
            return Boolean(backgroundTimer);
        },
    };
    if (backgroundConfig && backgroundConfig.autoStart !== false) {
        manager.startBackgroundRefresh();
    }
    return manager;
}
export function formatAuthorizationHeader(token, scheme = 'Bearer') {
    if (!scheme) {
        return token;
    }
    return `${scheme} ${token}`;
}
export function createAuthorizationHeaderResolver(session, { header = 'Authorization', scheme = 'Bearer', refresh = true, allowEmpty = false } = {}) {
    return async () => {
        const token = refresh ? await session.ensureFreshToken() : await session.getAccessToken();
        if (!token) {
            if (allowEmpty) {
                return { [header]: '' };
            }
            throw new MissingAccessTokenError('Access token is required to generate the authorization header.');
        }
        const value = scheme ? formatAuthorizationHeader(token, scheme) : token;
        return { [header]: value };
    };
}
//# sourceMappingURL=auth.js.map