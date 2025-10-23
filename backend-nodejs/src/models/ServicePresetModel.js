import db from '../config/database.js';

const TABLE = 'service_presets';

function resolveQueryClient(connection) {
  if (typeof connection === 'function') {
    return connection;
  }

  if (connection && typeof connection === 'object') {
    if (typeof connection.table === 'function') {
      return connection.table.bind(connection);
    }
    if (typeof connection.from === 'function') {
      return connection.from.bind(connection);
    }
  }

  if (typeof db === 'function') {
    return db;
  }

  if (db && typeof db === 'object') {
    if (typeof db.table === 'function') {
      return db.table.bind(db);
    }
    if (typeof db.from === 'function') {
      return db.from.bind(db);
    }
  }

  return null;
}

function parseJson(value, fallback) {
  if (Array.isArray(value) || (value && typeof value === 'object')) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed) || (parsed && typeof parsed === 'object')) {
        return parsed;
      }
    } catch (_error) {
      return fallback;
    }
  }

  return fallback;
}

function deserialize(record) {
  if (!record) {
    return null;
  }

  const defaultTargets = parseJson(record.default_targets, []);
  const defaultJobGroups = parseJson(record.default_job_groups, []);
  const metadata = parseJson(record.metadata, {});

  return {
    id: record.id,
    key: record.key,
    label: record.label,
    description: record.description ?? '',
    defaultTargets,
    defaultJobGroups,
    metadata,
    createdAt: record.created_at,
    updatedAt: record.updated_at
  };
}

export default class ServicePresetModel {
  static async listAll(connection = db) {
    const queryClient = resolveQueryClient(connection);
    if (!queryClient) {
      return [];
    }

    const rows = await queryClient(TABLE).select('*').orderBy('id', 'asc');
    return rows.map(deserialize);
  }

  static async findByKey(key, connection = db) {
    if (!key) {
      return null;
    }
    const queryClient = resolveQueryClient(connection);
    if (!queryClient) {
      return null;
    }

    const record = await queryClient(TABLE).where({ key }).first();
    return deserialize(record);
  }

  static async upsert({ key, label, description, defaultTargets = [], defaultJobGroups = [], metadata = {} }, connection = db) {
    if (!key) {
      throw new Error('key is required to upsert a service preset');
    }

    const queryClient = resolveQueryClient(connection);
    if (!queryClient) {
      return null;
    }

    const payload = {
      key,
      label,
      description,
      default_targets: JSON.stringify(defaultTargets ?? []),
      default_job_groups: JSON.stringify(defaultJobGroups ?? []),
      metadata: JSON.stringify(metadata ?? {})
    };

    const existing = await queryClient(TABLE).where({ key }).first();
    const nowValue = queryClient.fn?.now?.() ?? new Date().toISOString();

    if (existing) {
      await queryClient(TABLE)
        .where({ id: existing.id })
        .update({ ...payload, updated_at: nowValue });
    } else {
      await queryClient(TABLE).insert({ ...payload, created_at: nowValue, updated_at: nowValue });
    }

    return this.findByKey(key, connection);
  }
}
