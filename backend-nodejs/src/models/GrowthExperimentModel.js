import { randomUUID } from 'node:crypto';

import db from '../config/database.js';

const TABLE = 'growth_experiments';

const BASE_COLUMNS = [
  'id',
  'public_id as publicId',
  'name',
  'status',
  'owner_id as ownerId',
  'owner_email as ownerEmail',
  'hypothesis',
  'primary_metric as primaryMetric',
  'baseline_value as baselineValue',
  'target_value as targetValue',
  'start_at as startAt',
  'end_at as endAt',
  'segments',
  'metadata',
  'created_by as createdBy',
  'updated_by as updatedBy',
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
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : fallback;
  } catch (_error) {
    return fallback;
  }
}

function toDate(value) {
  if (!value) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toDbPayload(experiment) {
  return {
    public_id: experiment.publicId ?? randomUUID(),
    name: experiment.name,
    status: experiment.status ?? 'draft',
    owner_id: experiment.ownerId ?? null,
    owner_email: experiment.ownerEmail ?? null,
    hypothesis: experiment.hypothesis ?? null,
    primary_metric: experiment.primaryMetric ?? null,
    baseline_value: experiment.baselineValue ?? null,
    target_value: experiment.targetValue ?? null,
    start_at: experiment.startAt ?? null,
    end_at: experiment.endAt ?? null,
    segments: JSON.stringify(experiment.segments ?? []),
    metadata: JSON.stringify(experiment.metadata ?? {}),
    created_by: experiment.createdBy ?? null
  };
}

function deserialize(row) {
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    publicId: row.publicId,
    name: row.name,
    status: row.status,
    ownerId: row.ownerId,
    ownerEmail: row.ownerEmail,
    hypothesis: row.hypothesis ?? null,
    primaryMetric: row.primaryMetric ?? null,
    baselineValue: row.baselineValue !== null ? Number(row.baselineValue) : null,
    targetValue: row.targetValue !== null ? Number(row.targetValue) : null,
    startAt: toDate(row.startAt),
    endAt: toDate(row.endAt),
    segments: parseJson(row.segments, []),
    metadata: parseJson(row.metadata, {}),
    createdBy: row.createdBy ?? null,
    updatedBy: row.updatedBy ?? null,
    createdAt: toDate(row.createdAt),
    updatedAt: toDate(row.updatedAt)
  };
}

export default class GrowthExperimentModel {
  static deserialize(row) {
    return deserialize(row);
  }

  static async list({ search, status, limit = 25, offset = 0 } = {}, connection = db) {
    const query = connection(TABLE).select(BASE_COLUMNS).orderBy('updated_at', 'desc');

    if (status) {
      const statuses = Array.isArray(status) ? status : [status];
      query.whereIn('status', statuses);
    }

    if (search) {
      query.andWhere((builder) => {
        builder
          .whereILike('name', `%${search}%`)
          .orWhereILike('hypothesis', `%${search}%`)
          .orWhereILike('primary_metric', `%${search}%`);
      });
    }

    const rows = await query.limit(limit).offset(offset);
    return rows.map(deserialize);
  }

  static async count({ search, status } = {}, connection = db) {
    const query = connection(TABLE);

    if (status) {
      const statuses = Array.isArray(status) ? status : [status];
      query.whereIn('status', statuses);
    }

    if (search) {
      query.andWhere((builder) => {
        builder
          .whereILike('name', `%${search}%`)
          .orWhereILike('hypothesis', `%${search}%`)
          .orWhereILike('primary_metric', `%${search}%`);
      });
    }

    const result = await query.count({ total: '*' }).first();
    return Number(result?.total ?? 0);
  }

  static async findById(id, connection = db) {
    const row = await connection(TABLE).select(BASE_COLUMNS).where({ id }).first();
    return deserialize(row);
  }

  static async findByPublicId(publicId, connection = db) {
    const row = await connection(TABLE).select(BASE_COLUMNS).where({ public_id: publicId }).first();
    return deserialize(row);
  }

  static async create(experiment, connection = db) {
    const payload = toDbPayload(experiment);
    const [id] = await connection(TABLE).insert(payload);
    return this.findById(id, connection);
  }

  static async updateById(id, updates, connection = db) {
    const payload = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.ownerId !== undefined) payload.owner_id = updates.ownerId;
    if (updates.ownerEmail !== undefined) payload.owner_email = updates.ownerEmail;
    if (updates.hypothesis !== undefined) payload.hypothesis = updates.hypothesis;
    if (updates.primaryMetric !== undefined) payload.primary_metric = updates.primaryMetric;
    if (updates.baselineValue !== undefined) payload.baseline_value = updates.baselineValue;
    if (updates.targetValue !== undefined) payload.target_value = updates.targetValue;
    if (updates.startAt !== undefined) payload.start_at = updates.startAt;
    if (updates.endAt !== undefined) payload.end_at = updates.endAt;
    if (updates.segments !== undefined) payload.segments = JSON.stringify(updates.segments ?? []);
    if (updates.metadata !== undefined) payload.metadata = JSON.stringify(updates.metadata ?? {});
    if (updates.updatedBy !== undefined) payload.updated_by = updates.updatedBy;

    if (Object.keys(payload).length === 0) {
      return this.findById(id, connection);
    }

    await connection(TABLE)
      .where({ id })
      .update({ ...payload, updated_at: connection.fn.now() });

    return this.findById(id, connection);
  }

  static async deleteById(id, connection = db) {
    await connection(TABLE).where({ id }).del();
  }

  static async countByStatus(connection = db) {
    const rows = await connection(TABLE)
      .select({ status: 'status' })
      .count({ total: '*' })
      .groupBy('status');
    return rows.reduce((acc, row) => {
      acc[row.status] = Number(row.total ?? 0);
      return acc;
    }, {});
  }
}
