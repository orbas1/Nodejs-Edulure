import db from '../config/database.js';

const TABLE = 'qa_test_suites';

const BASE_COLUMNS = [
  'id',
  'surface_id as surfaceId',
  'suite_key as suiteKey',
  'suite_type as suiteType',
  'description',
  'owner_email as ownerEmail',
  'ci_job as ciJob',
  'threshold_statements as thresholdStatements',
  'threshold_branches as thresholdBranches',
  'threshold_functions as thresholdFunctions',
  'threshold_lines as thresholdLines',
  'metadata',
  'created_at as createdAt',
  'updated_at as updatedAt'
];

function parseJson(value, fallback) {
  if (!value) {
    return fallback;
  }

  if (typeof value === 'object') {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch (_error) {
    return fallback;
  }
}

function parseDecimal(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function deserialize(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    surfaceId: row.surfaceId,
    suiteKey: row.suiteKey,
    suiteType: row.suiteType,
    description: row.description ?? null,
    ownerEmail: row.ownerEmail ?? null,
    ciJob: row.ciJob ?? null,
    thresholds: {
      statements: parseDecimal(row.thresholdStatements),
      branches: parseDecimal(row.thresholdBranches),
      functions: parseDecimal(row.thresholdFunctions),
      lines: parseDecimal(row.thresholdLines)
    },
    metadata: parseJson(row.metadata, {}),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

export default class QaTestSuiteModel {
  static deserialize = deserialize;

  static async list(filters = {}, connection = db) {
    const query = connection(TABLE).select(BASE_COLUMNS);

    if (Array.isArray(filters.surfaceIds) && filters.surfaceIds.length) {
      query.whereIn('surface_id', filters.surfaceIds);
    }

    if (Array.isArray(filters.suiteKeys) && filters.suiteKeys.length) {
      query.whereIn('suite_key', filters.suiteKeys);
    }

    if (filters.suiteType) {
      query.where('suite_type', filters.suiteType);
    }

    const rows = await query.orderBy('suite_key', 'asc');
    return rows.map(deserialize);
  }

  static async findByKey(suiteKey, connection = db) {
    if (!suiteKey) {
      return null;
    }

    const row = await connection(TABLE).select(BASE_COLUMNS).where({ suite_key: suiteKey }).first();
    return deserialize(row);
  }

  static async findById(id, connection = db) {
    if (!id) {
      return null;
    }

    const row = await connection(TABLE).select(BASE_COLUMNS).where({ id }).first();
    return deserialize(row);
  }
}
