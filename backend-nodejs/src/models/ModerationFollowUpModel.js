import crypto from 'node:crypto';

import db from '../config/database.js';

function parseJson(value, fallback) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
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

function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    publicId: row.publicId,
    caseId: row.caseId,
    status: row.status,
    remindAt: row.remindAt ? new Date(row.remindAt).toISOString() : null,
    reason: row.reason ?? undefined,
    metadata: parseJson(row.metadata, {}),
    processedAt: row.processedAt ? new Date(row.processedAt).toISOString() : undefined,
    createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : undefined,
    updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : undefined
  };
}

export default class ModerationFollowUpModel {
  static table = 'community_post_moderation_followups';

  static async create(followUp, connection = db) {
    const payload = {
      public_id: followUp.publicId ?? crypto.randomUUID(),
      case_id: followUp.caseId,
      status: followUp.status ?? 'pending',
      remind_at: followUp.remindAt,
      reason: followUp.reason ?? null,
      metadata: serialiseJson(followUp.metadata ?? {}, {}),
      processed_at: followUp.processedAt ?? null
    };

    const [id] = await connection(this.table).insert(payload);
    return this.findById(id, connection);
  }

  static async findById(id, connection = db) {
    const row = await connection(this.table)
      .select({
        id: 'id',
        publicId: 'public_id',
        caseId: 'case_id',
        status: 'status',
        remindAt: 'remind_at',
        reason: 'reason',
        metadata: 'metadata',
        processedAt: 'processed_at',
        createdAt: 'created_at',
        updatedAt: 'updated_at'
      })
      .where({ id })
      .first();
    return mapRow(row);
  }

  static async listDue({ lookaheadMinutes = 5, limit = 50 } = {}, connection = db) {
    const now = new Date();
    const lookaheadTime = new Date(now.getTime() + Math.max(0, lookaheadMinutes) * 60_000);

    const rows = await connection(this.table)
      .select({
        id: 'id',
        publicId: 'public_id',
        caseId: 'case_id',
        status: 'status',
        remindAt: 'remind_at',
        reason: 'reason',
        metadata: 'metadata',
        processedAt: 'processed_at',
        createdAt: 'created_at',
        updatedAt: 'updated_at'
      })
      .where({ status: 'pending' })
      .where('remind_at', '<=', lookaheadTime)
      .andWhere('remind_at', '<=', now)
      .orderBy('remind_at', 'asc')
      .limit(limit);

    return rows.map((row) => mapRow(row));
  }

  static async markProcessing(ids, connection = db) {
    if (!Array.isArray(ids) || ids.length === 0) {
      return;
    }
    await connection(this.table)
      .whereIn('id', ids)
      .andWhere({ status: 'pending' })
      .update({ status: 'processing', updated_at: connection.fn.now() });
  }

  static async markOutcome(id, { status, processedAt, metadata } = {}, connection = db) {
    const updates = {};
    if (status) {
      updates.status = status;
    }
    if (processedAt !== undefined) {
      updates.processed_at = processedAt ?? null;
    }
    if (metadata !== undefined) {
      updates.metadata = serialiseJson(metadata ?? {}, {});
    }
    updates.updated_at = connection.fn.now();

    await connection(this.table).where({ id }).update(updates);
    return this.findById(id, connection);
  }
}
