import db from '../config/database.js';

const TABLE = 'provider_transition_announcements';

const BASE_COLUMNS = [
  'id',
  'slug',
  'title',
  'summary',
  'body_markdown as bodyMarkdown',
  'status',
  'effective_from as effectiveFrom',
  'effective_to as effectiveTo',
  'ack_required as ackRequired',
  'ack_deadline as ackDeadline',
  'owner_email as ownerEmail',
  'tenant_scope as tenantScope',
  'metadata',
  'created_at as createdAt',
  'updated_at as updatedAt'
];

export default class ProviderTransitionAnnouncementModel {
  static async listActive({ now = new Date(), tenantScope = 'global', connection = db } = {}) {
    const scopeValues = Array.isArray(tenantScope) ? tenantScope : [tenantScope];
    const rows = await connection(TABLE)
      .select(BASE_COLUMNS)
      .whereIn('tenant_scope', ['global', ...scopeValues])
      .where((builder) => {
        builder
          .where('status', 'active')
          .orWhere((query) => {
            query.where('status', 'scheduled').andWhere('effective_from', '<=', now);
          });
      })
      .andWhere((builder) => {
        builder.whereNull('effective_to').orWhere('effective_to', '>=', now);
      })
      .orderBy('effective_from', 'asc');

    return rows.map((row) => this.deserialize(row));
  }

  static async findBySlug(slug, { connection = db } = {}) {
    const row = await connection(TABLE).select(BASE_COLUMNS).where({ slug }).first();
    return row ? this.deserialize(row) : null;
  }

  static async upsert(payload, { connection = db } = {}) {
    const now = new Date();
    const insertPayload = this.serialize(payload);
    insertPayload.updated_at = now;
    if (!insertPayload.created_at) {
      insertPayload.created_at = now;
    }

    const existing = await connection(TABLE).where({ slug: payload.slug }).first();
    if (existing) {
      await connection(TABLE).where({ id: existing.id }).update(insertPayload);
      return this.findBySlug(payload.slug, { connection });
    }

    const [id] = await connection(TABLE).insert(insertPayload);
    return this.findById(id, { connection });
  }

  static async findById(id, { connection = db } = {}) {
    const row = await connection(TABLE).select(BASE_COLUMNS).where({ id }).first();
    return row ? this.deserialize(row) : null;
  }

  static serialize(payload = {}) {
    const normalizeDate = (value, { fallback = null, allowNull = true } = {}) => {
      if (value instanceof Date) {
        return value;
      }
      if (typeof value === 'string' || typeof value === 'number') {
        const parsed = new Date(value);
        if (!Number.isNaN(parsed.getTime())) {
          return parsed;
        }
      }
      if (allowNull) {
        return fallback;
      }
      return fallback ?? new Date();
    };

    return {
      slug: payload.slug,
      title: payload.title,
      summary: payload.summary,
      body_markdown: payload.bodyMarkdown,
      status: payload.status,
      effective_from: normalizeDate(payload.effectiveFrom, { fallback: new Date(), allowNull: false }),
      effective_to: normalizeDate(payload.effectiveTo),
      ack_required: payload.ackRequired !== false,
      ack_deadline: normalizeDate(payload.ackDeadline),
      owner_email: payload.ownerEmail ?? null,
      tenant_scope: payload.tenantScope ?? 'global',
      metadata: (() => {
        if (payload.metadata && typeof payload.metadata === 'object') {
          return JSON.stringify(payload.metadata);
        }
        if (typeof payload.metadata === 'string') {
          try {
            JSON.parse(payload.metadata);
            return payload.metadata;
          } catch (error) {
            return JSON.stringify({});
          }
        }
        return JSON.stringify({});
      })(),
      created_at: payload.createdAt ?? null,
      updated_at: payload.updatedAt ?? null
    };
  }

  static deserialize(row) {
    if (!row) return null;
    let metadata = row.metadata;
    if (typeof metadata === 'string') {
      try {
        metadata = JSON.parse(metadata);
      } catch (error) {
        metadata = {};
      }
    } else if (!metadata || typeof metadata !== 'object') {
      metadata = {};
    }

    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      summary: row.summary,
      bodyMarkdown: row.bodyMarkdown,
      status: row.status,
      effectiveFrom: row.effectiveFrom ? new Date(row.effectiveFrom) : null,
      effectiveTo: row.effectiveTo ? new Date(row.effectiveTo) : null,
      ackRequired: row.ackRequired === undefined ? true : !!row.ackRequired,
      ackDeadline: row.ackDeadline ? new Date(row.ackDeadline) : null,
      ownerEmail: row.ownerEmail ?? null,
      tenantScope: row.tenantScope ?? 'global',
      metadata,
      createdAt: row.createdAt ? new Date(row.createdAt) : null,
      updatedAt: row.updatedAt ? new Date(row.updatedAt) : null
    };
  }
}
