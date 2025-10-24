import { beforeEach, describe, expect, it, vi } from 'vitest';

import BillingPortalSessionModel from '../src/models/BillingPortalSessionModel.js';

const TABLE = 'billing_portal_sessions';

function createKnexMock(initialRows = []) {
  let currentNow = new Date('2025-03-26T12:00:00.000Z');
  let sequence = 1;
  const state = {
    rows: initialRows.map((row) => ({ ...row })),
    get now() {
      return new Date(currentNow);
    },
    advance(seconds) {
      currentNow = new Date(currentNow.getTime() + seconds * 1000);
    }
  };

  const applyFilters = (rows, filters) =>
    filters.reduce((acc, filter) => acc.filter(filter), rows.slice());

  function buildFilter(arg1, arg2, arg3) {
    if (typeof arg1 === 'object' && arg1 !== null) {
      const conditions = Object.entries(arg1);
      return (row) => conditions.every(([key, value]) => row[key] === value);
    }

    if (typeof arg3 !== 'undefined') {
      const [column, operator, value] = [arg1, arg2, arg3];
      return (row) => {
        const compareValue = row[column];
        switch (operator) {
          case '<':
            return compareValue < value;
          case '<=':
            return compareValue <= value;
          case '>':
            return compareValue > value;
          case '>=':
            return compareValue >= value;
          case '!=':
          case '<>':
            return compareValue !== value;
          default:
            return compareValue === value;
        }
      };
    }

    if (typeof arg1 === 'string') {
      const column = arg1;
      const value = arg2;
      return (row) => row[column] === value;
    }

    throw new Error('Unsupported where clause');
  }

  const makeQueryBuilder = () => {
    const context = {
      filters: [],
      orderings: [],
      selectColumns: null,
      limit: null
    };

    const builder = {
      select(columns = '*') {
        context.selectColumns = columns;
        return builder;
      },
      where(arg1, arg2, arg3) {
        context.filters.push(buildFilter(arg1, arg2, arg3));
        return builder;
      },
      andWhere(arg1, arg2, arg3) {
        return builder.where(arg1, arg2, arg3);
      },
      orderBy(column, direction = 'asc') {
        context.orderings.push({ column, direction });
        return builder;
      },
      limit(value) {
        context.limit = value;
        return builder;
      },
      async first() {
        const rows = await builder.selectRows();
        return rows[0] ?? null;
      },
      async update(payload) {
        const rows = applyFilters(state.rows, context.filters);
        let updated = 0;
        rows.forEach((row) => {
          Object.assign(row, payload);
          if (!('updated_at' in payload)) {
            row.updated_at = state.now;
          }
          updated += 1;
        });
        return updated;
      },
      async insert(payload) {
        const row = {
          id: payload.id ?? `session-${sequence++}`,
          created_at: payload.created_at ?? state.now,
          updated_at: payload.updated_at ?? state.now,
          ...payload
        };
        state.rows.push(row);
        return [row.id];
      },
      async del() {
        const rows = applyFilters(state.rows, context.filters);
        const ids = new Set(rows.map((row) => row.id));
        state.rows = state.rows.filter((row) => !ids.has(row.id));
        return rows.length;
      },
      async selectRows() {
        let rows = applyFilters(state.rows, context.filters);
        if (context.orderings.length) {
          rows = rows.sort((a, b) => {
            for (const { column, direction } of context.orderings) {
              const dir = direction === 'desc' ? -1 : 1;
              if (a[column] < b[column]) return -1 * dir;
              if (a[column] > b[column]) return 1 * dir;
            }
            return 0;
          });
        }
        if (context.limit !== null && context.limit !== undefined) {
          rows = rows.slice(0, context.limit);
        }
        if (context.selectColumns && context.selectColumns !== '*') {
          return rows.map((row) => {
            const projection = {};
            context.selectColumns.forEach((column) => {
              projection[column] = row[column];
            });
            return projection;
          });
        }
        return rows.map((row) => ({ ...row }));
      }
    };

    return builder;
  };

  const connection = (table) => {
    if (table !== TABLE) {
      throw new Error(`Unexpected table ${table}`);
    }
    return makeQueryBuilder();
  };

  connection.fn = {
    now: vi.fn(() => state.now)
  };

  connection.isTransaction = false;

  connection.transaction = async (callback) => {
    const trx = (table) => {
      if (table !== TABLE) {
        throw new Error(`Unexpected table ${table}`);
      }
      return makeQueryBuilder();
    };
    trx.fn = connection.fn;
    trx.isTransaction = true;
    trx.transaction = connection.transaction;
    return callback(trx);
  };

  connection.__state = state;
  connection.__advance = state.advance.bind(state);

  return connection;
}

