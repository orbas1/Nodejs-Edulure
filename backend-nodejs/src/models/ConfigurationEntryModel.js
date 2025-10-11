import db from '../config/database.js';

function parseJson(value, fallback = null) {
  if (value === null || value === undefined) {
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

function toDomain(row) {
  return {
    id: row.id,
    key: row.key,
    environmentScope: row.environment_scope,
    valueType: row.value_type,
    value: row.value,
    description: row.description,
    exposureLevel: row.exposure_level,
    sensitive: Boolean(row.sensitive),
    metadata: parseJson(row.metadata, {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export default class ConfigurationEntryModel {
  static async all(connection = db) {
    const rows = await connection('configuration_entries').select('*').orderBy(['key', 'environment_scope']);
    return rows.map(toDomain);
  }

  static async findByKeyAndScope(key, environmentScope = 'global', connection = db) {
    const row = await connection('configuration_entries')
      .where({ key, environment_scope: environmentScope })
      .first();
    return row ? toDomain(row) : null;
  }
}
