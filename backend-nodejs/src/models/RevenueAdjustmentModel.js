import { randomUUID } from 'node:crypto';

import db from '../config/database.js';

const TABLE = 'revenue_adjustments';

const BASE_COLUMNS = [
  'id',
  'public_id as publicId',
  'reference',
  'category',
  'status',
  'currency',
  'amount_cents as amountCents',
  'effective_at as effectiveAt',
  'notes',
  'metadata',
  'created_by as createdBy',
  'updated_by as updatedBy',
  'created_at as createdAt',
  'updated_at as updatedAt'
];

function parseJson(value) {
  if (!value) {
    return {};
  }
  if (typeof value === 'object') {
    return value;
  }
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (_error) {
    return {};
  }
}

function toDate(value) {
  if (!value) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toDbPayload(adjustment) {
  return {
    public_id: adjustment.publicId ?? randomUUID(),
    reference: adjustment.reference,
    category: adjustment.category ?? 'general',
    status: adjustment.status ?? 'scheduled',
    currency: adjustment.currency ?? 'USD',
    amount_cents: Number.isFinite(Number(adjustment.amountCents))
      ? Number(adjustment.amountCents)
      : 0,
    effective_at: adjustment.effectiveAt ?? null,
    notes: adjustment.notes ?? null,
    metadata: JSON.stringify(adjustment.metadata ?? {}),
    created_by: adjustment.createdBy ?? null,
    updated_by: adjustment.updatedBy ?? null
  };
}

function deserialize(row) {
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    publicId: row.publicId,
    reference: row.reference,
    category: row.category,
    status: row.status,
    currency: row.currency,
    amountCents: Number(row.amountCents ?? 0),
    effectiveAt: toDate(row.effectiveAt),
    notes: row.notes ?? null,
    metadata: parseJson(row.metadata),
    createdBy: row.createdBy ?? null,
    updatedBy: row.updatedBy ?? null,
    createdAt: toDate(row.createdAt),
    updatedAt: toDate(row.updatedAt)
  };
}

export default class RevenueAdjustmentModel {
  static deserialize(row) {
    return deserialize(row);
  }

  static async list({ search, status, category, limit = 25, offset = 0 } = {}, connection = db) {
    const query = connection(TABLE).select(BASE_COLUMNS).orderBy('effective_at', 'desc');

    if (status) {
      const statuses = Array.isArray(status) ? status : [status];
      query.whereIn('status', statuses);
    }

    if (category) {
      const categories = Array.isArray(category) ? category : [category];
      query.whereIn('category', categories);
    }

    if (search) {
      query.andWhere((builder) => {
        builder
          .whereILike('reference', `%${search}%`)
          .orWhereILike('notes', `%${search}%`);
      });
    }

    const rows = await query.limit(limit).offset(offset);
    return rows.map(deserialize);
  }

  static async count({ search, status, category } = {}, connection = db) {
    const query = connection(TABLE);

    if (status) {
      const statuses = Array.isArray(status) ? status : [status];
      query.whereIn('status', statuses);
    }

    if (category) {
      const categories = Array.isArray(category) ? category : [category];
      query.whereIn('category', categories);
    }

    if (search) {
      query.andWhere((builder) => {
        builder
          .whereILike('reference', `%${search}%`)
          .orWhereILike('notes', `%${search}%`);
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

  static async create(adjustment, connection = db) {
    const payload = toDbPayload(adjustment);
    const [id] = await connection(TABLE).insert(payload);
    return this.findById(id, connection);
  }

  static async updateById(id, updates, connection = db) {
    const payload = {};
    if (updates.reference !== undefined) payload.reference = updates.reference;
    if (updates.category !== undefined) payload.category = updates.category;
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.currency !== undefined) payload.currency = updates.currency;
    if (updates.amountCents !== undefined) payload.amount_cents = updates.amountCents;
    if (updates.effectiveAt !== undefined) payload.effective_at = updates.effectiveAt;
    if (updates.notes !== undefined) payload.notes = updates.notes;
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

  static async summariseWindow({ since, until } = {}, connection = db) {
    const query = connection(TABLE)
      .select({
        totalAmountCents: connection.raw('SUM(amount_cents)::bigint'),
        scheduledAmountCents: connection.raw(
          "SUM(CASE WHEN status = 'scheduled' THEN amount_cents ELSE 0 END)::bigint"
        ),
        approvedAmountCents: connection.raw(
          "SUM(CASE WHEN status = 'approved' THEN amount_cents ELSE 0 END)::bigint"
        ),
        settledAmountCents: connection.raw(
          "SUM(CASE WHEN status = 'settled' THEN amount_cents ELSE 0 END)::bigint"
        )
      });

    if (since) {
      query.where('effective_at', '>=', since);
    }
    if (until) {
      query.where('effective_at', '<=', until);
    }

    const result = await query.first();
    return {
      totalAmountCents: Number(result?.totalAmountCents ?? 0),
      scheduledAmountCents: Number(result?.scheduledAmountCents ?? 0),
      approvedAmountCents: Number(result?.approvedAmountCents ?? 0),
      settledAmountCents: Number(result?.settledAmountCents ?? 0)
    };
  }
}
