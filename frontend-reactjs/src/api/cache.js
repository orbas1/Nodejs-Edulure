const DEFAULT_TTL = 1000 * 60 * 2; // 2 minutes
const DEFAULT_MAX_ENTRIES = 200;

const serialise = (value) => {
  if (value === null || value === undefined) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(serialise);
  }

  if (typeof value === 'object') {
    const sortedEntries = Object.keys(value)
      .sort()
      .map((key) => [key, serialise(value[key])]);

    return Object.fromEntries(sortedEntries);
  }

  return value;
};

export class InMemoryCache {
  constructor({ ttl = DEFAULT_TTL, maxEntries = DEFAULT_MAX_ENTRIES } = {}) {
    this.ttl = ttl;
    this.maxEntries = maxEntries;
    this.store = new Map();
    this.tagIndex = new Map();
  }

  createKey(descriptor) {
    return JSON.stringify(serialise(descriptor));
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) {
      return undefined;
    }

    if (entry.expiresAt && entry.expiresAt <= Date.now()) {
      this.delete(key);
      return undefined;
    }

    return entry.value;
  }

  set(key, value, { ttl, tags } = {}) {
    const expiresIn = typeof ttl === 'number' ? ttl : this.ttl;
    const expiresAt = expiresIn > 0 ? Date.now() + expiresIn : null;

    const entry = {
      value,
      expiresAt,
      tags: Array.isArray(tags) ? [...new Set(tags)] : []
    };

    this.store.set(key, entry);

    if (entry.tags.length > 0) {
      entry.tags.forEach((tag) => {
        if (!this.tagIndex.has(tag)) {
          this.tagIndex.set(tag, new Set());
        }
        this.tagIndex.get(tag).add(key);
      });
    }

    this.pruneOverflow();
  }

  delete(key) {
    const entry = this.store.get(key);
    if (!entry) {
      return;
    }

    this.store.delete(key);

    if (entry.tags?.length) {
      entry.tags.forEach((tag) => {
        const keys = this.tagIndex.get(tag);
        if (!keys) {
          return;
        }
        keys.delete(key);
        if (keys.size === 0) {
          this.tagIndex.delete(tag);
        }
      });
    }
  }

  invalidateTags(tags) {
    if (!tags) {
      return;
    }

    const list = Array.isArray(tags) ? tags : [tags];
    list.forEach((tag) => {
      const keys = this.tagIndex.get(tag);
      if (!keys) {
        return;
      }
      [...keys].forEach((key) => this.delete(key));
    });
  }

  clear() {
    this.store.clear();
    this.tagIndex.clear();
  }

  pruneExpired() {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (entry.expiresAt && entry.expiresAt <= now) {
        this.delete(key);
      }
    }
  }

  pruneOverflow() {
    if (this.maxEntries <= 0) {
      return;
    }

    this.pruneExpired();

    while (this.store.size > this.maxEntries) {
      const oldestKey = this.store.keys().next().value;
      this.delete(oldestKey);
    }
  }
}

export const responseCache = new InMemoryCache({ ttl: DEFAULT_TTL, maxEntries: DEFAULT_MAX_ENTRIES });

