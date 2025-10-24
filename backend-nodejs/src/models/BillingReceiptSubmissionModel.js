import { randomUUID } from 'node:crypto';

import db from '../config/database.js';

const TABLE = 'billing_receipt_submissions';

function parseJson(value, fallback = {}) {
  if (value === null || value === undefined) {
    return fallback;
  }
  if (typeof value === 'object') {
    return value;
  }
  if (typeof value !== 'string') {
    return fallback;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return fallback;
  }
  try {
    return JSON.parse(trimmed);
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
    platform: row.platform,
    productId: row.product_id,
    transactionId: row.transaction_id,
    purchaseToken: row.purchase_token,
    status: row.status,
    lastError: row.last_error,
    retryCount: Number(row.retry_count ?? 0),
    lastAttemptAt: row.last_attempt_at,
    validatedAt: row.validated_at,
    payload: parseJson(row.payload, {}),
    metadata: parseJson(row.metadata, {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function serialiseJson(value) {
  if (value === null || value === undefined) {
    return JSON.stringify({});
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return JSON.stringify({});
    }
    try {
      JSON.parse(trimmed);
      return trimmed;
    } catch (_error) {
      return JSON.stringify({});
    }
  }
  try {
    return JSON.stringify(value ?? {});
  } catch (_error) {
    return JSON.stringify({});
  }
}

export default class BillingReceiptSubmissionModel {
  static mapRow = mapRow;

  static async findByTransaction(transactionId, platform, connection = db) {
    if (!transactionId) {
      return null;
    }
    const row = await connection(TABLE)
      .where({
        transaction_id: transactionId,
        platform: platform ?? 'unknown'
      })
      .first();
    return mapRow(row);
  }

  static async create(payload, connection = db) {
    const insert = {
      public_id: payload.publicId ?? randomUUID(),
      user_id: payload.userId ?? null,
      platform: payload.platform ?? 'unknown',
      product_id: payload.productId,
      transaction_id: payload.transactionId,
      purchase_token: payload.purchaseToken,
      status: payload.status ?? 'pending',
      last_error: payload.lastError ?? null,
      retry_count: payload.retryCount ?? 0,
      last_attempt_at: payload.lastAttemptAt ?? new Date(),
      validated_at: payload.validatedAt ?? null,
      payload: serialiseJson(payload.payload),
      metadata: serialiseJson(payload.metadata)
    };

    const [inserted] = await connection(TABLE).insert(insert, ['id']);
    const id = typeof inserted === 'object' ? inserted.id : inserted;
    const row = await connection(TABLE).where({ id }).first();
    return mapRow(row);
  }

  static async updateById(id, updates, connection = db) {
    if (!id) {
      return null;
    }
    const payload = {};
    if (updates.status) {
      payload.status = updates.status;
    }
    if ('lastError' in updates) {
      payload.last_error = updates.lastError;
    }
    if (updates.retryCount !== undefined) {
      payload.retry_count = updates.retryCount;
    }
    if (updates.lastAttemptAt !== undefined) {
      payload.last_attempt_at = updates.lastAttemptAt;
    }
    if (updates.validatedAt !== undefined) {
      payload.validated_at = updates.validatedAt;
    }
    if (updates.purchaseToken !== undefined) {
      payload.purchase_token = updates.purchaseToken;
    }
    if (updates.payload !== undefined) {
      payload.payload = serialiseJson(updates.payload);
    }
    if (updates.metadata !== undefined) {
      payload.metadata = serialiseJson(updates.metadata);
    }

    if (Object.keys(payload).length === 0) {
      return this.findById(id, connection);
    }

    await connection(TABLE).where({ id }).update(payload);
    return this.findById(id, connection);
  }

  static async findById(id, connection = db) {
    if (!id) {
      return null;
    }
    const row = await connection(TABLE).where({ id }).first();
    return mapRow(row);
  }

  static async upsert(payload, connection = db) {
    const existing = await this.findByTransaction(payload.transactionId, payload.platform, connection);
    if (existing) {
      return this.updateById(existing.id, {
        purchaseToken: payload.purchaseToken,
        payload: payload.payload,
        metadata: payload.metadata,
        status: payload.status ?? existing.status,
        lastError: payload.lastError ?? null,
        retryCount: payload.resetRetries ? 0 : existing.retryCount,
        lastAttemptAt: payload.lastAttemptAt ?? new Date()
      }, connection);
    }
    return this.create(payload, connection);
  }
}

