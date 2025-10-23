import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SearchIngestionService } from '../src/services/SearchIngestionService.js';
import * as metricsModule from '../src/observability/metrics.js';

describe('SearchIngestionService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('reindexes the requested indexes and records metrics', async () => {
    const clusterService = { start: vi.fn().mockResolvedValue() };
    const loaders = {
      communities: async function* () {
        yield [
          { id: 1, name: 'Ops Guild', description: 'Ops community', memberCount: 10, trendScore: 5 },
          { id: 2, name: 'Growth Lab', description: 'Growth community', memberCount: 15, trendScore: 7 }
        ];
      },
      ads: async function* () {
        yield [{ id: 5, name: 'Creator Funnel Boost', performanceScore: 80, ctr: 2.3, spend: { total: 1500 } }];
      }
    };

    const ingestionSpy = vi.spyOn(metricsModule, 'recordSearchIngestionRun');
    const service = new SearchIngestionService({
      clusterService,
      loggerInstance: { info: vi.fn(), debug: vi.fn(), error: vi.fn() },
      batchSize: 50,
      deleteBeforeReindex: false,
      loaders
    });

    const upsertSpy = vi.spyOn(service, 'upsertDocuments').mockResolvedValue();

    await service.fullReindex({ indexes: ['communities', 'ads'] });

    expect(clusterService.start).toHaveBeenCalled();
    expect(upsertSpy).toHaveBeenCalledTimes(2);
    expect(upsertSpy.mock.calls[0][0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ entityType: 'communities', documentId: '1', title: 'Ops Guild' }),
        expect.objectContaining({ entityType: 'communities', documentId: '2', title: 'Growth Lab' })
      ])
    );
    expect(upsertSpy.mock.calls[1][0]).toEqual(
      expect.arrayContaining([expect.objectContaining({ entityType: 'ads', documentId: '5', title: 'Creator Funnel Boost' })])
    );

    expect(ingestionSpy).toHaveBeenCalledWith(
      expect.objectContaining({ index: 'communities', documentCount: 2, status: 'success' })
    );
    expect(ingestionSpy).toHaveBeenCalledWith(
      expect.objectContaining({ index: 'ads', documentCount: 1, status: 'success' })
    );
    expect(ingestionSpy).not.toHaveBeenCalledWith(expect.objectContaining({ status: 'error' }));
  });

  it('skips destructive delete when running an incremental sync', async () => {
    const delSpy = vi.fn();
    const dbFn = vi.fn(() => ({ where: vi.fn().mockReturnThis(), del: delSpy }));
    dbFn.transaction = vi.fn();
    dbFn.schema = { hasTable: vi.fn().mockResolvedValue(true) };

    const clusterService = { start: vi.fn().mockResolvedValue() };
    const loaders = {
      tutors: async function* () {
        yield [{ id: 9, displayName: 'Kai Watanabe', hourlyRate: { amount: 120 } }];
      }
    };

    const ingestionSpy = vi.spyOn(metricsModule, 'recordSearchIngestionRun');
    const service = new SearchIngestionService({
      clusterService,
      loggerInstance: { info: vi.fn(), debug: vi.fn(), error: vi.fn() },
      deleteBeforeReindex: true,
      loaders,
      dbClient: dbFn
    });

    vi.spyOn(service, 'upsertDocuments').mockResolvedValue();

    await service.fullReindex({ indexes: ['tutors'], since: new Date().toISOString() });

    expect(delSpy).not.toHaveBeenCalled();
    expect(ingestionSpy).toHaveBeenCalledWith(
      expect.objectContaining({ index: 'tutors', documentCount: 1, status: 'success' })
    );
  });
});
