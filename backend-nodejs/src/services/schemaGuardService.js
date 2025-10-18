import fs from 'fs/promises';
import path from 'path';

import logger from '../config/logger.js';

const COLUMN_COMPARISON_KEYS = [
  'dataType',
  'columnType',
  'isNullable',
  'columnDefault',
  'characterSet',
  'collation',
  'numericPrecision',
  'numericScale',
  'extra'
];

function normalizeColumnRow(row) {
  return {
    name: row.COLUMN_NAME,
    ordinalPosition: Number(row.ORDINAL_POSITION),
    dataType: row.DATA_TYPE,
    columnType: row.COLUMN_TYPE,
    isNullable: row.IS_NULLABLE === 'YES',
    columnDefault: row.COLUMN_DEFAULT === null ? null : String(row.COLUMN_DEFAULT),
    characterSet: row.CHARACTER_SET_NAME ?? null,
    collation: row.COLLATION_NAME ?? null,
    numericPrecision:
      row.NUMERIC_PRECISION === null || row.NUMERIC_PRECISION === undefined
        ? null
        : Number(row.NUMERIC_PRECISION),
    numericScale:
      row.NUMERIC_SCALE === null || row.NUMERIC_SCALE === undefined
        ? null
        : Number(row.NUMERIC_SCALE),
    extra: row.EXTRA ?? null
  };
}

function normalizeIndexRow(row) {
  return {
    name: row.INDEX_NAME,
    columns: row.COLUMN_NAME,
    seqInIndex: Number(row.SEQ_IN_INDEX),
    unique: row.NON_UNIQUE === 0,
    type: row.INDEX_TYPE,
    isPrimary: row.INDEX_NAME === 'PRIMARY'
  };
}

function groupColumnsByTable(rows) {
  const result = new Map();
  for (const row of rows) {
    const normalized = normalizeColumnRow(row);
    if (!result.has(row.TABLE_NAME)) {
      result.set(row.TABLE_NAME, []);
    }
    result.get(row.TABLE_NAME).push(normalized);
  }

  const tables = {};
  for (const [tableName, columns] of result.entries()) {
    columns.sort((a, b) => a.ordinalPosition - b.ordinalPosition);
    const columnMap = {};
    for (const column of columns) {
      columnMap[column.name] = column;
    }
    tables[tableName] = { columns: columnMap };
  }

  return tables;
}

function groupIndexesByTable(rows) {
  const grouped = new Map();

  for (const row of rows) {
    const normalized = normalizeIndexRow(row);
    if (!grouped.has(row.TABLE_NAME)) {
      grouped.set(row.TABLE_NAME, new Map());
    }
    const tableIndexes = grouped.get(row.TABLE_NAME);
    if (!tableIndexes.has(normalized.name)) {
      tableIndexes.set(normalized.name, []);
    }
    tableIndexes.get(normalized.name).push(normalized);
  }

  const tables = {};
  for (const [tableName, indexMap] of grouped.entries()) {
    const indexes = [];
    for (const [indexName, parts] of indexMap.entries()) {
      parts.sort((a, b) => a.seqInIndex - b.seqInIndex);
      indexes.push({
        name: indexName,
        columns: parts.map((part) => part.columns),
        unique: parts[0]?.unique ?? false,
        type: parts[0]?.type ?? null,
        isPrimary: parts[0]?.isPrimary ?? false
      });
    }
    tables[tableName] = { indexes };
  }

  return tables;
}

export async function collectSchemaMetadata({
  knex,
  schemaName,
  tables,
  includeIndexes = true
}) {
  if (!knex) {
    throw new Error('collectSchemaMetadata requires a valid knex instance.');
  }

  const connection = knex?.client?.config?.connection ?? {};
  const targetSchema = schemaName ?? connection.database;
  if (!targetSchema) {
    throw new Error('Unable to determine target schema name.');
  }

  let tableList = Array.isArray(tables) && tables.length > 0 ? tables : null;

  if (!tableList) {
    const [rows] = await knex.raw(
      `SELECT TABLE_NAME
       FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = ?`,
      [targetSchema]
    );
    tableList = rows.map((row) => row.TABLE_NAME);
  }

  if (!tableList || tableList.length === 0) {
    return { database: targetSchema, tables: {} };
  }

  const [columnRows] = await knex.raw(
    `SELECT *
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME IN (${tableList.map(() => '?').join(',')})`,
    [targetSchema, ...tableList]
  );

  const tablesWithColumns = groupColumnsByTable(columnRows);

  if (includeIndexes) {
    const [indexRows] = await knex.raw(
      `SELECT *
       FROM INFORMATION_SCHEMA.STATISTICS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME IN (${tableList.map(() => '?').join(',')})`,
      [targetSchema, ...tableList]
    );
    const tablesWithIndexes = groupIndexesByTable(indexRows);

    for (const tableName of Object.keys(tablesWithColumns)) {
      tablesWithColumns[tableName].indexes = tablesWithIndexes[tableName]?.indexes ?? [];
    }

    for (const tableName of Object.keys(tablesWithIndexes)) {
      if (!tablesWithColumns[tableName]) {
        tablesWithColumns[tableName] = { columns: {}, indexes: tablesWithIndexes[tableName].indexes };
      }
    }
  }

  return { database: targetSchema, tables: tablesWithColumns };
}

function indexSignature(index) {
  const columns = (index.columns ?? []).join('|');
  return `${index.unique ? 'unique' : 'non-unique'}|${columns}`;
}

