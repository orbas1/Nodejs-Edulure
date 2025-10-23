import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SearchIngestionService } from '../../src/services/SearchIngestionService.js';
import * as metrics from '../../src/observability/metrics.js';

function createLogger() {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  };
}

describe('SearchIngestionService', () => {
  let recordSpy;

  beforeEach(() => {
    vi.restoreAllMocks();
    recordSpy = vi.spyOn(metrics, 'recordSearchIngestionRun').mockImplementation(() => {});
  });

  it('reindexes requested entities and records success metrics', async () => {
    const repository = {
      deleteByEntity: vi.fn().mockResolvedValue(),
      upsertDocuments: vi.fn().mockImplementation(async (documents) => documents.length)
    };

    const loaders = {
      communities: async function* () {
        yield [
          {
            entityType: 'communities',
            entityId: 'community-1',
            title: 'Ops Guild',
            searchVector: 'ops guild operations community'
          }
        ];
      },
      ads: async function* () {
        yield [
          {
            entityType: 'ads',
            entityId: 'ad-1',
            title: 'Creator Growth Campaign',
            searchVector: 'creator growth'
          },
          {
            entityType: 'ads',
            entityId: 'ad-2',
            title: 'Community Boost',
            searchVector: 'community boost'
          }
        ];
      }
    };

    const service = new SearchIngestionService({
      repository,
      loggerInstance: createLogger(),
      loaders,
      batchSize: 25,
      concurrency: 1,
      deleteBeforeReindex: true
    });

    await service.fullReindex({ indexes: ['communities', 'ads'] });

    expect(repository.deleteByEntity).toHaveBeenCalledWith('communities');
    expect(repository.deleteByEntity).toHaveBeenCalledWith('ads');
    expect(repository.upsertDocuments).toHaveBeenCalledTimes(2);

    expect(recordSpy).toHaveBeenCalledWith(
      expect.objectContaining({ index: 'communities', documentCount: 1, status: 'success' })
    );
    expect(recordSpy).toHaveBeenCalledWith(
      expect.objectContaining({ index: 'ads', documentCount: 2, status: 'success' })
    );
  });

  it('skips destructive delete when running an incremental sync', async () => {
    const repository = {
      deleteByEntity: vi.fn().mockResolvedValue(),
      upsertDocuments: vi.fn().mockImplementation(async (documents) => documents.length)
    };

    const loaders = {
      tutors: async function* () {
        yield [
          {
            entityType: 'tutors',
            entityId: 'tutor-9',
            title: 'Kai Watanabe',
            searchVector: 'kai watanabe tutor'
          }
        ];
      }
    };

    const service = new SearchIngestionService({
      repository,
      loggerInstance: createLogger(),
      loaders,
      deleteBeforeReindex: true
    });

    await service.fullReindex({ indexes: ['tutors'], since: new Date().toISOString() });

    expect(repository.deleteByEntity).not.toHaveBeenCalled();
    expect(repository.upsertDocuments).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ entityType: 'tutors', entityId: 'tutor-9' })
      ])
    );
    expect(recordSpy).toHaveBeenCalledWith(
      expect.objectContaining({ index: 'tutors', documentCount: 1, status: 'success' })
    );
  });

  it('records failure metrics when ingestion throws', async () => {
    const repository = {
      deleteByEntity: vi.fn().mockResolvedValue(),
      upsertDocuments: vi.fn().mockImplementation(async () => {
        throw Object.assign(new Error('write failed'), { code: 'ER_WRITE' });
      })
    };

    const loaders = {
      courses: async function* () {
        yield [
          {
            entityType: 'courses',
            entityId: 'course-1',
            title: 'Design Systems',
            searchVector: 'design systems course'
          }
        ];
      }
    };

    const service = new SearchIngestionService({
      repository,
      loggerInstance: createLogger(),
      loaders,
      deleteBeforeReindex: false
    });

    await expect(service.fullReindex({ indexes: ['courses'] })).rejects.toThrow('write failed');

    expect(recordSpy).toHaveBeenCalledWith(
      expect.objectContaining({ index: 'courses', status: 'error' })
    );
  });
});
