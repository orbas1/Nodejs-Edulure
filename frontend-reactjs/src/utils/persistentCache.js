import { del, get, keys, set } from 'idb-keyval';

import { getEnvironmentCacheKey, getEnvironmentContext, resolveEnvironmentDescriptor } from './environment.js';

const noopLogger = {
  error: () => {}
};

function buildKey(namespace, key) {
  return `${namespace}:${key}`;
}

function normaliseTtl(defaultTtl, overrideTtl) {
  if (overrideTtl === null) {
    return null;
  }
  if (typeof overrideTtl === 'number' && Number.isFinite(overrideTtl)) {
    return Math.max(overrideTtl, 0);
  }
  if (typeof defaultTtl === 'number' && Number.isFinite(defaultTtl)) {
    return Math.max(defaultTtl, 0);
  }
  return null;
}

export function createPersistentCache(
  namespace,
  { ttlMs, logger = noopLogger, schemaVersion = 1, environmentResolver = getEnvironmentContext } = {}
) {
  if (!namespace) {
    throw new Error('A namespace is required to create a persistent cache');
  }

  const resolveEnvironmentKey = () => {
    try {
      const descriptor = resolveEnvironmentDescriptor(
        typeof environmentResolver === 'function' ? environmentResolver() : environmentResolver
      );
      return getEnvironmentCacheKey(descriptor);
    } catch (error) {
      logger.error?.(`Failed to resolve environment key for ${namespace}`, error);
      const fallbackDescriptor = resolveEnvironmentDescriptor(getEnvironmentContext());
      return getEnvironmentCacheKey(fallbackDescriptor);
    }
  };

  async function read(key) {
    try {
      const entry = await get(buildKey(namespace, key));
      if (!entry) {
        return null;
      }

      if (entry.expiresAt && entry.expiresAt < Date.now()) {
        await del(buildKey(namespace, key));
        return null;
      }

      const currentEnvironmentKey = resolveEnvironmentKey();
      if (entry.environmentKey && entry.environmentKey !== currentEnvironmentKey) {
        await del(buildKey(namespace, key));
        return null;
      }

      if (entry.schemaVersion && entry.schemaVersion !== schemaVersion) {
        await del(buildKey(namespace, key));
        return null;
      }

      return entry;
    } catch (error) {
      logger.error?.(`Failed to read cache entry for ${namespace}:${key}`, error);
      return null;
    }
  }

  async function write(key, value, { ttlOverride } = {}) {
    const ttl = normaliseTtl(ttlMs, ttlOverride);
    const storedAt = Date.now();
    const expiresAt = ttl === null ? null : storedAt + ttl;
    const environmentKey = resolveEnvironmentKey();
    try {
      await set(buildKey(namespace, key), {
        value,
        storedAt,
        expiresAt,
        schemaVersion,
        environmentKey
      });
      return { storedAt, expiresAt, environmentKey, schemaVersion };
    } catch (error) {
      logger.error?.(`Failed to persist cache entry for ${namespace}:${key}`, error);
      return { storedAt, expiresAt, environmentKey, schemaVersion };
    }
  }

  async function clear(key) {
    try {
      await del(buildKey(namespace, key));
    } catch (error) {
      logger.error?.(`Failed to clear cache entry for ${namespace}:${key}`, error);
    }
  }

  async function prune() {
    try {
      const allKeys = await keys();
      const namespacePrefix = `${namespace}:`;
      const candidates = allKeys.filter(
        (key) => typeof key === 'string' && key.startsWith(namespacePrefix)
      );
      await Promise.all(
        candidates.map(async (key) => {
          const entry = await get(key);
          if (entry?.expiresAt && entry.expiresAt < Date.now()) {
            await del(key);
          }
        })
      );
    } catch (error) {
      logger.error?.(`Failed to prune cache entries for ${namespace}`, error);
    }
  }

  return {
    read,
    write,
    clear,
    prune
  };
}

export default createPersistentCache;
