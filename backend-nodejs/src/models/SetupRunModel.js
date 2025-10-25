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

function getTableQuery(connection = db) {
  if (!connection) {
    throw new TypeError('A database connection instance is required');
  }

  if (typeof connection === 'function') {
    return connection(TABLE);
  }

  if (typeof connection.table === 'function') {
    return connection.table(TABLE);
  }

  if (typeof connection.from === 'function') {
    return connection.from(TABLE);
  }

  if (typeof connection.clone === 'function' && typeof connection.select === 'function') {
    return connection.clone();
  }

  if (typeof connection.select === 'function') {
    return connection;
  }

  throw new TypeError('Invalid database connection provided to SetupRunModel');
}

function isMissingTableError(error) {
  if (!error) {
    return false;
  }

  if (error.code === 'SQLITE_ERROR' && /no such table/i.test(error.message ?? '')) {
    return true;
  }

  if (error.code === 'ER_NO_SUCH_TABLE' || error.errno === 1146) {
    return true;
  }

  return false;
}

function isConnectionInvocationError(error) {
  return error instanceof TypeError && /is not a function/i.test(error?.message ?? '');
}

function resolveNow(connection) {
  const nowFn = connection?.fn?.now ?? db.fn?.now;
  if (typeof nowFn === 'function') {
    return nowFn.call(connection?.fn ?? db.fn);
  }

  return new Date().toISOString();
}

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

export default class SetupRunModel {
  static deserialize = deserialize;

  static async create(run, connection = db) {
    const payload = toDbPayload(run);
    if (!payload.started_at) {
      payload.started_at = resolveNow(connection);
    }

    const [id] = await getTableQuery(connection).insert(payload);
    return this.findById(id, connection);
  }

  static async findById(id, connection = db) {
    const row = await getTableQuery(connection).select(BASE_COLUMNS).where({ id }).first();
    return row ? deserialize(row) : null;
  }

  static async findByPublicId(publicId, connection = db) {
    const row = await getTableQuery(connection).select(BASE_COLUMNS).where({ public_id: publicId }).first();
    return row ? deserialize(row) : null;
  }

  static async updateByPublicId(publicId, updates, connection = db) {
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
      return this.findByPublicId(publicId, connection);
    }

    await getTableQuery(connection)
      .where({ public_id: publicId })
      .update({ ...payload, updated_at: resolveNow(connection) });

    return this.findByPublicId(publicId, connection);
  }

  static async listRecent(limit = 10, connection = db) {
    try {
      const rows = await getTableQuery(connection)
        .select(BASE_COLUMNS)
        .orderBy('created_at', 'desc')
        .limit(Math.max(1, Math.min(50, Number(limit) || 10)));
      return rows.map(deserialize);
    } catch (error) {
      if (isMissingTableError(error) || isConnectionInvocationError(error)) {
        return [];
      }
      throw error;
    }
  }

  static async findLatest(connection = db) {
    const row = await getTableQuery(connection).select(BASE_COLUMNS).orderBy('created_at', 'desc').first();
    return row ? deserialize(row) : null;
  }
}
