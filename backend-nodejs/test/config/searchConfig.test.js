import { beforeEach, describe, expect, it, vi } from 'vitest';

const envMock = {
  search: {
    tableName: 'search_documents',
    healthcheckIntervalMs: 15000,
    indexPrefix: 'edulure'
  }
};

vi.mock('../../src/config/env.js', () => ({
  env: envMock
}));

let module;

beforeEach(async () => {
  module = await import('../../src/config/search.js');
});

describe('search configuration', () => {
  it('provides defaults when values are missing', () => {
    const { createSearchConfiguration } = module;
    const config = createSearchConfiguration({});
    expect(config).toEqual({
      tableName: 'search_documents',
      heartbeatIntervalMs: envMock.search.healthcheckIntervalMs,
      indexPrefix: envMock.search.indexPrefix
    });
  });

  it('honours overrides supplied at runtime', () => {
    const { createSearchConfiguration } = module;
    const config = createSearchConfiguration({
      tableName: 'custom_docs',
      healthcheckIntervalMs: 8000,
      indexPrefix: 'custom'
    });
    expect(config).toEqual({
      tableName: 'custom_docs',
      heartbeatIntervalMs: 8000,
      indexPrefix: 'custom'
    });
  });

  it('exports the environment derived configuration', () => {
    const { searchConfiguration } = module;
    expect(searchConfiguration).toEqual({
      tableName: 'search_documents',
      heartbeatIntervalMs: envMock.search.healthcheckIntervalMs,
      indexPrefix: envMock.search.indexPrefix
    });
  });
});
