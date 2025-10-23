import { randomUUID } from 'node:crypto';

import db from '../config/database.js';

const TABLE = 'payment_checkout_sessions';

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

function mapRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    publicId: row.public_id,
    userId: row.user_id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    currency: row.currency,
    primaryItem: parseJson(row.primary_item, {}),
    addonItems: parseJson(row.addon_items, []),
    upsellDescriptors: parseJson(row.upsell_descriptors, []),
    context: parseJson(row.context, {}),
    metadata: parseJson(row.metadata, {}),
    subtotalCents: Number(row.subtotal_cents ?? 0),
    requiredTotalCents: Number(row.required_total_cents ?? 0),
    optionalTotalCents: Number(row.optional_total_cents ?? 0),
    status: row.status,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function toDbPayload(session, connection) {
  return {
    public_id: session.publicId ?? `chk_${randomUUID()}`,
    user_id: session.userId ?? null,
    entity_type: session.entityType,
    entity_id: session.entityId,
    currency: (session.currency ?? 'USD').toUpperCase(),
    primary_item: JSON.stringify(session.primaryItem ?? {}),
    addon_items: JSON.stringify(session.addonItems ?? []),
    upsell_descriptors: JSON.stringify(session.upsellDescriptors ?? []),
    context: JSON.stringify(session.context ?? {}),
    metadata: JSON.stringify(session.metadata ?? {}),
    subtotal_cents: Number.isFinite(session.subtotalCents) ? Math.trunc(session.subtotalCents) : 0,
    required_total_cents: Number.isFinite(session.requiredTotalCents)
      ? Math.trunc(session.requiredTotalCents)
      : 0,
    optional_total_cents: Number.isFinite(session.optionalTotalCents)
      ? Math.trunc(session.optionalTotalCents)
      : 0,
    status: session.status ?? 'pending',
    expires_at: session.expiresAt ?? null,
    created_at: session.createdAt ?? connection.fn.now(),
    updated_at: session.updatedAt ?? connection.fn.now()
  };
}

export default class PaymentCheckoutSessionModel {
  static async create(session, connection = db) {
    if (!session?.entityType || !session?.entityId) {
      throw new Error('entityType and entityId are required to persist a checkout session');
    }

    const payload = toDbPayload(session, connection);
    const [id] = await connection(TABLE).insert(payload);
    const row = await connection(TABLE).where({ id }).first();
    return mapRow(row);
  }

  static async findByPublicId(publicId, connection = db) {
    if (!publicId) {
      return null;
    }
    const row = await connection(TABLE).where({ public_id: publicId }).first();
    return mapRow(row);
  }

  static async updateStatus(publicId, status, connection = db) {
    if (!publicId) {
      throw new Error('publicId is required to update a checkout session');
    }
    await connection(TABLE)
      .where({ public_id: publicId })
      .update({ status, updated_at: connection.fn.now() });
    return this.findByPublicId(publicId, connection);
  }
}
