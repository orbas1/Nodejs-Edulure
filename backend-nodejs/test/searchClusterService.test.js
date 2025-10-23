import { describe, expect, it, vi, beforeEach } from 'vitest';

import { SearchClusterService } from '../src/services/SearchClusterService.js';

function createLogger() {
  const logger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  };
  logger.child = vi.fn().mockReturnValue(logger);
  return logger;
}

describe('SearchClusterService', () => {
  let documentModel;
  let ingestionService;
  let logger;

  beforeEach(() => {
    documentModel = {
      countByEntity: vi.fn().mockResolvedValue({ courses: 3 }),
      exportSnapshot: vi.fn().mockResolvedValue([
        {
          entityType: 'courses',
          entityId: '1',
          title: 'Ops Guild Foundations',
          updatedAt: new Date('2024-03-01T00:00:00.000Z'),
          popularityScore: 42
        }
      ])
    };

    ingestionService = {
      fullReindex: vi.fn().mockResolvedValue(undefined),
      getSupportedEntities: vi.fn().mockReturnValue(['courses', 'communities'])
    };

    logger = createLogger();
  });

  it('bootstraps explorer documents and reports readiness', async () => {
    const service = new SearchClusterService({ documentModel, ingestionService, loggerInstance: logger });
    const status = await service.start();

    expect(status).toEqual({ status: 'ready', message: 'Search document registry initialised' });
    expect(ingestionService.fullReindex).toHaveBeenCalledTimes(1);

    const counts = await service.checkClusterHealth();
    expect(documentModel.countByEntity).toHaveBeenCalledTimes(1);
    expect(counts).toEqual({ courses: 3 });
  });

  it('creates snapshots using the document model', async () => {
    const service = new SearchClusterService({ documentModel, ingestionService, loggerInstance: logger });
    const snapshot = await service.createSnapshot();

    expect(documentModel.exportSnapshot).toHaveBeenCalledTimes(1);
    expect(snapshot).toMatchObject({ status: 'succeeded', documents: expect.any(Array) });
    expect(snapshot.documents).toHaveLength(1);
  });

  it('exposes supported entities through the ingestion service', () => {
    const service = new SearchClusterService({ documentModel, ingestionService, loggerInstance: logger });
    expect(service.getSupportedEntities()).toEqual(['courses', 'communities']);
  });
});
