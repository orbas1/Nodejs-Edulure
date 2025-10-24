import db from '../config/database.js';

const TABLE_NAME = 'user_passkeys';

function parseJson(value) {
  if (!value) return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (_error) {
    return null;
  }
}

function serialize(record) {
  if (!record) {
    return null;
  }
  return {
    id: record.id,
    userId: record.user_id,
    credentialId: record.credential_id,
    credentialPublicKey: record.credential_public_key,
    signatureCounter: Number(record.signature_counter ?? 0),
    friendlyName: record.friendly_name,
    credentialDeviceType: record.credential_device_type,
    credentialBackedUp: record.credential_backed_up === 1 || record.credential_backed_up === true,
    transports: parseJson(record.transports) ?? [],
    metadata: parseJson(record.metadata),
    lastUsedAt: record.last_used_at,
    revokedAt: record.revoked_at,
    createdAt: record.created_at,
    updatedAt: record.updated_at
  };
}

export default class UserPasskeyModel {
  static query(connection = db) {
    return connection(TABLE_NAME);
  }

  static async listForUser(userId, connection = db) {
    const rows = await this.query(connection)
      .clone()
      .select('*')
      .where({ user_id: userId })
      .whereNull('revoked_at');
    return rows.map(serialize);
  }

  static async findByCredentialId(credentialId, connection = db) {
    const row = await this.query(connection)
      .clone()
      .select('*')
      .where({ credential_id: credentialId })
      .whereNull('revoked_at')
      .first();
    return serialize(row);
  }

  static async create(payload, connection = db) {
    const insertPayload = {
      user_id: payload.userId,
      credential_id: payload.credentialId,
      credential_public_key: payload.credentialPublicKey,
      signature_counter: payload.signatureCounter ?? 0,
      friendly_name: payload.friendlyName ?? null,
      credential_device_type: payload.credentialDeviceType ?? null,
      credential_backed_up: payload.credentialBackedUp ? 1 : 0,
      transports: payload.transports ? JSON.stringify(payload.transports) : null,
      metadata: payload.metadata ? JSON.stringify(payload.metadata) : null,
      last_used_at: payload.lastUsedAt ?? null
    };

    const [id] = await this.query(connection).insert(insertPayload);
    return this.findById(id, connection);
  }

  static async findById(id, connection = db) {
    const row = await this.query(connection)
      .clone()
      .select('*')
      .where({ id })
      .first();
    return serialize(row);
  }

  static async updateCounter(id, counter, connection = db) {
    await this.query(connection)
      .clone()
      .where({ id })
      .update({ signature_counter: counter, last_used_at: connection.fn.now() });
    return this.findById(id, connection);
  }

  static async touchUsage(id, connection = db) {
    await this.query(connection)
      .clone()
      .where({ id })
      .update({ last_used_at: connection.fn.now() });
    return this.findById(id, connection);
  }

  static async revoke(id, reason = null, connection = db) {
    await this.query(connection)
      .clone()
      .where({ id })
      .update({ revoked_at: connection.fn.now(), metadata: JSON.stringify({ revokedReason: reason }) });
    return this.findById(id, connection);
  }
}
