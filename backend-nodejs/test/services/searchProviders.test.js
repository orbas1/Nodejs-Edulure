import { describe, expect, it, vi } from 'vitest';

import getSearchProvider, {
  registerSearchProvider
} from '../../src/services/search/searchProviders.js';
import databaseSearchProvider from '../../src/services/search/providers/databaseSearchProvider.js';

describe('search provider registry', () => {
  it('returns the database provider by default', () => {
    const provider = getSearchProvider();
    expect(provider).toBe(databaseSearchProvider);
  });

  it('registers and resolves a custom provider', () => {
    const fakeProvider = { search: vi.fn() };
    registerSearchProvider('unit-test-provider', () => fakeProvider);
    expect(getSearchProvider('unit-test-provider')).toBe(fakeProvider);
  });

  it('throws when requesting an unknown provider', () => {
    expect(() => getSearchProvider('missing-provider')).toThrow('Search provider "missing-provider" is not registered');
  });
});
