export type TokenScope = string | string[] | null | undefined;

export type TokenSet = {
  accessToken: string | null;
  refreshToken?: string | null;
  idToken?: string | null;
  tokenType?: string | null;
  scope?: TokenScope;
  expiresAt?: number | string | null;
  expiresIn?: number | null;
  issuedAt?: number | null;
  metadata?: Record<string, unknown> | null;
};

export type TokenStoreListener = (tokenSet: TokenSet | null) => void;

export interface TokenStorageAdapter {
  load(): Promise<TokenSet | null | undefined>;
  save(tokenSet: TokenSet | null): Promise<void>;
  readonly syncKey?: string;
}

export type TokenStoreOptions = {
  initialTokenSet?: TokenSet | null;
  storageAdapter?: TokenStorageAdapter;
  clock?: () => number;
  autoHydrate?: boolean;
  syncStorageKey?: string;
  storageEventTarget?: {
    addEventListener(type: 'storage', listener: (event: StorageEvent) => void): void;
    removeEventListener(type: 'storage', listener: (event: StorageEvent) => void): void;
  };
};

export interface TokenStore {
  get(): Promise<TokenSet | null>;
  set(tokenSet: TokenSet | null | undefined): Promise<void>;
  update(partial: Partial<TokenSet>): Promise<TokenSet | null>;
  clear(): Promise<void>;
  subscribe(listener: TokenStoreListener): () => void;
  isExpired(graceMs?: number): Promise<boolean>;
  destroy?(): Promise<void>;
}

const DEFAULT_REFRESH_MARGIN = 0;

type Clock = () => number;

type NormalisedTokenSet = TokenSet & { expiresAt?: number | null; issuedAt?: number | null };

function toFiniteNumber(value: unknown): number | null {
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

function serialiseTokenSet(tokenSet: TokenSet | null): TokenSet | null {
  if (!tokenSet) {
    return null;
  }
  const serialisable: TokenSet = {
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

function normaliseTokenSet(tokenSet: TokenSet | null | undefined, clock: Clock): NormalisedTokenSet | null {
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

function applyPartialUpdate(current: NormalisedTokenSet | null, patch: Partial<TokenSet>, clock: Clock): NormalisedTokenSet | null {
  if (!patch || Object.keys(patch).length === 0) {
    return current;
  }
  const merged: TokenSet = {
    ...(current ?? {}),
    ...patch,
  } as TokenSet;
  return normaliseTokenSet(merged, clock);
}

export function createTokenStore({
  initialTokenSet,
  storageAdapter,
  clock: providedClock,
  autoHydrate = true,
  syncStorageKey,
  storageEventTarget,
}: TokenStoreOptions = {}): TokenStore {
  const clock: Clock = providedClock ?? (() => Date.now());
  let current: NormalisedTokenSet | null = normaliseTokenSet(initialTokenSet, clock);
  const listeners = new Set<TokenStoreListener>();
  const resolvedEventTarget =
    storageEventTarget ?? (typeof window !== 'undefined' ? (window as Window & typeof globalThis) : undefined);
  const storageSyncKey = syncStorageKey ?? storageAdapter?.syncKey;
  let storageEventHandler: ((event: StorageEvent) => void) | null = null;

  let hydrationPromise: Promise<void> | null = null;
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

  const ready = async (): Promise<void> => {
    if (hydrationPromise) {
      await hydrationPromise;
    }
  };

  const persist = async (tokenSet: NormalisedTokenSet | null): Promise<void> => {
    if (!storageAdapter) {
      return;
    }
    await storageAdapter.save(serialiseTokenSet(tokenSet));
  };

  const notify = (tokenSet: NormalisedTokenSet | null) => {
    listeners.forEach((listener) => {
      try {
        listener(tokenSet);
      } catch (error) {
        if (typeof console !== 'undefined' && console.error) {
          console.error('TokenStore listener threw an error', error);
        }
      }
    });
  };

  if (storageAdapter && storageSyncKey && resolvedEventTarget?.addEventListener) {
    storageEventHandler = (event: StorageEvent) => {
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

  const store: TokenStore = {
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

export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export function createBrowserStorageAdapter(storage: StorageLike, key: string): TokenStorageAdapter {
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
          return parsed as TokenSet;
        }
      } catch (error) {
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
      } catch (error) {
        if (typeof console !== 'undefined' && console.error) {
          console.error('Failed to persist token set', error);
        }
      }
    },
  };
}
