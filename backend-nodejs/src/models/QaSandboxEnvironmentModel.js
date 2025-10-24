import db from '../config/database.js';

const TABLE = 'qa_sandbox_environments';

const BASE_COLUMNS = [
  'id',
  'slug',
  'label',
  'environment_type as environmentType',
  'fixture_set_id as fixtureSetId',
  'access_url as accessUrl',
  'region',
  'owner_team as ownerTeam',
  'seed_script as seedScript',
  'refresh_cadence as refreshCadence',
  'access_instructions as accessInstructions',
  'status',
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
    label: row.label,
    environmentType: row.environmentType,
    fixtureSetId: row.fixtureSetId ?? null,
    accessUrl: row.accessUrl ?? null,
    region: row.region ?? null,
    ownerTeam: row.ownerTeam,
    seedScript: row.seedScript ?? null,
    refreshCadence: row.refreshCadence ?? null,
    accessInstructions: row.accessInstructions ?? null,
    status: row.status,
    lastRefreshedAt: row.lastRefreshedAt ?? null,
    metadata: parseJson(row.metadata, {}),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

export default class QaSandboxEnvironmentModel {
  static deserialize = deserialize;

  static async list(filters = {}, connection = db) {
    const query = connection(TABLE).select(BASE_COLUMNS);

    if (filters.status) {
      query.where('status', filters.status);
    }

    if (filters.environmentType) {
      query.where('environment_type', filters.environmentType);
    }

    const rows = await query.orderBy('label', 'asc');
    return rows.map(deserialize);
  }
}
