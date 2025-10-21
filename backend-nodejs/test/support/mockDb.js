import { vi } from 'vitest';

function normaliseColumn(column) {
  if (!column) {
    return column;
  }
  const trimmed = String(column).trim();
  const parts = trimmed.split('.');
  return parts[parts.length - 1];
}

function projectRow(row, select) {
  if (!select || !select.length) {
    return { ...row };
  }
  const projected = {};
  for (const column of select) {
    if (typeof column !== 'string') {
      continue;
    }
    const match = column.match(/^\s*([\w.]+)(?:\s+as\s+([\w.]+))?\s*$/i);
    if (!match) {
      continue;
    }
    const [, raw, alias] = match;
    const key = normaliseColumn(raw);
    projected[alias ?? key] = row[key];
  }
  return projected;
}

function createTableState(rows = []) {
  const clonedRows = rows.map((row) => ({ ...row }));
  const maxId = clonedRows.reduce((max, row) => (row.id && row.id > max ? row.id : max), 0);
  return {
    rows: clonedRows,
    autoId: maxId + 1
  };
}

function applyFilters(tableState, state) {
  const filters = state.where;
  const whereInFilters = state.whereIn;
  return tableState.rows.filter((row) => {
    for (const filter of filters) {
      if (filter.type === 'object') {
        const entries = Object.entries(filter.data);
        const matches = entries.every(([key, value]) => row[normaliseColumn(key)] === value);
        if (!matches) {
          return false;
        }
      } else if (filter.type === 'pair') {
        if (row[normaliseColumn(filter.column)] !== filter.value) {
          return false;
        }
      }
    }

    for (const filter of whereInFilters) {
      const value = row[normaliseColumn(filter.column)];
      if (!filter.values.has(value)) {
        return false;
      }
    }

    return true;
  });
}

function sortRows(rows, order) {
  if (!order.length) {
    return rows;
  }

  return [...rows].sort((a, b) => {
    for (const { column, direction } of order) {
      const key = normaliseColumn(column);
      const dir = direction?.toLowerCase() === 'desc' ? -1 : 1;
      const aValue = a[key];
      const bValue = b[key];
      if (aValue === bValue) {
        continue;
      }
      return aValue > bValue ? dir : -dir;
    }
    return 0;
  });
}

export function createMockConnection(initialData = {}) {
  const tables = new Map(
    Object.entries(initialData).map(([table, rows]) => [table, createTableState(rows)])
  );

  const connection = vi.fn((tableName) => {
    const resolvedName = String(tableName).split(/\s+as\s+/i)[0].trim();
    const tableState = tables.get(resolvedName);
    if (!tableState) {
      throw new Error(`Unexpected table requested: ${tableName}`);
    }

    const state = {
      select: null,
      where: [],
      whereIn: [],
      order: [],
      limit: null,
      offset: 0,
      aggregate: null,
      join: null
    };

    const builder = {
      select(columns) {
        state.select = Array.isArray(columns) ? columns : [columns];
        return builder;
      },
      where(arg1, arg2) {
        if (typeof arg1 === 'object' && arg1 !== null && arg2 === undefined) {
          state.where.push({ type: 'object', data: arg1 });
        } else {
          state.where.push({ type: 'pair', column: arg1, value: arg2 });
        }
        return builder;
      },
      andWhere(arg1, arg2) {
        return builder.where(arg1, arg2);
      },
      whereIn(column, values = []) {
        state.whereIn.push({ column, values: new Set(values) });
        return builder;
      },
      leftJoin(table, leftColumn, rightColumn) {
        const resolved = String(table).split(/\s+as\s+/i)[0].trim();
        state.join = {
          table: resolved,
          leftColumn,
          rightColumn
        };
        return builder;
      },
      orderBy(column, direction = 'asc') {
        state.order.push({ column, direction });
        return builder;
      },
      limit(value) {
        state.limit = value;
        return builder;
      },
      offset(value) {
        state.offset = value ?? 0;
        return builder;
      },
      count: vi.fn((columns = { count: '*' }) => {
        const alias = Object.keys(columns)[0] ?? 'count';
        state.aggregate = { type: 'count', alias };
        return builder;
      }),
      insert: vi.fn(async (payload) => {
        const next = Array.isArray(payload) ? payload : [payload];
        const ids = next.map((item) => {
          const record = { id: tableState.autoId++, ...item };
          tableState.rows.push(record);
          return record.id;
        });
        return ids;
      }),
      update: vi.fn(async (payload) => {
        const matches = applyFilters(tableState, state);
        matches.forEach((row) => {
          Object.assign(row, payload);
        });
        return matches.length;
      }),
      increment: vi.fn((increments = {}) => {
        const matches = applyFilters(tableState, state);
        matches.forEach((row) => {
          Object.entries(increments).forEach(([column, value]) => {
            const key = normaliseColumn(column);
            const current = Number(row[key] ?? 0);
            row[key] = current + Number(value ?? 0);
          });
        });
        return builder;
      }),
      del: vi.fn(async () => {
        const matches = applyFilters(tableState, state);
        tableState.rows = tableState.rows.filter((row) => !matches.includes(row));
        return matches.length;
      }),
      first: vi.fn(async () => {
        const [firstRow] = execute();
        return firstRow ?? null;
      }),
      then(onFulfilled, onRejected) {
        return Promise.resolve(execute()).then(onFulfilled, onRejected);
      }
    };

    function execute() {
      let results = applyFilters(tableState, state).map((row) => ({ ...row }));

      if (state.join) {
        const joinTable = tables.get(state.join.table);
        if (joinTable) {
          const leftKey = normaliseColumn(state.join.leftColumn);
          const rightKey = normaliseColumn(state.join.rightColumn);
          results = results.map((row) => {
            const match = joinTable.rows.find((joinRow) => joinRow[rightKey] === row[leftKey]);
            return match ? { ...row, ...match } : row;
          });
        }
      }

      results = sortRows(results, state.order);
      if (state.offset) {
        results = results.slice(state.offset);
      }
      if (state.limit !== null && state.limit !== undefined) {
        results = results.slice(0, state.limit);
      }

      if (state.aggregate?.type === 'count') {
        return [{ [state.aggregate.alias]: results.length }];
      }
      return results.map((row) => projectRow(row, state.select));
    }

    return builder;
  });

  connection.fn = {
    now: vi.fn(() => new Date('2024-01-01T00:00:00.000Z'))
  };

  connection.transaction = async (handler) => handler(connection);

  connection.__getRows = (tableName) => {
    const tableState = tables.get(tableName);
    return tableState ? tableState.rows.map((row) => ({ ...row })) : [];
  };

  return connection;
}
