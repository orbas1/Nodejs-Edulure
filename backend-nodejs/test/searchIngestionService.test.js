import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SearchIngestionService } from '../src/services/SearchIngestionService.js';
import * as metricsModule from '../src/observability/metrics.js';

describe('SearchIngestionService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('refreshes requested entities and records ingestion metrics', async () => {
    const refreshEntity = vi.fn().mockResolvedValue(42);
    const clearEntityDocuments = vi.fn().mockResolvedValue();
    const clusterService = {
      supportedEntities: ['communities', 'courses', 'ads'],
      refreshEntity,
      clearEntityDocuments
    };

    const recordSpy = vi
      .spyOn(metricsModule, 'recordSearchIngestionRun')
      .mockImplementation(() => undefined);

    const service = new SearchIngestionService({
      clusterService,
      loggerInstance: { info: vi.fn(), debug: vi.fn(), error: vi.fn() }
    });

    await service.fullReindex({ indexes: ['communities', 'ads'], reason: 'script' });

    expect(clearEntityDocuments).toHaveBeenCalledTimes(2);
    expect(clearEntityDocuments).toHaveBeenCalledWith('communities');
    expect(clearEntityDocuments).toHaveBeenCalledWith('ads');
    expect(refreshEntity).toHaveBeenCalledTimes(2);
    expect(refreshEntity).toHaveBeenCalledWith('communities', { since: null });
    expect(refreshEntity).toHaveBeenCalledWith('ads', { since: null });
    expect(recordSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        index: 'communities',
        status: 'success',
        documentCount: 42,
        metadata: { reason: 'script', since: null }
      })
    );
    expect(recordSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        index: 'ads',
        status: 'success',
        documentCount: 42,
        metadata: { reason: 'script', since: null }
      })
    );
  });

  it('records error metrics when refresh fails', async () => {
    const error = new Error('boom');
    const clusterService = {
      supportedEntities: ['tutors'],
      refreshEntity: vi.fn().mockRejectedValue(error),
      clearEntityDocuments: vi.fn().mockResolvedValue()
    };

    const recordSpy = vi
      .spyOn(metricsModule, 'recordSearchIngestionRun')
      .mockImplementation(() => undefined);

    const service = new SearchIngestionService({
      clusterService,
      loggerInstance: { info: vi.fn(), debug: vi.fn(), error: vi.fn() }
    });

    await expect(service.reindexIndex('tutors')).rejects.toThrow('boom');
    expect(clusterService.clearEntityDocuments).toHaveBeenCalledWith('tutors');
    expect(recordSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        index: 'tutors',
        status: 'error',
        metadata: { reason: 'manual', since: null }
      })
    );
  });
});
