import db from '../config/database.js';

const TABLE = 'platform_settings';

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
    createdAt: record.created_at,
    updatedAt: record.updated_at
  };
}

export default class PlatformSettingModel {
  static async findByKey(key, connection = db) {
    const record = await connection(TABLE).where({ key }).first();
    return deserialize(record);
  }

  static async upsert(key, value, connection = db) {
    const payload = {
      key,
      value: JSON.stringify(value ?? {})
    };

    const existing = await connection(TABLE).where({ key }).first();
    if (existing) {
      await connection(TABLE)
        .where({ id: existing.id })
        .update({ ...payload, updated_at: connection.fn.now() });
      return this.findByKey(key, connection);
    }

    await connection(TABLE).insert({ ...payload, created_at: connection.fn.now() });
    return this.findByKey(key, connection);
  }
}
