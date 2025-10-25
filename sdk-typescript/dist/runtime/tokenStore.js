const DEFAULT_REFRESH_MARGIN = 0;
function toFiniteNumber(value) {
    if (value === undefined || value === null) {
        return null;
    }
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : null;
    }
    if (typeof value === 'string' && value.trim().length) {
        const direct = Number(value);
        if (Number.isFinite(direct)) {
            return direct;
        }
        const parsed = Date.parse(value);
        if (!Number.isNaN(parsed)) {
            return parsed;
        }
    }
    return null;
}
function serialiseTokenSet(tokenSet) {
    if (!tokenSet) {
        return null;
    }
    const serialisable = {
        accessToken: tokenSet.accessToken ?? null,
    };
    if (tokenSet.refreshToken !== undefined) {
        serialisable.refreshToken = tokenSet.refreshToken ?? null;
    }
    if (tokenSet.idToken !== undefined) {
        serialisable.idToken = tokenSet.idToken ?? null;
    }
    if (tokenSet.tokenType !== undefined) {
        serialisable.tokenType = tokenSet.tokenType ?? null;
    }
    if (tokenSet.scope !== undefined) {
        serialisable.scope = tokenSet.scope ?? null;
    }
    if (tokenSet.expiresAt !== undefined) {
        serialisable.expiresAt = tokenSet.expiresAt ?? null;
    }
    if (tokenSet.expiresIn !== undefined) {
        serialisable.expiresIn = tokenSet.expiresIn ?? null;
    }
    if (tokenSet.issuedAt !== undefined) {
        serialisable.issuedAt = tokenSet.issuedAt ?? null;
    }
    if (tokenSet.metadata !== undefined) {
        serialisable.metadata = tokenSet.metadata ?? null;
    }
    return serialisable;
}
function normaliseTokenSet(tokenSet, clock) {
    if (!tokenSet) {
        return null;
    }
    const now = clock();
    const issuedAt = toFiniteNumber(tokenSet.issuedAt) ?? now;
    const expiresInSeconds = tokenSet.expiresIn ?? null;
    const expiresAt = (() => {
        const resolved = toFiniteNumber(tokenSet.expiresAt);
        if (resolved !== null) {
            return resolved;
        }
        if (expiresInSeconds !== null) {
            return issuedAt + expiresInSeconds * 1000;
        }
        return null;
    })();
    return {
        accessToken: tokenSet.accessToken ?? null,
        refreshToken: tokenSet.refreshToken ?? null,
        idToken: tokenSet.idToken ?? null,
        tokenType: tokenSet.tokenType ?? null,
        scope: tokenSet.scope ?? null,
        expiresAt,
        expiresIn: expiresInSeconds,
        issuedAt,
        metadata: tokenSet.metadata ?? null,
    };
}
function applyPartialUpdate(current, patch, clock) {
    if (!patch || Object.keys(patch).length === 0) {
        return current;
    }
    const merged = {
        ...(current ?? {}),
        ...patch,
    };
    return normaliseTokenSet(merged, clock);
}
export function createTokenStore({ initialTokenSet, storageAdapter, clock: providedClock, autoHydrate = true, syncStorageKey, storageEventTarget, } = {}) {
    const clock = providedClock ?? (() => Date.now());
    let current = normaliseTokenSet(initialTokenSet, clock);
    const listeners = new Set();
    const resolvedEventTarget = storageEventTarget ?? (typeof window !== 'undefined' ? window : undefined);
    const storageSyncKey = syncStorageKey ?? storageAdapter?.syncKey;
    let storageEventHandler = null;
    let hydrationPromise = null;
    if (storageAdapter && autoHydrate) {
        hydrationPromise = storageAdapter
            .load()
            .then((loaded) => {
            current = normaliseTokenSet(loaded ?? null, clock);
        })
            .catch((error) => {
            if (typeof console !== 'undefined' && console.warn) {
                console.warn('Failed to load tokens from storage adapter', error);
            }
        })
            .finally(() => {
            hydrationPromise = null;
        });
    }
    const ready = async () => {
        if (hydrationPromise) {
            await hydrationPromise;
        }
    };
    const persist = async (tokenSet) => {
        if (!storageAdapter) {
            return;
        }
        await storageAdapter.save(serialiseTokenSet(tokenSet));
    };
    const notify = (tokenSet) => {
        listeners.forEach((listener) => {
            try {
                listener(tokenSet);
            }
            catch (error) {
                if (typeof console !== 'undefined' && console.error) {
                    console.error('TokenStore listener threw an error', error);
                }
            }
        });
    };
    if (storageAdapter && storageSyncKey && resolvedEventTarget?.addEventListener) {
        storageEventHandler = (event) => {
            if (event.key !== storageSyncKey) {
                return;
            }
            void ready()
                .then(() => storageAdapter.load())
                .then((loaded) => {
                current = normaliseTokenSet(loaded ?? null, clock);
                notify(current);
            })
                .catch((error) => {
                if (typeof console !== 'undefined' && console.warn) {
                    console.warn('Failed to synchronise token store from storage event', error);
                }
            });
        };
        resolvedEventTarget.addEventListener('storage', storageEventHandler);
    }
    const store = {
        async get() {
            await ready();
            return current;
        },
        async set(next) {
            await ready();
            current = normaliseTokenSet(next ?? null, clock);
            await persist(current);
            notify(current);
        },
        async update(patch) {
            await ready();
            current = applyPartialUpdate(current, patch, clock);
            await persist(current);
            notify(current);
            return current;
        },
        async clear() {
            await store.set(null);
        },
        subscribe(listener) {
            listeners.add(listener);
            void ready().then(() => {
                listener(current);
            });
            return () => {
                listeners.delete(listener);
            };
        },
        async isExpired(graceMs = DEFAULT_REFRESH_MARGIN) {
            await ready();
            if (!current || !current.accessToken) {
                return true;
            }
            if (current.expiresAt === undefined || current.expiresAt === null) {
                return false;
            }
            const threshold = clock() + Math.max(0, graceMs);
            return current.expiresAt <= threshold;
        },
        async destroy() {
            if (storageEventHandler && resolvedEventTarget?.removeEventListener) {
                resolvedEventTarget.removeEventListener('storage', storageEventHandler);
                storageEventHandler = null;
            }
            listeners.clear();
        },
    };
    return store;
}
export function createBrowserStorageAdapter(storage, key) {
    return {
        syncKey: key,
        async load() {
            try {
                const raw = storage.getItem(key);
                if (!raw) {
                    return null;
                }
                const parsed = JSON.parse(raw);
                if (parsed && typeof parsed === 'object') {
                    return parsed;
                }
            }
            catch (error) {
                if (typeof console !== 'undefined' && console.warn) {
                    console.warn('Failed to parse stored token set', error);
                }
            }
            return null;
        },
        async save(tokenSet) {
            if (!tokenSet) {
                storage.removeItem(key);
                return;
            }
            try {
                storage.setItem(key, JSON.stringify(serialiseTokenSet(tokenSet)));
            }
            catch (error) {
                if (typeof console !== 'undefined' && console.error) {
                    console.error('Failed to persist token set', error);
                }
            }
        },
    };
}
//# sourceMappingURL=tokenStore.js.map