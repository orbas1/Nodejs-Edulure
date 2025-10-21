import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import LearnerPaymentMethodModel from '../src/models/LearnerPaymentMethodModel.js';

const TABLE = 'learner_payment_methods';

function createKnexMock(initialRows = []) {
  const state = {
    rows: initialRows.map((row) => ({ ...row })),
    nextId: initialRows.reduce((acc, row) => Math.max(acc, row.id ?? 0), 0) + 1,
    now: () => new Date('2024-01-01T00:00:00.000Z')
  };

  function buildQuery() {
    const context = {
      filters: [],
      select: null,
      orderings: [],
      limit: null,
      offset: 0
    };

    const applyFilters = ({ forUpdate = false } = {}) => {
      let rows = state.rows.slice();

      context.filters.forEach((filter) => {
        rows = rows.filter(filter);
      });

      if (context.orderings.length) {
        rows.sort((a, b) => {
          for (const { column, direction } of context.orderings) {
            const dir = direction === 'desc' ? -1 : 1;
            if (a[column] < b[column]) return -1 * dir;
            if (a[column] > b[column]) return 1 * dir;
          }
          return 0;
        });
      }

      if (context.offset) {
        rows = rows.slice(context.offset);
      }

      if (context.limit !== null && context.limit !== undefined) {
        rows = rows.slice(0, context.limit);
      }

      if (!forUpdate && context.select && context.select !== '*') {
        return rows.map((row) => {
          const projection = {};
          context.select.forEach((column) => {
            projection[column] = row[column];
          });
          return projection;
        });
      }

      return rows;
    };

    const builder = {
      select(columns = '*') {
        context.select = columns;
        return builder;
      },
      where(condition) {
        context.filters.push((row) =>
          Object.entries(condition).every(([key, value]) => row[key] === value)
        );
        return builder;
      },
      andWhere(condition) {
        return builder.where(condition);
      },
      andWhereNot(column, value) {
        context.filters.push((row) => row[column] !== value);
        return builder;
      },
      andWhereRaw(sql, params) {
        const match = sql.match(/LOWER\((\w+)\) = LOWER\(\?\)/i);
        if (match) {
          const column = match[1];
          const comparison = String(params[0] ?? '').toLowerCase();
          context.filters.push((row) => String(row[column] ?? '').toLowerCase() === comparison);
        }
        return builder;
      },
      orderBy(column, direction = 'asc') {
        context.orderings.push({ column, direction });
        return builder;
      },
      limit(value) {
        context.limit = value;
        return builder;
      },
      offset(value) {
        context.offset = value;
        return builder;
      },
      first: async () => {
        const rows = applyFilters();
        return rows[0] ?? null;
      },
      update: async (payload) => {
        const rows = applyFilters({ forUpdate: true });
        rows.forEach((row) => {
          Object.assign(row, payload);
          row.updated_at = state.now();
        });
        return rows.length;
      },
      del: async () => {
        const rows = applyFilters({ forUpdate: true });
        const ids = new Set(rows.map((row) => row.id));
        state.rows = state.rows.filter((row) => !ids.has(row.id));
        return rows.length;
      },
      insert: async (payload) => {
        const row = {
          id: state.nextId++,
          created_at: payload.created_at ?? state.now(),
          updated_at: payload.updated_at ?? state.now(),
          ...payload
        };
        state.rows.push(row);
        return [row.id];
      }
    };

    return builder;
  }

  const connection = (tableName) => {
    if (tableName !== TABLE) {
      throw new Error(`Unexpected table ${tableName}`);
    }
    return buildQuery();
  };

  connection.fn = {
    now: vi.fn(() => state.now())
  };

  connection.transaction = async (callback) => {
    const trx = (tableName) => {
      if (tableName !== TABLE) {
        throw new Error(`Unexpected table ${tableName}`);
      }
      const query = buildQuery();
      return query;
    };
    trx.fn = connection.fn;
    trx.isTransaction = true;
    trx.transaction = connection.transaction;
    return callback(trx);
  };

  connection.isTransaction = false;
  connection.__getRows = () => state.rows.map((row) => ({ ...row }));

  return connection;
}

describe('LearnerPaymentMethodModel', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('ensures only one primary payment method per user when inserting new primary', async () => {
    const connection = createKnexMock();

    const first = await LearnerPaymentMethodModel.create(
      {
        userId: 42,
        label: 'Personal Visa',
        brand: 'visa',
        last4: '1111',
        expiry: '12/28',
        primary: false
      },
      connection
    );

    expect(first.primary).toBe(false);

    const second = await LearnerPaymentMethodModel.create(
      {
        userId: 42,
        label: 'Business Mastercard',
        brand: 'mastercard',
        last4: '2222',
        expiry: '11/29',
        primary: true
      },
      connection
    );

    expect(second.primary).toBe(true);

    const rows = connection.__getRows().filter((row) => row.user_id === 42);
    expect(rows).toHaveLength(2);
    const primaryCount = rows.filter((row) => row.is_primary).length;
    expect(primaryCount).toBe(1);
    const legacy = rows.find((row) => row.label === 'Personal Visa');
    expect(legacy.is_primary).toBe(false);
  });

  it('reassigns primacy when updating an existing method without explicit user id', async () => {
    const connection = createKnexMock();

    const first = await LearnerPaymentMethodModel.create(
      {
        userId: 77,
        label: 'Everyday Card',
        brand: 'amex',
        last4: '3333',
        expiry: '10/27',
        primary: false
      },
      connection
    );

    const second = await LearnerPaymentMethodModel.create(
      {
        userId: 77,
        label: 'Backup Card',
        brand: 'visa',
        last4: '4444',
        expiry: '08/26',
        primary: false
      },
      connection
    );

    const updated = await LearnerPaymentMethodModel.updateById(second.id, { primary: true }, connection);

    expect(updated.primary).toBe(true);
    const rows = connection.__getRows().filter((row) => row.user_id === 77);
    const primaryRows = rows.filter((row) => row.is_primary);
    expect(primaryRows).toHaveLength(1);
    expect(primaryRows[0].id).toBe(second.id);
    const original = rows.find((row) => row.id === first.id);
    expect(original.is_primary).toBe(false);
  });
});
