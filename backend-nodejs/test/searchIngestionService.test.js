import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SearchIngestionService } from '../src/services/SearchIngestionService.js';
import * as metricsModule from '../src/observability/metrics.js';

function createLogger() {
  const logger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  };
  logger.child = vi.fn().mockReturnValue(logger);
  return logger;
}

describe('SearchIngestionService', () => {
  let documentModel;
  let logger;

  beforeEach(() => {
    vi.restoreAllMocks();
    documentModel = {
      deleteByEntityTypes: vi.fn().mockResolvedValue(0),
      upsertMany: vi.fn().mockResolvedValue(0)
    };
    logger = createLogger();
  });

  it('reindexes all supported entities and records metrics', async () => {
    const loaders = {
      communities: async function* () {
        yield [
          { entityType: 'communities', entityId: '1', title: 'Ops Guild', searchTerms: 'ops guild' },
          { entityType: 'communities', entityId: '2', title: 'Growth Lab', searchTerms: 'growth lab' }
        ];
      },
      ads: async function* () {
        yield [{ entityType: 'ads', entityId: '9', title: 'Creator Booster', searchTerms: 'creator booster' }];
      }
    };

    const recordSpy = vi.spyOn(metricsModule, 'recordSearchIngestionRun').mockImplementation(() => {});

    const service = new SearchIngestionService({
      documentModel,
      loaders,
      loggerInstance: logger,
      batchSize: 25
    });

    await service.fullReindex({ indexes: ['communities', 'ads'] });

    expect(documentModel.deleteByEntityTypes).toHaveBeenCalledWith(['communities'], expect.anything());
    expect(documentModel.deleteByEntityTypes).toHaveBeenCalledWith(['ads'], expect.anything());
    expect(documentModel.upsertMany).toHaveBeenCalledTimes(2);
    expect(recordSpy).toHaveBeenCalledWith(
      expect.objectContaining({ index: 'communities', status: 'success', documentCount: 2 })
    );
    expect(recordSpy).toHaveBeenCalledWith(
      expect.objectContaining({ index: 'ads', status: 'success', documentCount: 1 })
    );
  });

  it('skips destructive delete when performing incremental updates', async () => {
    const loaders = {
      courses: async function* () {
        yield [{ entityType: 'courses', entityId: '101', title: 'Automation Playbook', searchTerms: 'automation playbook' }];
      }
    };

    const service = new SearchIngestionService({
      documentModel,
      loaders,
      loggerInstance: logger
    });

    await service.fullReindex({ since: new Date().toISOString(), indexes: ['courses'] });

    expect(documentModel.deleteByEntityTypes).not.toHaveBeenCalled();
    expect(documentModel.upsertMany).toHaveBeenCalledWith(
      [
        expect.objectContaining({ entityType: 'courses', entityId: '101', title: 'Automation Playbook' })
      ],
      expect.anything()
    );
  });
});
