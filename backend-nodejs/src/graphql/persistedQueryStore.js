import crypto from 'node:crypto';

function normaliseHash(value) {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim().toLowerCase();
  return trimmed.length ? trimmed : null;
}

export class InMemoryPersistedQueryStore {
  constructor({ maxSize = 500, ttlMs = 24 * 60 * 60 * 1000, now = () => Date.now() } = {}) {
    this.maxSize = Math.max(10, Number.parseInt(maxSize, 10) || 500);
    this.ttlMs = Math.max(60_000, Number.parseInt(ttlMs, 10) || 24 * 60 * 60 * 1000);
    this.now = typeof now === 'function' ? now : () => Date.now();
    this.entries = new Map();
  }

  set(hash, query) {
    const normalisedHash = normaliseHash(hash);
    if (!normalisedHash || typeof query !== 'string') {
      return;
    }

    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      return;
    }

    const expiresAt = this.now() + this.ttlMs;
    this.entries.set(normalisedHash, { query: trimmedQuery, expiresAt });
    this.prune();
  }

  get(hash) {
    const normalisedHash = normaliseHash(hash);
    if (!normalisedHash) {
      return null;
    }

    this.prune();
    const entry = this.entries.get(normalisedHash);
    if (!entry) {
      return null;
    }

    if (entry.expiresAt <= this.now()) {
      this.entries.delete(normalisedHash);
      return null;
    }

    return entry.query;
  }

  has(hash) {
    return this.get(hash) !== null;
  }

  size() {
    this.prune();
    return this.entries.size;
  }

  prune() {
    const now = this.now();
    for (const [hash, entry] of this.entries) {
      if (!entry || entry.expiresAt <= now) {
        this.entries.delete(hash);
      }
    }

    while (this.entries.size > this.maxSize) {
      const oldestKey = this.entries.keys().next().value;
      if (oldestKey === undefined) {
        break;
      }
      this.entries.delete(oldestKey);
    }
  }

  clear() {
    this.entries.clear();
  }

  replaceAll(entries) {
    this.clear();
    if (!Array.isArray(entries)) {
      return;
    }

    for (const entry of entries) {
      if (!entry || typeof entry !== 'object') {
        continue;
      }

      const { hash, query } = entry;
      this.set(hash, query);
    }
  }
}

export function computeSha256(input) {
  const text = typeof input === 'string' ? input : String(input ?? '');
  return crypto.createHash('sha256').update(text).digest('hex');
}

const defaultStore = new InMemoryPersistedQueryStore();

export default defaultStore;
