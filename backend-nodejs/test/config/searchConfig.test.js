import { describe, expect, it } from 'vitest';

import { createSearchConfiguration } from '../../src/config/search.js';

describe('search configuration', () => {
  it('returns the provided Postgres search settings', () => {
    const config = createSearchConfiguration({
      schema: 'analytics_search',
      dictionary: 'english',
      maxPerPage: 40,
      facetMaxBuckets: 12,
      ingestion: { batchSize: 250, concurrency: 3, deleteBeforeReindex: false }
    });

    expect(config).toEqual({
      schema: 'analytics_search',
      dictionary: 'english',
      maxPerPage: 40,
      facetMaxBuckets: 12,
      ingestion: { batchSize: 250, concurrency: 3, deleteBeforeReindex: false }
    });
  });
});
