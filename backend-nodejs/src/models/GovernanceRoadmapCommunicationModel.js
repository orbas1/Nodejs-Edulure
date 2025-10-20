import { randomUUID } from 'node:crypto';

import db from '../config/database.js';

const TABLE = 'governance_roadmap_communications';

const BASE_COLUMNS = [
  'id',
  'public_id as publicId',
  'slug',
  'audience',
  'channel',
  'subject',
  'body',
  'status',
  'schedule_at as scheduleAt',
  'sent_at as sentAt',
  'owner_email as ownerEmail',
  'metrics',
  'attachments',
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

function toDbPayload(communication) {
  return {
    public_id: communication.publicId ?? randomUUID(),
    slug: communication.slug,
    audience: communication.audience,
    channel: communication.channel ?? 'email',
    subject: communication.subject,
    body: communication.body,
    status: communication.status ?? 'draft',
    schedule_at: communication.scheduleAt ?? null,
    sent_at: communication.sentAt ?? null,
    owner_email: communication.ownerEmail,
    metrics: serialiseJson(communication.metrics ?? {}, {}),
    attachments: serialiseJson(communication.attachments ?? [], []),
    metadata: serialiseJson(communication.metadata ?? {}, {})
  };
}

function deserialize(row) {
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    publicId: row.publicId,
    slug: row.slug,
    audience: row.audience,
    channel: row.channel,
    subject: row.subject,
    body: row.body,
    status: row.status,
    scheduleAt: row.scheduleAt,
    sentAt: row.sentAt,
    ownerEmail: row.ownerEmail,
    metrics: parseJson(row.metrics, {}),
    attachments: parseJson(row.attachments, []),
    metadata: parseJson(row.metadata, {}),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

export default class GovernanceRoadmapCommunicationModel {
  static deserialize = deserialize;

  static async create(communication, connection = db) {
    const payload = toDbPayload(communication);
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
    if (updates.slug !== undefined) {
      payload.slug = updates.slug;
    }
    if (updates.audience !== undefined) {
      payload.audience = updates.audience;
    }
    if (updates.channel !== undefined) {
      payload.channel = updates.channel;
    }
    if (updates.subject !== undefined) {
      payload.subject = updates.subject;
    }
    if (updates.body !== undefined) {
      payload.body = updates.body;
    }
    if (updates.status !== undefined) {
      payload.status = updates.status;
    }
    if (updates.scheduleAt !== undefined) {
      payload.schedule_at = updates.scheduleAt || null;
    }
    if (updates.sentAt !== undefined) {
      payload.sent_at = updates.sentAt || null;
    }
    if (updates.ownerEmail !== undefined) {
      payload.owner_email = updates.ownerEmail;
    }
    if (updates.metrics !== undefined) {
      payload.metrics = serialiseJson(updates.metrics, {});
    }
    if (updates.attachments !== undefined) {
      payload.attachments = serialiseJson(updates.attachments, []);
    }
    if (updates.metadata !== undefined) {
      payload.metadata = serialiseJson(updates.metadata, {});
    }

    if (!Object.keys(payload).length) {
      return this.findByPublicId(publicId, connection);
    }

    await connection(TABLE).where({ public_id: publicId }).update({ ...payload, updated_at: connection.fn.now() });
    return this.findByPublicId(publicId, connection);
  }

  static applyFilters(query, filters = {}) {
    const builder = query.clone();
    if (filters.status) {
      const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
      builder.whereIn('status', statuses.map((status) => status.trim()).filter(Boolean));
    }
    if (filters.audience) {
      const audiences = Array.isArray(filters.audience) ? filters.audience : [filters.audience];
      builder.whereIn('audience', audiences.map((aud) => aud.trim()).filter(Boolean));
    }
    if (filters.channel) {
      const channels = Array.isArray(filters.channel) ? filters.channel : [filters.channel];
      builder.whereIn('channel', channels.map((channel) => channel.trim()).filter(Boolean));
    }
    if (filters.scheduledBefore) {
      builder.whereNotNull('schedule_at');
      builder.where('schedule_at', '<=', filters.scheduledBefore);
    }
    if (filters.ownerEmail) {
      builder.where('owner_email', filters.ownerEmail);
    }
    return builder;
  }

  static async list(filters = {}, pagination = {}, connection = db) {
    const limit = Math.max(1, Math.min(100, Number.parseInt(pagination.limit ?? '25', 10)));
    const offset = Math.max(0, Number.parseInt(pagination.offset ?? '0', 10));

    const baseQuery = this.applyFilters(
      connection(TABLE).select(BASE_COLUMNS).orderBy('schedule_at', 'asc'),
      filters
    );
    const rows = await baseQuery.clone().limit(limit).offset(offset);
    const countRow = await this.applyFilters(connection(TABLE).count({ count: '*' }), filters).first();

    return {
      total: extractCount(countRow),
      items: rows.map((row) => deserialize(row))
    };
  }

  static async getCommunicationSummary(connection = db) {
    const [totalRow, scheduledRow, sentRow, cancelledRow] = await Promise.all([
      connection(TABLE).count({ count: '*' }).first(),
      connection(TABLE).count({ count: '*' }).where({ status: 'scheduled' }).first(),
      connection(TABLE).count({ count: '*' }).where({ status: 'sent' }).first(),
      connection(TABLE).count({ count: '*' }).where({ status: 'cancelled' }).first()
    ]);

    return {
      totalCommunications: extractCount(totalRow),
      scheduledCommunications: extractCount(scheduledRow),
      sentCommunications: extractCount(sentRow),
      cancelledCommunications: extractCount(cancelledRow)
    };
  }
}
