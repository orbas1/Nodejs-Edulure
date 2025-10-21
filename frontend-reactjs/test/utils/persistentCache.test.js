import { beforeEach, describe, expect, it, vi } from 'vitest';

const store = new Map();

vi.mock('idb-keyval', () => ({
  get: vi.fn(async (key) => store.get(key) ?? null),
  set: vi.fn(async (key, value) => {
    store.set(key, value);
  }),
  del: vi.fn(async (key) => {
    store.delete(key);
  }),
  keys: vi.fn(async () => Array.from(store.keys()))
}));

import { createPersistentCache } from '../../src/utils/persistentCache.js';
import { del, get, keys, set } from 'idb-keyval';

describe('createPersistentCache', () => {
  beforeEach(() => {
    store.clear();
    vi.clearAllMocks();
  });

  it('writes and reads cache entries', async () => {
    const cache = createPersistentCache('learner', { ttlMs: 5000 });
    await cache.write('profile', { name: 'Jordan' });
    const entry = await cache.read('profile');
    expect(entry.value).toEqual({ name: 'Jordan' });
    expect(get).toHaveBeenCalledWith('learner:profile');
    expect(set).toHaveBeenCalled();
  });

  it('expires entries once ttl elapsed', async () => {
    vi.useFakeTimers();
    const cache = createPersistentCache('learner', { ttlMs: 1000 });
    await cache.write('session', { id: 1 });
    vi.setSystemTime(Date.now() + 2000);
    const entry = await cache.read('session');
    expect(entry).toBeNull();
    expect(del).toHaveBeenCalledWith('learner:session');
    vi.useRealTimers();
  });

  it('clears entries manually', async () => {
    const cache = createPersistentCache('learner');
    await cache.write('x', { foo: true });
    await cache.clear('x');
    expect(del).toHaveBeenCalledWith('learner:x');
  });

  it('prunes expired namespace entries', async () => {
    vi.useFakeTimers();
    const cache = createPersistentCache('learner', { ttlMs: 1000 });
    await cache.write('stale', { foo: 'bar' }, { ttlOverride: 100 });
    await cache.write('fresh', { foo: 'baz' });
    vi.setSystemTime(Date.now() + 5000);

    await cache.prune();

    expect(keys).toHaveBeenCalled();
    expect(del).toHaveBeenCalledWith('learner:stale');
    expect(store.has('learner:fresh')).toBe(true);
    vi.useRealTimers();
  });
});
