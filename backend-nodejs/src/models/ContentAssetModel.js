import { randomUUID } from 'node:crypto';

import db from '../config/database.js';

const TABLE = 'content_assets';

const BASE_COLUMNS = [
  'id',
  'public_id as publicId',
  'type',
  'original_filename as originalFilename',
  'storage_key as storageKey',
  'storage_bucket as storageBucket',
  'converted_key as convertedKey',
  'converted_bucket as convertedBucket',
  'status',
  'visibility',
  'checksum',
  'size_bytes as sizeBytes',
  'mime_type as mimeType',
  'created_by as createdBy',
  'published_at as publishedAt',
  'metadata',
  'created_at as createdAt',
  'updated_at as updatedAt',
  'deleted_at as deletedAt'
];

function serialise(asset) {
  return {
    public_id: asset.publicId ?? asset.public_id ?? null,
    type: asset.type,
    original_filename: asset.originalFilename,
    storage_key: asset.storageKey,
    storage_bucket: asset.storageBucket,
    converted_key: asset.convertedKey ?? null,
    converted_bucket: asset.convertedBucket ?? null,
    status: asset.status ?? 'draft',
    visibility: asset.visibility ?? 'workspace',
    checksum: asset.checksum ?? null,
    size_bytes: asset.sizeBytes ?? null,
    mime_type: asset.mimeType ?? null,
    created_by: asset.createdBy ?? null,
    published_at: asset.publishedAt ?? null,
    metadata: JSON.stringify(asset.metadata ?? {})
  };
}

export default class ContentAssetModel {
  static async create(asset, connection = db) {
    const payload = serialise({
      ...asset,
      publicId: asset.publicId ?? randomUUID()
    });
    const [id] = await connection(TABLE).insert(payload);
    return this.findById(id, connection);
  }

  static async patchById(id, updates, connection = db) {
    const payload = {};
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.storageKey !== undefined) payload.storage_key = updates.storageKey ?? null;
    if (updates.storageBucket !== undefined) payload.storage_bucket = updates.storageBucket ?? null;
    if (updates.convertedKey !== undefined) payload.converted_key = updates.convertedKey ?? null;
    if (updates.convertedBucket !== undefined) payload.converted_bucket = updates.convertedBucket ?? null;
    if (updates.visibility !== undefined) payload.visibility = updates.visibility;
    if (updates.checksum !== undefined) payload.checksum = updates.checksum ?? null;
    if (updates.sizeBytes !== undefined) payload.size_bytes = updates.sizeBytes ?? null;
    if (updates.mimeType !== undefined) payload.mime_type = updates.mimeType ?? null;
    if (updates.publishedAt !== undefined) payload.published_at = updates.publishedAt;
    if (updates.metadata !== undefined) payload.metadata = JSON.stringify(updates.metadata ?? {});
    await connection(TABLE).where({ id }).update({ ...payload, updated_at: connection.fn.now() });
    return this.findById(id, connection);
  }

  static async markStatus(id, status, connection = db) {
    await connection(TABLE)
      .where({ id })
      .update({ status, updated_at: connection.fn.now() });
  }

  static async findById(id, connection = db) {
    const record = await connection(TABLE).select(BASE_COLUMNS).where({ id }).first();
    if (!record) return null;
    return this.deserialize(record);
  }

  static async findByPublicId(publicId, connection = db) {
    const record = await connection(TABLE).select(BASE_COLUMNS).where({ public_id: publicId }).first();
    if (!record) return null;
    return this.deserialize(record);
  }

  static async list({ createdBy, status, visibility, type, limit = 20, offset = 0 } = {}) {
    const query = db(TABLE).select(BASE_COLUMNS).orderBy('created_at', 'desc');
    if (createdBy) query.where({ created_by: createdBy });
    if (status) query.where({ status });
    if (visibility) query.where({ visibility });
    if (type) query.where({ type });
    query.limit(limit).offset(offset);
    const rows = await query;
    return rows.map((row) => this.deserialize(row));
  }

  static deserialize(row) {
    let metadata = row.metadata;
    if (typeof metadata === 'string') {
      try {
        metadata = JSON.parse(metadata || '{}');
      } catch (_error) {
        metadata = {};
      }
    }

    if (!metadata || typeof metadata !== 'object') {
      metadata = {};
    }

    return {
      ...row,
      metadata
    };
  }
}
