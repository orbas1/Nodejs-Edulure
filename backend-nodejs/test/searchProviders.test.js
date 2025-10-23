import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/services/search/providers/postgresSearchProvider.js', () => ({
  default: {
    name: 'postgres',
    getSupportedEntities: () => ['courses'],
    search: vi.fn()
  }
}));

describe('searchProviders', () => {
  afterEach(() => {
    // reset dynamic registrations between tests by clearing the module cache
    vi.resetModules();
  });

  it('returns postgres provider by default', async () => {
    const module = await import('../src/services/searchProviders.js');
    const { getActiveSearchProvider, listSearchProviders } = module;
    const provider = getActiveSearchProvider();
    expect(provider.name).toBe('postgres');
    expect(listSearchProviders()).toContain('postgres');
  });

  it('registers and resolves custom provider', async () => {
    const module = await import('../src/services/searchProviders.js');
    const {
      listSearchProviders,
      registerSearchProvider,
      resolveSearchProvider,
      setActiveSearchProvider,
      getActiveSearchProvider
    } = module;
    const customProvider = {
      name: 'custom',
      getSupportedEntities: () => ['courses', 'communities'],
      search: vi.fn()
    };

    registerSearchProvider(customProvider);
    expect(listSearchProviders()).toContain('custom');

    const resolved = resolveSearchProvider({ providerName: 'custom' });
    expect(resolved).toBeDefined();
    expect(resolved.name).toBe('custom');
    setActiveSearchProvider('custom');
    expect(getActiveSearchProvider().name).toBe('custom');
  });
});
