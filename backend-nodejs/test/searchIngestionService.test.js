import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SearchIngestionService } from '../src/services/SearchIngestionService.js';
import * as metricsModule from '../src/observability/metrics.js';

const indexPrefix = process.env.MEILISEARCH_INDEX_PREFIX ?? 'edulure';

describe('SearchIngestionService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('reindexes the requested indexes and records metrics', async () => {
    const deleteAllDocuments = vi.fn().mockResolvedValue({ taskUid: 1 });
    const addDocuments = vi.fn().mockResolvedValue({ taskUid: 2 });
    const waitForTask = vi.fn().mockResolvedValue({ status: 'succeeded' });
    const index = { addDocuments };
    const client = {
      deleteAllDocuments,
      waitForTask,
      index: vi.fn(() => index)
    };
    const clusterService = {
      requestTimeoutMs: 5000,
      withAdminClient: vi.fn(async (_operation, handler) => handler(client, 'http://localhost:7700'))
    };

    const loaders = {
      communities: async function* () {
        yield [
          { id: 1, name: 'Ops Guild' },
          { id: 2, name: 'Growth Lab' }
        ];
      },
      ads: async function* () {
        yield [{ id: 5, name: 'Creator Funnel Boost' }];
      }
    };

    const recordSpy = vi.spyOn(metricsModule, 'recordSearchOperation').mockImplementation((_operation, handler) => handler());
    const ingestionSpy = vi.spyOn(metricsModule, 'recordSearchIngestionRun');

    const service = new SearchIngestionService({
      clusterService,
      loggerInstance: { info: vi.fn(), debug: vi.fn(), error: vi.fn() },
      batchSize: 50,
      concurrency: 2,
      loaders
    });

    await service.fullReindex({ indexes: ['communities', 'ads'] });

    expect(clusterService.withAdminClient).toHaveBeenCalledTimes(2);
    expect(deleteAllDocuments).toHaveBeenCalledTimes(2);
    expect(addDocuments).toHaveBeenCalledTimes(2);
    expect(waitForTask).toHaveBeenCalledTimes(4);

    expect(ingestionSpy).toHaveBeenCalledWith(
      expect.objectContaining({ index: `${indexPrefix}_communities`, documentCount: 2, status: 'success' })
    );
    expect(ingestionSpy).toHaveBeenCalledWith(
      expect.objectContaining({ index: `${indexPrefix}_ads`, documentCount: 1, status: 'success' })
    );
    expect(ingestionSpy).not.toHaveBeenCalledWith(expect.objectContaining({ status: 'error' }));

    recordSpy.mockRestore();
  });

  it('skips destructive delete when running an incremental sync', async () => {
    const deleteAllDocuments = vi.fn();
    const addDocuments = vi.fn().mockResolvedValue({ taskUid: 1 });
    const waitForTask = vi.fn().mockResolvedValue({ status: 'succeeded' });
    const client = {
      deleteAllDocuments,
      waitForTask,
      index: vi.fn(() => ({ addDocuments }))
    };
    const clusterService = {
      requestTimeoutMs: 5000,
      withAdminClient: vi.fn(async (_operation, handler) => handler(client, 'http://localhost:7700'))
    };

    const loaders = {
      tutors: async function* () {
        yield [{ id: 9, displayName: 'Kai Watanabe' }];
      }
    };

    const recordSpy = vi.spyOn(metricsModule, 'recordSearchOperation').mockImplementation((_operation, handler) => handler());
    const ingestionSpy = vi.spyOn(metricsModule, 'recordSearchIngestionRun');

    const service = new SearchIngestionService({
      clusterService,
      loggerInstance: { info: vi.fn(), debug: vi.fn(), error: vi.fn() },
      deleteBeforeReindex: true,
      loaders
    });

    await service.fullReindex({ indexes: ['tutors'], since: new Date().toISOString() });

    expect(deleteAllDocuments).not.toHaveBeenCalled();
    expect(addDocuments).toHaveBeenCalledTimes(1);

    expect(ingestionSpy).toHaveBeenCalledWith(
      expect.objectContaining({ index: `${indexPrefix}_tutors`, documentCount: 1, status: 'success' })
    );

    recordSpy.mockRestore();
  });
});
