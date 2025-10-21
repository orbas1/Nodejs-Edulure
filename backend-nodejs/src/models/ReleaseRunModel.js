import { randomUUID } from 'node:crypto';

import db from '../config/database.js';

const TABLE = 'release_runs';

const BASE_COLUMNS = [
  'id',
  'public_id as publicId',
  'version_tag as versionTag',
  'environment',
  'status',
  'initiated_by_email as initiatedByEmail',
  'initiated_by_name as initiatedByName',
  'scheduled_at as scheduledAt',
  'started_at as startedAt',
  'completed_at as completedAt',
  'change_window_start as changeWindowStart',
  'change_window_end as changeWindowEnd',
  'summary_notes as summaryNotes',
  'checklist_snapshot as checklistSnapshot',
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

function extractCount(row) {
  if (!row) {
    return 0;
  }

  const value =
    row.count ??
    row['count(*)'] ??
    row['COUNT(*)'] ??
    row['count(`*`)'] ??
    Object.values(row)[0];

  return Number(value ?? 0);
}

function deserialize(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    publicId: row.publicId,
    versionTag: row.versionTag,
    environment: row.environment,
    status: row.status,
    initiatedByEmail: row.initiatedByEmail,
    initiatedByName: row.initiatedByName,
    scheduledAt: row.scheduledAt,
    startedAt: row.startedAt,
    completedAt: row.completedAt,
    changeWindowStart: row.changeWindowStart,
    changeWindowEnd: row.changeWindowEnd,
    summaryNotes: row.summaryNotes,
    checklistSnapshot: parseJson(row.checklistSnapshot, []),
    metadata: parseJson(row.metadata, {}),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

function toDbPayload(run) {
  return {
    public_id: run.publicId ?? randomUUID(),
    version_tag: run.versionTag,
    environment: run.environment,
    status: run.status ?? 'scheduled',
    initiated_by_email: run.initiatedByEmail,
    initiated_by_name: run.initiatedByName ?? null,
    scheduled_at: run.scheduledAt ?? null,
    started_at: run.startedAt ?? null,
    completed_at: run.completedAt ?? null,
    change_window_start: run.changeWindowStart ?? null,
    change_window_end: run.changeWindowEnd ?? null,
    summary_notes: run.summaryNotes ?? null,
    checklist_snapshot: serialiseJson(run.checklistSnapshot ?? [], []),
    metadata: serialiseJson(run.metadata ?? {}, {})
  };
}

export default class ReleaseRunModel {
  static deserialize = deserialize;

  static async create(run, connection = db) {
    const payload = toDbPayload(run);
    if (!payload.scheduled_at) {
      payload.scheduled_at = connection.fn.now();
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
    if (updates.versionTag !== undefined) {
      payload.version_tag = updates.versionTag;
    }
    if (updates.environment !== undefined) {
      payload.environment = updates.environment;
    }
    if (updates.status !== undefined) {
      payload.status = updates.status;
    }
    if (updates.initiatedByEmail !== undefined) {
      payload.initiated_by_email = updates.initiatedByEmail;
    }
    if (updates.initiatedByName !== undefined) {
      payload.initiated_by_name = updates.initiatedByName ?? null;
    }
    if (updates.scheduledAt !== undefined) {
      payload.scheduled_at = updates.scheduledAt ?? null;
    }
    if (updates.startedAt !== undefined) {
      payload.started_at = updates.startedAt ?? null;
    }
    if (updates.completedAt !== undefined) {
      payload.completed_at = updates.completedAt ?? null;
    }
    if (updates.changeWindowStart !== undefined) {
      payload.change_window_start = updates.changeWindowStart ?? null;
    }
    if (updates.changeWindowEnd !== undefined) {
      payload.change_window_end = updates.changeWindowEnd ?? null;
    }
    if (updates.summaryNotes !== undefined) {
      payload.summary_notes = updates.summaryNotes ?? null;
    }
    if (updates.checklistSnapshot !== undefined) {
      payload.checklist_snapshot = serialiseJson(updates.checklistSnapshot, []);
    }
    if (updates.metadata !== undefined) {
      payload.metadata = serialiseJson(updates.metadata, {});
    }

    if (!Object.keys(payload).length) {
      return this.findByPublicId(publicId, connection);
    }

    await connection(TABLE)
      .where({ public_id: publicId })
      .update({ ...payload, updated_at: connection.fn.now() });

    return this.findByPublicId(publicId, connection);
  }

  static async list(filters = {}, pagination = {}, connection = db) {
    const { environment, status, versionTag } = filters;
    const limit = Math.max(1, Math.min(200, Number.parseInt(pagination.limit ?? 25, 10)));
    const offset = Math.max(0, Number.parseInt(pagination.offset ?? 0, 10));

    const query = connection(TABLE).select(BASE_COLUMNS);
    const countQuery = connection(TABLE).count({ count: '*' });

    if (environment) {
      const environments = Array.isArray(environment) ? environment : [environment];
      query.whereIn('environment', environments);
      countQuery.whereIn('environment', environments);
    }

    if (status) {
      const statuses = Array.isArray(status) ? status : [status];
      query.whereIn('status', statuses);
      countQuery.whereIn('status', statuses);
    }

    if (versionTag) {
      query.where('version_tag', 'like', `${versionTag}%`);
      countQuery.where('version_tag', 'like', `${versionTag}%`);
    }

    const rows = await query
      .orderBy([
        { column: 'scheduled_at', order: 'desc' },
        { column: 'id', order: 'desc' }
      ])
      .limit(limit)
      .offset(offset);

    const countRow = await countQuery.first();

    return {
      total: extractCount(countRow),
      limit,
      offset,
      items: rows.map(deserialize)
    };
  }

  static async getStatusBreakdown(connection = db) {
    const rows = await connection(TABLE)
      .select('status')
      .count({ count: '*' })
      .groupBy('status');

    const breakdown = {};
    for (const row of rows) {
      breakdown[row.status] = extractCount(row);
    }

    return breakdown;
  }
}
