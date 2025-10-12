import { describe, expect, it, beforeEach, vi, afterEach } from 'vitest';

import { env } from '../src/config/env.js';
import { SearchClusterService } from '../src/services/SearchClusterService.js';

vi.mock('meilisearch', () => ({
  MeiliSearch: vi.fn()
}));

describe('SearchClusterService', () => {
  let adminClient;
  let readClient;
  let logger;

  beforeEach(() => {
    vi.useFakeTimers();
    const updateSettings = vi.fn().mockResolvedValue({ taskUid: 2 });

    adminClient = {
      getIndex: vi.fn().mockRejectedValue(Object.assign(new Error('missing'), { code: 'index_not_found' })),
      createIndex: vi.fn().mockResolvedValue({ taskUid: 1 }),
      waitForTask: vi.fn().mockResolvedValue({ status: 'succeeded' }),
      index: vi.fn(() => ({ updateSettings })),
      getKeys: vi.fn().mockResolvedValue({
        results: [
          {
            key: env.search.searchApiKey,
            actions: ['search'],
            indexes: [`${env.search.indexPrefix}_communities`],
            uid: 'search-key'
          }
        ]
      }),
      health: vi.fn().mockResolvedValue({ status: 'available' }),
      createSnapshot: vi.fn().mockResolvedValue({ taskUid: 3 })
    };

    readClient = {
      health: vi.fn().mockResolvedValue({ status: 'available' })
    };

    logger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('provisions explorer indexes, audits keys, and exposes health metrics', async () => {
    const service = new SearchClusterService({
      adminNodes: [{ host: 'https://primary.local:7700', client: adminClient }],
      replicaNodes: [],
      readNodes: [{ host: 'https://reader.local:7700', client: readClient }],
      healthcheckIntervalMs: 5000,
      requestTimeoutMs: 2000,
      loggerInstance: logger
    });

    await service.start();
    service.stop();

    expect(adminClient.createIndex).toHaveBeenCalledWith({
      uid: `${env.search.indexPrefix}_communities`,
      primaryKey: 'id'
    });
    expect(adminClient.index).toHaveBeenCalledWith(`${env.search.indexPrefix}_courses`);
    expect(adminClient.waitForTask).toHaveBeenCalledWith(1, expect.any(Object));
    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({ index: `${env.search.indexPrefix}_communities`, host: 'https://primary.local:7700' }),
      'Meilisearch index synchronised'
    );
    expect(adminClient.getKeys).toHaveBeenCalled();
    expect(readClient.health).toHaveBeenCalled();
  });

  it('creates snapshots for backups when requested', async () => {
    const service = new SearchClusterService({
      adminNodes: [{ host: 'https://primary.local:7700', client: adminClient }],
      replicaNodes: [],
      readNodes: [{ host: 'https://reader.local:7700', client: readClient }],
      healthcheckIntervalMs: 0,
      requestTimeoutMs: 2000,
      loggerInstance: logger
    });

    await service.bootstrap();
    await service.createSnapshot();

    expect(adminClient.createSnapshot).toHaveBeenCalled();
    expect(adminClient.waitForTask).toHaveBeenCalledWith(3, expect.any(Object));
  });
});
