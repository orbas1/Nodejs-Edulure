import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SearchClusterService } from '../src/services/SearchClusterService.js';
import SearchDocumentModel from '../src/models/SearchDocumentModel.js';

describe('SearchClusterService', () => {
  let logger;
  let dbFn;
  let countSpy;

  beforeEach(() => {
    vi.useFakeTimers();
    logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    countSpy = vi.fn().mockResolvedValue([{ total: 0 }]);
    dbFn = vi.fn(() => ({ count: countSpy }));
    dbFn.schema = { hasTable: vi.fn().mockResolvedValue(true) };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('initialises the relational search provider when started', async () => {
    const service = new SearchClusterService({ dbClient: dbFn, loggerInstance: logger });

    await service.start();
    expect(dbFn.schema.hasTable).toHaveBeenCalledWith(SearchDocumentModel.tableName);
    expect(logger.info).toHaveBeenCalledWith('Edulure Search provider initialised using relational backend');
    expect(service.searchClient).not.toBeNull();

    await service.stop();
    expect(logger.info).toHaveBeenCalledWith('Edulure Search provider stopped');
  });

  it('reports cluster health and snapshot information', async () => {
    countSpy.mockResolvedValueOnce([{ total: 4 }]);
    const service = new SearchClusterService({ dbClient: dbFn, loggerInstance: logger });

    await service.bootstrap();
    const health = await service.checkClusterHealth();
    expect(dbFn).toHaveBeenCalledWith(SearchDocumentModel.tableName);
    expect(health).toEqual({ status: 'healthy', documents: 4 });

    countSpy.mockResolvedValueOnce([{ total: 7 }]);
    const snapshot = await service.createSnapshot();
    expect(dbFn).toHaveBeenCalledWith(SearchDocumentModel.tableName);
    expect(snapshot).toEqual(expect.objectContaining({ status: 'noop', documents: 7 }));
  });
});
