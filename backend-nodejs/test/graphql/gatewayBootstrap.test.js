import { mkdtempSync, promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { warmGraphQLGateway } from '../../src/graphql/gatewayBootstrap.js';
import {
  InMemoryPersistedQueryStore,
  computeSha256
} from '../../src/graphql/persistedQueryStore.js';

describe('warmGraphQLGateway', () => {
  let tempDir;
  const logger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  };

  beforeEach(() => {
    tempDir = mkdtempSync(path.join(os.tmpdir(), 'graphql-manifest-'));
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
    logger.info.mockClear();
    logger.warn.mockClear();
    logger.error.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('hydrates persisted queries from a JSON manifest and skips refresh without interval', async () => {
    const manifestPath = path.join(tempDir, 'manifest.json');
    await fs.writeFile(
      manifestPath,
      JSON.stringify([
        { id: 'FeedOverview', query: 'query FeedOverview { feed { id } }' },
        'query FeedAudience { feed { id title } }'
      ])
    );

    const store = new InMemoryPersistedQueryStore({ ttlMs: 60_000 });
    const result = await warmGraphQLGateway({
      manifestPath,
      refreshIntervalMs: 0,
      warmIntrospection: false,
      store,
      loggerInstance: logger
    });

    const firstHash = computeSha256('query FeedOverview { feed { id } }');
    const secondHash = computeSha256('query FeedAudience { feed { id title } }');

    expect(store.get(firstHash)).toBe('query FeedOverview { feed { id } }');
    expect(store.get(secondHash)).toBe('query FeedAudience { feed { id title } }');
    expect(result.status).toBe('ready');
    expect(logger.info).toHaveBeenCalledWith(
      { manifestPath, loaded: 2 },
      'GraphQL persisted query cache warmed'
    );

    await result.stop();
  });

  it('parses GraphQL documents with fragments into persisted queries', async () => {
    const manifestPath = path.join(tempDir, 'manifest.graphql');
    await fs.writeFile(
      manifestPath,
      `query FeedOne {\n  feed(context: GLOBAL) {\n    id\n  }\n}\n\nfragment FeedSummary on FeedItem {\n  title\n  kind\n}\n\nquery FeedWithFragment {\n  feed(context: GLOBAL) {\n    id\n    ...FeedSummary\n  }\n}`
    );

    const store = new InMemoryPersistedQueryStore({ ttlMs: 60_000 });
    const result = await warmGraphQLGateway({
      manifestPath,
      refreshIntervalMs: 0,
      warmIntrospection: false,
      store,
      loggerInstance: logger
    });

    const firstHash = computeSha256('query FeedOne {\n  feed(context: GLOBAL) {\n    id\n  }\n}');
    const secondHash = computeSha256(
      'query FeedWithFragment {\n  feed(context: GLOBAL) {\n    id\n    ...FeedSummary\n  }\n}\n\nfragment FeedSummary on FeedItem {\n  title\n  kind\n}'
    );

    expect(store.get(firstHash)).toBe(
      'query FeedOne {\n  feed(context: GLOBAL) {\n    id\n  }\n}'
    );
    expect(store.get(secondHash)).toBe(
      'query FeedWithFragment {\n  feed(context: GLOBAL) {\n    id\n    ...FeedSummary\n  }\n}\n\nfragment FeedSummary on FeedItem {\n  title\n  kind\n}'
    );
    expect(result.status).toBe('ready');
    await result.stop();
  });
});