function createSeededRow({
  id = 'session-seeded',
  userId = 77,
  tokenHash = 'hash-seeded',
  status = 'active',
  expiresAt = new Date('2025-03-26T11:00:00.000Z'),
  consumedAt = null,
  metadata = {}
} = {}) {
  return {
    id,
    user_id: userId,
    session_token_hash: tokenHash,
    portal_url: 'https://billing.example.com/portal?session=seeded',
    return_url: 'https://app.example.com/account/billing',
    status,
    expires_at: expiresAt,
    consumed_at: consumedAt,
    metadata: JSON.stringify(metadata),
    created_at: new Date('2025-03-26T09:00:00.000Z'),
    updated_at: new Date('2025-03-26T09:30:00.000Z')
  };
}

describe('BillingPortalSessionModel', () => {
  let connection;

  beforeEach(() => {
    connection = createKnexMock([
      createSeededRow({ id: 'session-old', tokenHash: 'hash-old', expiresAt: new Date('2025-03-26T09:00:00.000Z') }),
      createSeededRow({ id: 'session-active', tokenHash: BillingPortalSessionModel.hashToken('active-token'), expiresAt: new Date('2025-03-26T15:00:00.000Z') })
    ]);
  });

  it('hashes tokens using SHA-256', () => {
    const hash = BillingPortalSessionModel.hashToken('my-token');
    const secondHash = BillingPortalSessionModel.hashToken('my-token');
    expect(hash).toHaveLength(64);
    expect(hash).toBe(secondHash);
  });

  it('creates new sessions, expiring previous active ones for the user', async () => {
    const session = await BillingPortalSessionModel.create(
      {
        userId: 77,
        token: 'new-token',
        portalUrl: 'https://billing.example.com/portal?session=new-token',
        returnUrl: 'https://app.example.com/account/billing',
        expiresAt: new Date('2025-03-26T18:00:00.000Z'),
        metadata: { actor: 'learner@example.com' }
      },
      connection
    );

    expect(session).toEqual(
      expect.objectContaining({
        userId: 77,
        status: 'active',
        returnUrl: 'https://app.example.com/account/billing'
      })
    );

    const state = connection.__state.rows;
    const expired = state.find((row) => row.id === 'session-active');
    expect(expired.status).toBe('expired');

    const stored = await BillingPortalSessionModel.findByToken('new-token', connection);
    expect(stored).toEqual(
      expect.objectContaining({
        userId: 77,
        portalUrl: 'https://billing.example.com/portal?session=new-token',
        metadata: { actor: 'learner@example.com' }
      })
    );
  });

  it('marks sessions as consumed using hashed lookup', async () => {
    const result = await BillingPortalSessionModel.markConsumed('active-token', connection);
    expect(result).toEqual(expect.objectContaining({ status: 'consumed' }));
    const state = connection.__state.rows.find((row) => row.id === 'session-active');
    expect(state.status).toBe('consumed');
    expect(state.consumed_at).toBeTruthy();
  });

  it('expires sessions older than a reference timestamp', async () => {
    const updated = await BillingPortalSessionModel.expireStaleSessions(
      new Date('2025-03-26T12:30:00.000Z'),
      connection
    );
    expect(updated).toBeGreaterThanOrEqual(1);
    const staleRow = connection.__state.rows.find((row) => row.id === 'session-old');
    expect(staleRow.status).toBe('expired');
  });

  it('lists active sessions ordered by creation time', async () => {
    await BillingPortalSessionModel.create(
      {
        userId: 77,
        token: 'first-token',
        portalUrl: 'https://billing.example.com/portal?session=first-token',
        expiresAt: new Date('2025-03-26T19:00:00.000Z')
      },
      connection
    );

    connection.__advance(60);

    await BillingPortalSessionModel.create(
      {
        userId: 77,
        token: 'second-token',
        portalUrl: 'https://billing.example.com/portal?session=second-token',
        expiresAt: new Date('2025-03-26T20:00:00.000Z')
      },
      connection
    );

    const sessions = await BillingPortalSessionModel.listActiveByUser(77, connection);
    expect(sessions).toHaveLength(1);
    expect(sessions[0].portalUrl).toContain('second-token');
  });
});
