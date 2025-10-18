import { del, get, set } from 'idb-keyval';

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

export function createPersistentCache(namespace, { ttlMs, logger = noopLogger } = {}) {
  if (!namespace) {
    throw new Error('A namespace is required to create a persistent cache');
  }

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
    try {
      await set(buildKey(namespace, key), {
        value,
        storedAt,
        expiresAt
      });
      return { storedAt, expiresAt };
    } catch (error) {
      logger.error?.(`Failed to persist cache entry for ${namespace}:${key}`, error);
      return { storedAt, expiresAt };
    }
  }

  async function clear(key) {
    try {
      await del(buildKey(namespace, key));
    } catch (error) {
      logger.error?.(`Failed to clear cache entry for ${namespace}:${key}`, error);
    }
  }

  return {
    read,
    write,
    clear
  };
}

export default createPersistentCache;
