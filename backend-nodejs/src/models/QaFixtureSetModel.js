import db from '../config/database.js';

const TABLE = 'qa_fixture_sets';

const BASE_COLUMNS = [
  'id',
  'slug',
  'title',
  'description',
  'data_scope as dataScope',
  'data_classification as dataClassification',
  'anonymisation_strategy as anonymisationStrategy',
  'seed_command as seedCommand',
  'refresh_cadence as refreshCadence',
  'storage_path as storagePath',
  'checksum',
  'owner_team as ownerTeam',
  'last_refreshed_at as lastRefreshedAt',
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

function deserialize(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description ?? null,
    dataScope: row.dataScope,
    dataClassification: row.dataClassification,
    anonymisationStrategy: row.anonymisationStrategy ?? null,
    seedCommand: row.seedCommand ?? null,
    refreshCadence: row.refreshCadence ?? null,
    storagePath: row.storagePath ?? null,
    checksum: row.checksum ?? null,
    ownerTeam: row.ownerTeam,
    lastRefreshedAt: row.lastRefreshedAt ?? null,
    metadata: parseJson(row.metadata, {}),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

export default class QaFixtureSetModel {
  static deserialize = deserialize;

  static async list(connection = db) {
    const rows = await connection(TABLE).select(BASE_COLUMNS).orderBy('title', 'asc');
    return rows.map(deserialize);
  }

  static async findBySlug(slug, connection = db) {
    if (!slug) {
      return null;
    }

    const row = await connection(TABLE).select(BASE_COLUMNS).where({ slug }).first();
    return deserialize(row);
  }
}
