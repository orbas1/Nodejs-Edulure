import db from '../config/database.js';

function parseJson(value, fallback) {
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

function serialise(row) {
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    query: row.search_query,
    entityTypes: parseJson(row.entity_types, []),
    filters: parseJson(row.filters, {}),
    globalFilters: parseJson(row.global_filters, {}),
    sortPreferences: parseJson(row.sort_preferences, {}),
    isPinned: Boolean(row.is_pinned),
    lastUsedAt: row.last_used_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function toRowPayload(payload) {
  return {
    user_id: payload.userId,
    name: payload.name,
    search_query: payload.query,
    entity_types: JSON.stringify(payload.entityTypes ?? []),
    filters: JSON.stringify(payload.filters ?? {}),
    global_filters: JSON.stringify(payload.globalFilters ?? {}),
    sort_preferences: JSON.stringify(payload.sortPreferences ?? {}),
    is_pinned: payload.isPinned ?? false,
    last_used_at: payload.lastUsedAt ?? null
  };
}

export default class SavedSearchModel {
  static async listByUser(userId, connection = db) {
    const rows = await connection('saved_searches')
      .where('user_id', userId)
      .orderBy([{ column: 'is_pinned', order: 'desc' }, { column: 'last_used_at', order: 'desc' }, { column: 'updated_at', order: 'desc' }]);
    return rows.map(serialise);
  }

  static async findById(id, userId, connection = db) {
    const row = await connection('saved_searches')
      .where({ id })
      .modify((qb) => {
        if (userId) {
          qb.andWhere('user_id', userId);
        }
      })
      .first();
    return serialise(row);
  }

  static async create(payload, connection = db) {
    const rowPayload = toRowPayload(payload);
    rowPayload.user_id = payload.userId;
    const [id] = await connection('saved_searches').insert(rowPayload);
    return this.findById(id, payload.userId, connection);
  }

  static async update(id, payload, connection = db) {
    const updates = {};
    if (payload.name !== undefined) {
      updates.name = payload.name;
    }
    if (payload.query !== undefined) {
      updates.search_query = payload.query;
    }
    if (payload.entityTypes !== undefined) {
      updates.entity_types = JSON.stringify(payload.entityTypes ?? []);
    }
    if (payload.filters !== undefined) {
      updates.filters = JSON.stringify(payload.filters ?? {});
    }
    if (payload.globalFilters !== undefined) {
      updates.global_filters = JSON.stringify(payload.globalFilters ?? {});
    }
    if (payload.sortPreferences !== undefined) {
      updates.sort_preferences = JSON.stringify(payload.sortPreferences ?? {});
    }
    if (payload.isPinned !== undefined) {
      updates.is_pinned = Boolean(payload.isPinned);
    }
    if (payload.lastUsedAt !== undefined) {
      updates.last_used_at = payload.lastUsedAt;
    }
    if (Object.keys(updates).length === 0) {
      return this.findById(id, payload.userId, connection);
    }
    await connection('saved_searches').where({ id }).update(updates);
    return this.findById(id, payload.userId, connection);
  }

  static async delete(id, userId, connection = db) {
    return connection('saved_searches').where({ id, user_id: userId }).del();
  }
}
