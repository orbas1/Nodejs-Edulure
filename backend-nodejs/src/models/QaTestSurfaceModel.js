import db from '../config/database.js';

const TABLE = 'qa_test_surfaces';

const BASE_COLUMNS = [
  'id',
  'slug',
  'display_name as displayName',
  'surface_type as surfaceType',
  'repository_path as repositoryPath',
  'owner_team as ownerTeam',
  'ci_identifier as ciIdentifier',
  'threshold_statements as thresholdStatements',
  'threshold_branches as thresholdBranches',
  'threshold_functions as thresholdFunctions',
  'threshold_lines as thresholdLines',
  'is_active as isActive',
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
    slug: row.slug,
    displayName: row.displayName,
    surfaceType: row.surfaceType,
    repositoryPath: row.repositoryPath,
    ownerTeam: row.ownerTeam,
    ciIdentifier: row.ciIdentifier,
    thresholds: {
      statements: parseDecimal(row.thresholdStatements),
      branches: parseDecimal(row.thresholdBranches),
      functions: parseDecimal(row.thresholdFunctions),
      lines: parseDecimal(row.thresholdLines)
    },
    isActive: Boolean(row.isActive),
    metadata: parseJson(row.metadata, {}),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

export default class QaTestSurfaceModel {
  static deserialize = deserialize;

  static async list(filters = {}, connection = db) {
    const query = connection(TABLE).select(BASE_COLUMNS);

    if (filters.active !== undefined) {
      query.where('is_active', Boolean(filters.active));
    }

    if (filters.slugs && Array.isArray(filters.slugs) && filters.slugs.length) {
      query.whereIn('slug', filters.slugs);
    }

    if (filters.surfaceType) {
      query.where('surface_type', filters.surfaceType);
    }

    const rows = await query.orderBy('display_name', 'asc');
    return rows.map(deserialize);
  }

  static async findBySlug(slug, connection = db) {
    if (!slug) {
      return null;
    }

    const row = await connection(TABLE).select(BASE_COLUMNS).where({ slug }).first();
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
