import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SavedSearchService } from '../src/services/SavedSearchService.js';

const savedSearchModelMock = {
  listByUser: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  findById: vi.fn()
};

function createKnexStub() {
  const queue = [];
  const builderFactory = () => {
    if (!queue.length) {
      throw new Error('No query builder queued');
    }
    return queue.shift();
  };

  const knex = vi.fn(builderFactory);
  knex.transaction = vi.fn(async (callback) => {
    const trx = vi.fn(builderFactory);
    return callback(trx);
  });
  knex.fn = { now: vi.fn(() => new Date('2025-02-25T12:00:00.000Z')) };
  knex.__queue = queue;
  return knex;
}

function createQueryBuilder({ firstResult = null, updateResult = 1 } = {}) {
  return {
    where: vi.fn().mockReturnThis(),
    andWhereNot: vi.fn().mockReturnThis(),
    first: vi.fn().mockResolvedValue(firstResult),
    update: vi.fn().mockResolvedValue(updateResult)
  };
}

describe('SavedSearchService', () => {
  let service;
  let knex;
  const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-02-25T12:00:00.000Z'));
    vi.clearAllMocks();
    knex = createKnexStub();
    service = new SavedSearchService({
      savedSearchModel: savedSearchModelMock,
      dbClient: knex,
      loggerInstance: logger
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('creates a saved search when no duplicate exists', async () => {
    knex.__queue.push(createQueryBuilder({ firstResult: null }));
    const created = { id: 9, name: 'Weekly updates' };
    savedSearchModelMock.create.mockResolvedValueOnce(created);

    const result = await service.create(1, { name: 'Weekly updates', filters: { tags: ['news'] } });

    expect(savedSearchModelMock.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 1, name: 'Weekly updates' }),
      expect.any(Function)
    );
    expect(result).toBe(created);
    expect(logger.info).toHaveBeenCalledWith({ savedSearchId: 9, userId: 1 }, 'Saved search created');
  });

  it('prevents duplicate saved search names during update', async () => {
    const builder = createQueryBuilder({ firstResult: { id: 4 } });
    knex.__queue.push(builder);

    await expect(service.update(1, 3, { name: 'Existing search' })).rejects.toMatchObject({ status: 409 });
    expect(builder.andWhereNot).toHaveBeenCalledWith('id', 3);
  });

  it('updates a saved search when found', async () => {
    knex.__queue.push(createQueryBuilder({ firstResult: null }));
    const updated = { id: 3, name: 'Refined search' };
    savedSearchModelMock.update.mockResolvedValueOnce(updated);

    const result = await service.update(2, 3, { name: 'Refined search' });

    expect(savedSearchModelMock.update).toHaveBeenCalledWith(3, expect.objectContaining({ userId: 2 }), expect.any(Function));
    expect(result).toBe(updated);
    expect(logger.info).toHaveBeenCalledWith({ savedSearchId: 3, userId: 2 }, 'Saved search updated');
  });

  it('deletes a saved search and logs the action', async () => {
    savedSearchModelMock.delete.mockResolvedValueOnce(true);
    const result = await service.delete(5, 8);
    expect(savedSearchModelMock.delete).toHaveBeenCalledWith(8, 5, expect.any(Function));
    expect(result).toBe(true);
    expect(logger.info).toHaveBeenCalledWith({ savedSearchId: 8, userId: 5 }, 'Saved search deleted');
  });

  it('returns usage summary with most recent searches', async () => {
    savedSearchModelMock.listByUser.mockResolvedValueOnce([
      { id: 1, lastUsedAt: '2025-02-24T08:00:00.000Z' },
      { id: 2, lastUsedAt: '2025-02-24T07:00:00.000Z' },
      { id: 3, lastUsedAt: null }
    ]);

    const summary = await service.getUsageSummary(4);

    expect(summary).toEqual({
      total: 3,
      lastUsedAt: '2025-02-24T08:00:00.000Z',
      recent: [
        { id: 1, lastUsedAt: '2025-02-24T08:00:00.000Z' },
        { id: 2, lastUsedAt: '2025-02-24T07:00:00.000Z' }
      ],
      generatedAt: '2025-02-25T12:00:00.000Z'
    });
  });

  it('touches usage timestamp via direct knex update', async () => {
    const builder = {
      where: vi.fn().mockReturnThis(),
      update: vi.fn().mockResolvedValue(1)
    };
    knex.__queue.push(builder);

    await service.touchUsage(9, 11);

    expect(knex).toHaveBeenCalledWith('saved_searches');
    expect(builder.where).toHaveBeenCalledWith({ id: 11, user_id: 9 });
    expect(builder.update).toHaveBeenCalledWith({ last_used_at: expect.any(Date) });
  });
});
