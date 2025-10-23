import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SearchDocumentService } from '../src/services/SearchClusterService.js';

function createQuery(rows) {
  const query = {
    rows,
    orderBy: vi.fn(() => query),
    where: vi.fn(() => query),
    then: (onFulfilled, onRejected) => Promise.resolve(rows).then(onFulfilled, onRejected),
    catch: (onRejected) => Promise.resolve(rows).catch(onRejected),
    finally: (onFinally) => Promise.resolve().finally(onFinally)
  };
  return query;
}

function createDbMock(rows = [{ id: 1 }, { id: 2 }]) {
  const raw = vi.fn();
  const query = createQuery(rows);

  const select = vi.fn(() => ({
    from: vi.fn(() => query)
  }));

  const documentsWhere = vi.fn(() => ({
    del: vi.fn().mockResolvedValue(undefined)
  }));

  const withSchema = vi.fn(() => ({
    from: vi.fn(() => ({
      where: documentsWhere,
      del: vi.fn().mockResolvedValue(undefined),
      count: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([{ total: 0 }]) })
    }))
  }));

  const transaction = vi.fn(async (handler) => {
    await handler({
      select,
      raw
    });
  });

  return { raw, withSchema, transaction, query, documentsWhere };
}

describe('SearchDocumentService', () => {
  let db;
  let service;

  beforeEach(() => {
    db = createDbMock();
    service = new SearchDocumentService({
      dbClient: db,
      loggerInstance: { child: () => ({ info: vi.fn(), error: vi.fn(), debug: vi.fn() }) }
    });
  });

  it('refreshes the entire search corpus when start succeeds', async () => {
    db.raw.mockResolvedValueOnce([{ exists: true }]);
    await service.start();
    expect(db.withSchema).toHaveBeenCalledWith('search');
    expect(db.raw).toHaveBeenCalledWith('SELECT search.refresh_all_documents()');
  });

  it('refreshes a single entity by id', async () => {
    db.raw.mockResolvedValue();
    const processed = await service.refreshEntity('courses', { id: 42 });
    expect(db.raw).toHaveBeenCalledWith('SELECT search.refresh_document(?, ?)', ['courses', 42]);
    expect(processed).toBe(1);
  });

  it('throws for unsupported entities', async () => {
    await expect(service.refreshEntity('unknown')).rejects.toThrow('Unsupported search entity');
  });

  it('applies since filters and batch processing when refreshing entities', async () => {
    const since = new Date('2024-11-01T00:00:00Z');
    db.query.rows = [{ id: 3 }, { id: 4 }, { id: 5 }];
    const processed = await service.refreshEntity('courses', { since });
    expect(db.query.orderBy).toHaveBeenCalledWith('id');
    expect(db.query.where).toHaveBeenCalledWith('updated_at', '>=', since);
    expect(processed).toBe(3);
  });

  it('clears entity documents when requested', async () => {
    await service.clearEntityDocuments('courses');
    expect(db.withSchema).toHaveBeenCalledWith('search');
    expect(db.documentsWhere).toHaveBeenCalledWith('entity_type', 'courses');
  });
});
