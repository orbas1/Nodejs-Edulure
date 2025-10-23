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

export default class SetupRunModel {
  static deserialize = deserialize;

  static async create(run, connection = db) {
    const payload = toDbPayload(run);
    if (!payload.started_at) {
      payload.started_at = connection.fn.now();
    }

    const [id] = await connection(TABLE).insert(payload);
    return this.findById(id, connection);
  }

  static async findById(id, connection = db) {
    const row = await connection(TABLE).select(BASE_COLUMNS).where({ id }).first();
    return row ? deserialize(row) : null;
  }

  static async findByPublicId(publicId, connection = db) {
    const row = await connection(TABLE).select(BASE_COLUMNS).where({ public_id: publicId }).first();
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

    await connection(TABLE)
      .where({ public_id: publicId })
      .update({ ...payload, updated_at: connection.fn.now() });

    return this.findByPublicId(publicId, connection);
  }

  static async listRecent(limit = 10, connection = db) {
    const rows = await connection(TABLE)
      .select(BASE_COLUMNS)
      .orderBy('created_at', 'desc')
      .limit(Math.max(1, Math.min(50, Number(limit) || 10)));
    return rows.map(deserialize);
  }

  static async findLatest(connection = db) {
    const row = await connection(TABLE).select(BASE_COLUMNS).orderBy('created_at', 'desc').first();
    return row ? deserialize(row) : null;
  }
}