export function diffSchemas(baseline, actual) {
  const differences = [];
  const baselineTables = new Set(Object.keys(baseline?.tables ?? {}));
  const actualTables = new Set(Object.keys(actual?.tables ?? {}));

  for (const tableName of baselineTables) {
    if (!actualTables.has(tableName)) {
      differences.push({
        level: 'table',
        type: 'missing',
        table: tableName,
        message: `Table "${tableName}" is missing from actual schema.`
      });
    }
  }

  for (const tableName of actualTables) {
    if (!baselineTables.has(tableName)) {
      differences.push({
        level: 'table',
        type: 'unexpected',
        table: tableName,
        message: `Table "${tableName}" not defined in baseline.`
      });
    }
  }

  for (const tableName of baselineTables) {
    if (!actualTables.has(tableName)) {
      continue;
    }

    const baselineTable = baseline.tables[tableName];
    const actualTable = actual.tables[tableName] ?? {};
    const baselineColumns = baselineTable.columns ?? {};
    const actualColumns = actualTable.columns ?? {};

    for (const columnName of Object.keys(baselineColumns)) {
      if (!Object.prototype.hasOwnProperty.call(actualColumns, columnName)) {
        differences.push({
          level: 'column',
          type: 'missing',
          table: tableName,
          column: columnName,
          message: `Column "${columnName}" missing from table "${tableName}".`
        });
        continue;
      }

      const expected = baselineColumns[columnName];
      const received = actualColumns[columnName];

      for (const key of COLUMN_COMPARISON_KEYS) {
        if (!expected || !Object.prototype.hasOwnProperty.call(expected, key)) {
          continue;
        }

        const expectedValue = expected[key];
        const actualValue = received?.[key] ?? null;

        if (expectedValue !== actualValue) {
          differences.push({
            level: 'column',
            type: 'mismatch',
            table: tableName,
            column: columnName,
            key,
            expected: expectedValue,
            actual: actualValue,
            message: `Column "${columnName}" on table "${tableName}" differs for ${key}: expected ${expectedValue}, received ${actualValue}.`
          });
        }
      }
    }

    for (const columnName of Object.keys(actualColumns)) {
      if (!Object.prototype.hasOwnProperty.call(baselineColumns, columnName)) {
        differences.push({
          level: 'column',
          type: 'unexpected',
          table: tableName,
          column: columnName,
          message: `Column "${columnName}" unexpectedly present on table "${tableName}".`
        });
      }
    }

    const baselineIndexes = baselineTable.indexes ?? [];
    const actualIndexes = actualTable.indexes ?? [];
    const baselineIndexMap = new Map();
    const actualIndexMap = new Map();

    for (const index of baselineIndexes) {
      baselineIndexMap.set(indexSignature(index), index);
    }

    for (const index of actualIndexes) {
      actualIndexMap.set(indexSignature(index), index);
    }

    for (const [signature, index] of baselineIndexMap.entries()) {
      if (!actualIndexMap.has(signature)) {
        differences.push({
          level: 'index',
          type: 'missing',
          table: tableName,
          index: index.name,
          columns: index.columns,
          message: `Index (${signature}) missing from table "${tableName}".`
        });
        continue;
      }

      const actualIndex = actualIndexMap.get(signature);
      const expectedType = (index.type ?? '').toUpperCase();
      const actualType = (actualIndex.type ?? '').toUpperCase();
      if (expectedType && actualType && expectedType !== actualType) {
        differences.push({
          level: 'index',
          type: 'mismatch',
          table: tableName,
          index: index.name,
          columns: index.columns,
          key: 'type',
          expected: expectedType,
          actual: actualType,
          message: `Index (${signature}) type mismatch on table "${tableName}": expected ${expectedType}, received ${actualType}.`
        });
      }
    }

    for (const [signature, index] of actualIndexMap.entries()) {
      if (!baselineIndexMap.has(signature)) {
        differences.push({
          level: 'index',
          type: 'unexpected',
          table: tableName,
          index: index.name,
          columns: index.columns,
          message: `Unexpected index (${signature}) detected on table "${tableName}".`
        });
      }
    }
  }

  return differences;
}

export function summariseDiffs(differences) {
  if (!differences || differences.length === 0) {
    return 'Schema matches baseline definition.';
  }

  return differences
    .map((diff) => {
      const location = diff.column ? `${diff.table}.${diff.column}` : diff.table;
      return `${diff.level.toUpperCase()}: ${location} – ${diff.message}`;
    })
    .join('\n');
}

export async function loadBaseline(filePath) {
  const resolvedPath = path.resolve(filePath);
  const data = await fs.readFile(resolvedPath, 'utf8');
  return JSON.parse(data);
}

export async function writeBaseline(filePath, schema) {
  const resolvedPath = path.resolve(filePath);
  await fs.mkdir(path.dirname(resolvedPath), { recursive: true });
  const payload = {
    generatedAt: new Date().toISOString(),
    database: schema.database,
    tables: schema.tables
  };
  await fs.writeFile(resolvedPath, JSON.stringify(payload, null, 2));
  logger.info({ baselinePath: resolvedPath }, 'Schema baseline updated');
}

export default {
  collectSchemaMetadata,
  diffSchemas,
  summariseDiffs,
  loadBaseline,
  writeBaseline
};

export { normalizeColumnRow, normalizeIndexRow };
