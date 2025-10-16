import db from '../config/database.js';

function parseJson(value, fallback) {
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

function mapRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    provider: row.provider,
    environment: row.environment,
    alias: row.alias,
    ownerEmail: row.owner_email,
    lastFour: row.last_four,
    keyHash: row.key_hash,
    encryptedKey: row.encrypted_key,
    encryptionKeyId: row.encryption_key_id,
    classificationTag: row.classification_tag,
    rotationIntervalDays: row.rotation_interval_days,
    lastRotatedAt: row.last_rotated_at ? new Date(row.last_rotated_at) : null,
    nextRotationAt: row.next_rotation_at ? new Date(row.next_rotation_at) : null,
    expiresAt: row.expires_at ? new Date(row.expires_at) : null,
    disabledAt: row.disabled_at ? new Date(row.disabled_at) : null,
    status: row.status,
    metadata: parseJson(row.metadata, {}),
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: row.created_at ? new Date(row.created_at) : null,
    updatedAt: row.updated_at ? new Date(row.updated_at) : null
  };
}

export default class IntegrationApiKeyModel {
  static tableName = 'integration_api_keys';

  static mapRow(row) {
    return mapRow(row);
  }

  static query(connection = db) {
    return connection(this.tableName);
  }

  static async list({ provider, environment, status } = {}, connection = db) {
    const query = this.query(connection).orderBy('created_at', 'desc');

    if (provider) {
      query.where({ provider });
    }

    if (environment) {
      query.where({ environment });
    }

    if (status) {
      query.where({ status });
    }

    const rows = await query;
    return rows.map((row) => mapRow(row));
  }

  static async findById(id, connection = db) {
    const row = await this.query(connection).where({ id }).first();
    return mapRow(row);
  }

  static async findByAlias({ provider, environment, alias }, connection = db) {
    const row = await this.query(connection)
      .where({ provider, environment, alias })
      .first();
    return mapRow(row);
  }

  static async findByHash(keyHash, connection = db) {
    const row = await this.query(connection).where({ key_hash: keyHash }).first();
    return mapRow(row);
  }

  static async create(
    {
      provider,
      environment,
      alias,
      ownerEmail,
      lastFour,
      keyHash,
      encryptedKey,
      encryptionKeyId,
      classificationTag,
      rotationIntervalDays,
      lastRotatedAt,
      nextRotationAt,
      expiresAt,
      status,
      metadata,
      createdBy,
      updatedBy
    },
    connection = db
  ) {
    const insertPayload = {
      provider,
      environment,
      alias,
      owner_email: ownerEmail,
      last_four: lastFour,
      key_hash: keyHash,
      encrypted_key: encryptedKey,
      encryption_key_id: encryptionKeyId,
      classification_tag: classificationTag,
      rotation_interval_days: rotationIntervalDays,
      last_rotated_at: lastRotatedAt,
      next_rotation_at: nextRotationAt,
      expires_at: expiresAt,
      status,
      metadata: metadata ? JSON.stringify(metadata) : null,
      created_by: createdBy,
      updated_by: updatedBy ?? createdBy
    };

    const [id] = await this.query(connection).insert(insertPayload);
    return this.findById(id, connection);
  }

  static async updateById(
    id,
    {
      ownerEmail,
      alias,
      lastFour,
      keyHash,
      encryptedKey,
      encryptionKeyId,
      classificationTag,
      rotationIntervalDays,
      lastRotatedAt,
      nextRotationAt,
      expiresAt,
      disabledAt,
      status,
      metadata,
      updatedBy
    },
    connection = db
  ) {
    const updates = {
      updated_at: connection.fn.now()
    };

    if (ownerEmail !== undefined) updates.owner_email = ownerEmail;
    if (alias !== undefined) updates.alias = alias;
    if (lastFour !== undefined) updates.last_four = lastFour;
    if (keyHash !== undefined) updates.key_hash = keyHash;
    if (encryptedKey !== undefined) updates.encrypted_key = encryptedKey;
    if (encryptionKeyId !== undefined) updates.encryption_key_id = encryptionKeyId;
    if (classificationTag !== undefined) updates.classification_tag = classificationTag;
    if (rotationIntervalDays !== undefined) updates.rotation_interval_days = rotationIntervalDays;
    if (lastRotatedAt !== undefined) updates.last_rotated_at = lastRotatedAt;
    if (nextRotationAt !== undefined) updates.next_rotation_at = nextRotationAt;
    if (expiresAt !== undefined) updates.expires_at = expiresAt;
    if (disabledAt !== undefined) updates.disabled_at = disabledAt;
    if (status !== undefined) updates.status = status;
    if (metadata !== undefined) updates.metadata = metadata ? JSON.stringify(metadata) : null;
    if (updatedBy !== undefined) updates.updated_by = updatedBy;

    await this.query(connection).where({ id }).update(updates);
    return this.findById(id, connection);
  }
}
