import { beforeEach, describe, expect, it, vi } from 'vitest';

const envMock = {
  search: {
    indexPrefix: 'env-prefix',
    healthcheckIntervalMs: 45_000,
    allowedIps: ['127.0.0.1'],
    ingestion: {
      batchSize: 320,
      concurrency: 3
    }
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
  it('exposes the default configuration derived from env', () => {
    const { searchConfiguration } = module;
    expect(searchConfiguration).toEqual({
      provider: 'database',
      ingestion: {
        batchSize: 320,
        concurrency: 3
      },
      metadata: {
        indexPrefix: 'env-prefix',
        healthcheckIntervalMs: 45_000,
        allowedIps: ['127.0.0.1']
      }
    });
  });

  it('applies safe defaults when overrides are missing', () => {
    const { createSearchConfiguration } = module;
    const config = createSearchConfiguration({ indexPrefix: 'custom' });
    expect(config).toEqual({
      provider: 'database',
      ingestion: {
        batchSize: 200,
        concurrency: 1
      },
      metadata: {
        indexPrefix: 'custom',
        healthcheckIntervalMs: 30_000,
        allowedIps: []
      }
    });
  });
});
