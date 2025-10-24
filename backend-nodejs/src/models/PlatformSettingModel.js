import db from '../config/database.js';

const TABLE = 'platform_settings';

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

function deserialize(record) {
  if (!record) {
    return null;
  }

  let value = {};
  if (record.value && typeof record.value === 'string') {
    try {
      value = JSON.parse(record.value);
    } catch (_error) {
      value = {};
    }
  } else if (typeof record.value === 'object' && record.value !== null) {
    value = record.value;
  }

  return {
    id: record.id,
    key: record.key,
    value,
    version: record.version ?? 1,
    createdAt: record.created_at,
    updatedAt: record.updated_at
  };
}

export default class PlatformSettingModel {
  static async findByKey(key, connection = db) {
    const queryClient = resolveQueryClient(connection);
    if (!queryClient) {
      return null;
    }
    const record = await queryClient(TABLE).where({ key }).first();
    return deserialize(record);
  }

  static async upsert(key, value, connection = db, options = {}) {
    const queryClient = resolveQueryClient(connection);
    if (!queryClient) {
      return null;
    }
    const payload = {
      key,
      value: JSON.stringify(value ?? {})
    };

    const existing = await queryClient(TABLE).where({ key }).first();
    const nowValue = queryClient.fn?.now?.() ?? new Date().toISOString();
    const expectedVersion = options?.expectedVersion;

    if (existing) {
      if (expectedVersion !== undefined && Number(existing.version ?? 1) !== Number(expectedVersion)) {
        const error = new Error(`Platform setting ${key} version mismatch.`);
        error.code = 'PLATFORM_SETTING_VERSION_MISMATCH';
        throw error;
      }

      const currentVersion = Number(existing.version ?? 1);
      const nextVersion = currentVersion + 1;

      const updated = await queryClient(TABLE)
        .where({ id: existing.id, version: currentVersion })
        .update({ ...payload, version: nextVersion, updated_at: nowValue });

      if (updated === 0) {
        const error = new Error(`Platform setting ${key} update lost due to concurrent modification.`);
        error.code = 'PLATFORM_SETTING_CONCURRENCY_CONFLICT';
        throw error;
      }
      return this.findByKey(key, connection);
    }

    await queryClient(TABLE).insert({ ...payload, created_at: nowValue, updated_at: nowValue, version: 1 });
    return this.findByKey(key, connection);
  }
}
