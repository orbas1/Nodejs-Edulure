import { randomUUID } from 'node:crypto';

import db from '../config/database.js';

const TABLE = 'setup_runs';

const BASE_COLUMNS = [
  'id',
  'public_id as publicId',
  'preset_id as presetId',
  'status',
  'started_at as startedAt',
  'completed_at as completedAt',
  'heartbeat_at as heartbeatAt',
  'last_error as lastError',
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

function serialiseJson(value, fallback) {
  if (value === undefined || value === null) {
    return JSON.stringify(fallback);
  }

  if (typeof value === 'string') {
    return value;
  }

  return JSON.stringify(value);
}

function deserialize(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    publicId: row.publicId,
    presetId: row.presetId,
    status: row.status,
    startedAt: row.startedAt,
    completedAt: row.completedAt,
    heartbeatAt: row.heartbeatAt,
    lastError: parseJson(row.lastError, null),
    metadata: parseJson(row.metadata, {}),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

function toDbPayload(run) {
  return {
    public_id: run.publicId ?? randomUUID(),
    preset_id: run.presetId ?? null,
    status: run.status ?? 'running',
    started_at: run.startedAt ?? null,
    completed_at: run.completedAt ?? null,
    heartbeat_at: run.heartbeatAt ?? null,
    last_error: run.lastError ? serialiseJson(run.lastError, null) : null,
    metadata: serialiseJson(run.metadata ?? {}, {})
  };
}

function resolveConnection(connection) {
  return connection ?? db;
}

function getTableBuilder(connectionLike, tableName = TABLE) {
  const knexLike = resolveConnection(connectionLike);

  if (typeof knexLike === 'function') {
    return knexLike(tableName);
  }

  if (knexLike && typeof knexLike.table === 'function') {
    return knexLike.table(tableName);
  }

  if (knexLike && typeof knexLike.from === 'function') {
    return knexLike.from(tableName);
  }

  if (knexLike && typeof knexLike.select === 'function' && typeof knexLike.where === 'function') {
    return knexLike;
  }

  throw new TypeError('Invalid database connection provided to SetupRunModel');
}

function resolveNow(connectionLike) {
  const knexLike = resolveConnection(connectionLike);
  if (knexLike?.fn && typeof knexLike.fn.now === 'function') {
    return () => knexLike.fn.now();
  }

  return () => new Date().toISOString();
}

async function executeFirst(builder) {
  if (typeof builder.first === 'function') {
    return builder.first();
  }

  const result = await builder;
  if (!result) {
    return null;
  }

  return Array.isArray(result) ? result[0] ?? null : result;
}

export default class SetupRunModel {
  static deserialize = deserialize;

  static async create(run, connection = db) {
    const knexConnection = resolveConnection(connection);
    const payload = toDbPayload(run);
    if (!payload.started_at) {
      payload.started_at = resolveNow(knexConnection)();
    }

    const builder = getTableBuilder(knexConnection);
    const result = await builder.insert(payload);
    const [id] = Array.isArray(result) ? result : [result];
    return this.findById(id, knexConnection);
  }

  static async findById(id, connection = db) {
    const knexConnection = resolveConnection(connection);
    let query = getTableBuilder(knexConnection).select(BASE_COLUMNS);
    if (typeof query.where === 'function') {
      query = query.where({ id });
    }

    const row = await executeFirst(query);
    return row ? deserialize(row) : null;
  }

  static async findByPublicId(publicId, connection = db) {
    const knexConnection = resolveConnection(connection);
    let query = getTableBuilder(knexConnection).select(BASE_COLUMNS);
    if (typeof query.where === 'function') {
      query = query.where({ public_id: publicId });
    }

    const row = await executeFirst(query);
    return row ? deserialize(row) : null;
  }

  static async updateByPublicId(publicId, updates, connection = db) {
    const knexConnection = resolveConnection(connection);
    const payload = {};
    if (updates.presetId !== undefined) {
      payload.preset_id = updates.presetId ?? null;
    }
    if (updates.status !== undefined) {
      payload.status = updates.status;
    }
    if (updates.startedAt !== undefined) {
      payload.started_at = updates.startedAt ?? null;
    }
    if (updates.completedAt !== undefined) {
      payload.completed_at = updates.completedAt ?? null;
    }
    if (updates.heartbeatAt !== undefined) {
      payload.heartbeat_at = updates.heartbeatAt ?? null;
    }
    if (updates.lastError !== undefined) {
      payload.last_error = updates.lastError ? serialiseJson(updates.lastError, null) : null;
    }
    if (updates.metadata !== undefined) {
      payload.metadata = serialiseJson(updates.metadata ?? {}, {});
    }

    if (!Object.keys(payload).length) {
      return this.findByPublicId(publicId, knexConnection);
    }

    let query = getTableBuilder(knexConnection);
    if (typeof query.where === 'function') {
      query = query.where({ public_id: publicId });
    }

    const now = resolveNow(knexConnection)();
    if (typeof query.update !== 'function') {
      throw new TypeError('Database connection does not support update operations');
    }

    await query.update({ ...payload, updated_at: now });

    return this.findByPublicId(publicId, knexConnection);
  }

  static async listRecent(limit = 10, connection = db) {
    const knexConnection = resolveConnection(connection);
    const builder = getTableBuilder(knexConnection);
    const safeLimit = Math.max(1, Math.min(50, Number(limit) || 10));

    let query = builder.select(BASE_COLUMNS);
    if (typeof query.orderBy === 'function') {
      query = query.orderBy('created_at', 'desc');
    }
    if (typeof query.limit === 'function') {
      query = query.limit(safeLimit);
    }

    try {
      const rows = await query;
      if (!rows) {
        return [];
      }
      const list = Array.isArray(rows) ? rows : [rows];
      return list.map(deserialize).filter(Boolean);
    } catch (error) {
      if (error?.code === 'SQLITE_ERROR' || /no such table/i.test(error?.message ?? '')) {
        return [];
      }
      throw error;
    }
  }

  static async findLatest(connection = db) {
    const knexConnection = resolveConnection(connection);
    let query = getTableBuilder(knexConnection).select(BASE_COLUMNS);
    if (typeof query.orderBy === 'function') {
      query = query.orderBy('created_at', 'desc');
    }

    const row = await executeFirst(query);
    return row ? deserialize(row) : null;
  }
}
