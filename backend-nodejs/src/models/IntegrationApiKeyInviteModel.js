import crypto from 'crypto';

import db from '../config/database.js';

const TABLE_NAME = 'integration_api_key_invites';

function safeParseJson(value, fallback = {}) {
  if (value === undefined || value === null) {
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

function serialiseMetadata(metadata) {
  if (metadata === undefined || metadata === null) {
    return null;
  }

  try {
    return JSON.stringify(metadata);
  } catch (_error) {
    return JSON.stringify({});
  }
}

function mapRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    provider: row.provider,
    environment: row.environment,
    alias: row.alias,
    apiKeyId: row.api_key_id ?? null,
    ownerEmail: row.owner_email,
    requestedBy: row.requested_by,
    requestedAt: row.requested_at ? new Date(row.requested_at) : null,
    expiresAt: row.expires_at ? new Date(row.expires_at) : null,
    status: row.status,
    tokenHash: row.token_hash,
    rotationIntervalDays:
      row.rotation_interval_days !== undefined && row.rotation_interval_days !== null
        ? Number(row.rotation_interval_days)
        : null,
    keyExpiresAt: row.key_expires_at ? new Date(row.key_expires_at) : null,
    completedAt: row.completed_at ? new Date(row.completed_at) : null,
    completedBy: row.completed_by ?? null,
    cancelledAt: row.cancelled_at ? new Date(row.cancelled_at) : null,
    cancelledBy: row.cancelled_by ?? null,
    lastSentAt: row.last_sent_at ? new Date(row.last_sent_at) : null,
    sendCount: row.send_count !== undefined && row.send_count !== null ? Number(row.send_count) : 0,
    metadata: safeParseJson(row.metadata, {}),
    createdAt: row.created_at ? new Date(row.created_at) : null,
    updatedAt: row.updated_at ? new Date(row.updated_at) : null
  };
}

function query(connection = db) {
  return connection(TABLE_NAME);
}

function hashToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

export default class IntegrationApiKeyInviteModel {
  static mapRow = mapRow;

  static hashToken = hashToken;

  static async create(payload, connection = db) {
    const insertPayload = {
      provider: payload.provider,
      environment: payload.environment,
      alias: payload.alias,
      api_key_id: payload.apiKeyId ?? null,
      owner_email: payload.ownerEmail,
      requested_by: payload.requestedBy,
      requested_at: payload.requestedAt ?? connection.fn.now(),
      expires_at: payload.expiresAt ?? null,
      status: payload.status ?? 'pending',
      token_hash: payload.tokenHash,
      rotation_interval_days: payload.rotationIntervalDays ?? null,
      key_expires_at: payload.keyExpiresAt ?? null,
      metadata: serialiseMetadata(payload.metadata),
      last_sent_at: payload.lastSentAt ?? connection.fn.now(),
      send_count: payload.sendCount ?? 1
    };

    if (payload.id !== undefined && payload.id !== null) {
      insertPayload.id = payload.id;
    }

    const rows = await query(connection).insert(insertPayload).returning('*');

    let row = null;
    if (Array.isArray(rows) && rows.length > 0) {
      row = rows[0];
    } else if (rows && typeof rows === 'object') {
      row = rows;
    } else {
      const identifier = insertPayload.id ?? (Array.isArray(rows) ? undefined : rows);
      const builder = query(connection);
      if (identifier !== undefined && identifier !== null) {
        row = await builder.where({ id: identifier }).first();
      } else {
        row = await builder.where({ token_hash: insertPayload.token_hash }).orderBy('created_at', 'desc').first();
      }
    }

    return mapRow(row);
  }

  static async findById(id, connection = db) {
    const row = await query(connection).where({ id }).first();
    return mapRow(row);
  }

  static async findActiveByTokenHash(tokenHash, connection = db) {
    const row = await query(connection)
      .where({ token_hash: tokenHash })
      .whereNull('completed_at')
      .whereNull('cancelled_at')
      .where('status', '=', 'pending')
      .andWhere('expires_at', '>', connection.fn.now())
      .first();

    return mapRow(row);
  }

  static async findPendingForAlias({ provider, environment, alias }, connection = db) {
    const row = await query(connection)
      .where({ provider, environment, alias })
      .whereNull('completed_at')
      .whereNull('cancelled_at')
      .where('status', '=', 'pending')
      .first();

    return mapRow(row);
  }

  static async listPendingForAlias({ provider, environment, alias }, connection = db) {
    const rows = await query(connection)
      .where({ provider, environment, alias })
      .whereNull('completed_at')
      .whereNull('cancelled_at')
      .where('status', '=', 'pending')
      .orderBy('requested_at', 'asc')
      .orderBy('created_at', 'asc');

    return rows.map((row) => mapRow(row));
  }

  static async list(filters = {}, connection = db) {
    const builder = query(connection).orderBy('requested_at', 'desc');

    if (filters.provider) {
      builder.where({ provider: filters.provider });
    }

    if (filters.environment) {
      builder.where({ environment: filters.environment });
    }

    if (filters.status) {
      builder.where({ status: filters.status });
    }

    if (filters.ownerEmail) {
      builder.where({ owner_email: filters.ownerEmail });
    }

    const rows = await builder;
    return rows.map((row) => mapRow(row));
  }

  static async updateById(id, updates, connection = db) {
    const payload = { updated_at: connection.fn.now() };

    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.tokenHash !== undefined) payload.token_hash = updates.tokenHash;
    if (updates.expiresAt !== undefined) payload.expires_at = updates.expiresAt;
    if (updates.apiKeyId !== undefined) payload.api_key_id = updates.apiKeyId;
    if (updates.completedAt !== undefined) payload.completed_at = updates.completedAt;
    if (updates.completedBy !== undefined) payload.completed_by = updates.completedBy;
    if (updates.cancelledAt !== undefined) payload.cancelled_at = updates.cancelledAt;
    if (updates.cancelledBy !== undefined) payload.cancelled_by = updates.cancelledBy;
    if (updates.lastSentAt !== undefined) payload.last_sent_at = updates.lastSentAt;
    if (updates.sendCount !== undefined) payload.send_count = updates.sendCount;
    if (updates.rotationIntervalDays !== undefined) {
      payload.rotation_interval_days = updates.rotationIntervalDays ?? null;
    }
    if (updates.keyExpiresAt !== undefined) {
      payload.key_expires_at = updates.keyExpiresAt ?? null;
    }
    if (updates.metadata !== undefined) {
      payload.metadata = serialiseMetadata(updates.metadata);
    }

    await query(connection).where({ id }).update(payload);
    return this.findById(id, connection);
  }
}

export { hashToken };
