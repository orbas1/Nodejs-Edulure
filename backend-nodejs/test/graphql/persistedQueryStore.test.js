import { describe, expect, it } from 'vitest';

import {
  InMemoryPersistedQueryStore,
  computeSha256
} from '../../src/graphql/persistedQueryStore.js';

describe('InMemoryPersistedQueryStore', () => {
  it('stores and retrieves queries until the ttl elapses', () => {
    let now = 0;
    const store = new InMemoryPersistedQueryStore({ ttlMs: 1000, now: () => now });

    const hash = computeSha256('query Test { viewer { id } }');
    store.set(hash, 'query Test { viewer { id } }');

    expect(store.get(hash)).toBe('query Test { viewer { id } }');

    now = 1001;
    expect(store.get(hash)).toBeNull();
    expect(store.size()).toBe(0);
  });

  it('replaces entries when hydrate is called with replaceAll', () => {
    const store = new InMemoryPersistedQueryStore({ maxSize: 10, ttlMs: 5000 });

    const firstHash = computeSha256('query First { viewer { id } }');
    const secondHash = computeSha256('query Second { feed { id } }');

    store.set(firstHash, 'query First { viewer { id } }');
    expect(store.has(firstHash)).toBe(true);

    store.replaceAll([
      { hash: secondHash, query: 'query Second { feed { id } }' }
    ]);

    expect(store.has(firstHash)).toBe(false);
    expect(store.get(secondHash)).toBe('query Second { feed { id } }');
    expect(store.size()).toBe(1);
  });
});

