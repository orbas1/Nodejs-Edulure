import { describe, expect, it, vi } from 'vitest';

import UserSessionModel, { __testables } from '../../src/models/UserSessionModel.js';

const { resolveInsertedId, baseQuery } = __testables;

function createBuilder() {
  return {
    whereNull: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    andWhere: vi.fn().mockReturnThis(),
    forUpdate: vi.fn().mockReturnThis(),
    first: vi.fn().mockResolvedValue({})
  };
}

describe('UserSessionModel helper utilities', () => {
  it('resolves inserted identifiers across driver responses', () => {
    expect(resolveInsertedId(42)).toBe(42);
    expect(resolveInsertedId('session-1')).toBe('session-1');
    expect(resolveInsertedId([{ id: 'session-2' }])).toBe('session-2');
    expect(resolveInsertedId([{ insertId: 99 }])).toBe(99);
    expect(resolveInsertedId([])).toBeNull();
    expect(resolveInsertedId({})).toBeNull();
  });

  it('applies deleted filters by default in base queries', () => {
    const builder = createBuilder();
    const connection = vi.fn().mockReturnValue(builder);

    const result = baseQuery(connection);

    expect(connection).toHaveBeenCalledWith('user_sessions');
    expect(builder.whereNull).toHaveBeenCalledWith('deleted_at');
    expect(result).toBe(builder);

    const noFilterBuilder = createBuilder();
    const includeDeletedConnection = vi.fn().mockReturnValue(noFilterBuilder);
    baseQuery(includeDeletedConnection, { includeDeleted: true });
    expect(noFilterBuilder.whereNull).not.toHaveBeenCalled();
  });
});

describe('UserSessionModel query behaviour', () => {
  it('optionally locks rows when fetching by id', async () => {
    const builder = createBuilder();
    builder.first.mockResolvedValue({ id: 'session-1' });
    const connection = vi.fn().mockReturnValue(builder);

    const result = await UserSessionModel.findById('session-1', connection, { forUpdate: true });

    expect(builder.select).toHaveBeenCalled();
    expect(builder.where).toHaveBeenCalledWith({ id: 'session-1' });
    expect(builder.forUpdate).toHaveBeenCalledTimes(1);
    expect(builder.first).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ id: 'session-1' });
  });

  it('returns active sessions by hash with locking support', async () => {
    const builder = createBuilder();
    builder.first.mockResolvedValue({ id: 'session-2' });
    const connection = vi.fn().mockReturnValue(builder);
    connection.fn = { now: vi.fn().mockReturnValue('now()') };

    const result = await UserSessionModel.findActiveByHash('hash', connection, { forUpdate: true });

    expect(builder.where).toHaveBeenCalledWith({ refresh_token_hash: 'hash' });
    expect(builder.whereNull).toHaveBeenCalledWith('revoked_at');
    expect(builder.andWhere).toHaveBeenCalledWith('expires_at', '>', 'now()');
    expect(builder.forUpdate).toHaveBeenCalled();
    expect(result).toEqual({ id: 'session-2' });
  });

  it('creates sessions using insert responses when available', async () => {
    const insert = vi.fn().mockResolvedValue([{ id: 'session-3' }]);
    const connection = vi.fn().mockImplementationOnce(() => ({ insert }));
    connection.fn = { now: vi.fn().mockReturnValue('now()') };
    const findById = vi.spyOn(UserSessionModel, 'findById').mockResolvedValue({ id: 'session-3' });

    const result = await UserSessionModel.create(
      { userId: 'user-1', refreshTokenHash: 'hash', expiresAt: '2024-01-01T00:00:00.000Z' },
      connection
    );

    expect(insert).toHaveBeenCalledWith(
      {
        user_id: 'user-1',
        refresh_token_hash: 'hash',
        user_agent: null,
        ip_address: null,
        expires_at: '2024-01-01T00:00:00.000Z',
        last_used_at: 'now()'
      },
      ['id']
    );
    expect(findById).toHaveBeenCalledWith('session-3', connection);
    expect(result).toEqual({ id: 'session-3' });

    findById.mockRestore();
  });

  it('falls back to fetching the latest session when no id returned', async () => {
    const insert = vi.fn().mockResolvedValue([]);
    const fallbackBuilder = {
      select: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      first: vi.fn().mockResolvedValue({ id: 'session-4' })
    };

    const connection = vi
      .fn()
      .mockImplementationOnce(() => ({ insert }))
      .mockImplementationOnce(() => fallbackBuilder);
    connection.fn = { now: vi.fn().mockReturnValue('now()') };

    const findById = vi.spyOn(UserSessionModel, 'findById').mockResolvedValue({ id: 'session-4' });

    const result = await UserSessionModel.create(
      { userId: 'user-1', refreshTokenHash: 'hash', expiresAt: '2024-02-01T00:00:00.000Z' },
      connection
    );

    expect(fallbackBuilder.select).toHaveBeenCalledWith('id');
    expect(fallbackBuilder.where).toHaveBeenCalledWith({
      user_id: 'user-1',
      refresh_token_hash: 'hash'
    });
    expect(fallbackBuilder.orderBy).toHaveBeenCalledWith('created_at', 'desc');
    expect(findById).toHaveBeenCalledWith('session-4', connection);
    expect(result).toEqual({ id: 'session-4' });

    findById.mockRestore();
  });
});
