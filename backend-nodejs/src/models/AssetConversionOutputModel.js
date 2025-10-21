import db from '../config/database.js';
import { safeJsonParse, safeJsonStringify } from '../utils/modelUtils.js';

const TABLE = 'asset_conversion_outputs';

const BASE_COLUMNS = [
  'id',
  'asset_id as assetId',
  'format',
  'storage_key as storageKey',
  'storage_bucket as storageBucket',
  'checksum',
  'size_bytes as sizeBytes',
  'metadata',
  'created_at as createdAt'
];

export default class AssetConversionOutputModel {
  static async upsert(assetId, format, data, connection = db) {
    const payload = {
      asset_id: assetId,
      format,
      storage_key: data.storageKey,
      storage_bucket: data.storageBucket,
      checksum: data.checksum ?? null,
      size_bytes: data.sizeBytes ?? null,
      metadata: safeJsonStringify(data.metadata)
    };

    const existing = await connection(TABLE).where({ asset_id: assetId, format }).first();
    if (existing) {
      await connection(TABLE)
        .where({ id: existing.id })
        .update({ ...payload, updated_at: connection.fn.now() });
      return this.findById(existing.id, connection);
    }

    const [id] = await connection(TABLE).insert(payload);
    return this.findById(id, connection);
  }

  static async findByAssetAndFormat(assetId, format, connection = db) {
    const row = await connection(TABLE).select(BASE_COLUMNS).where({ asset_id: assetId, format }).first();
    if (!row) return null;
    return this.deserialize(row);
  }

  static async findById(id, connection = db) {
    const row = await connection(TABLE).select(BASE_COLUMNS).where({ id }).first();
    if (!row) return null;
    return this.deserialize(row);
  }

  static async listByAsset(assetId, connection = db) {
    const rows = await connection(TABLE).select(BASE_COLUMNS).where({ asset_id: assetId }).orderBy('created_at', 'desc');
    return rows.map((row) => this.deserialize(row));
  }

  static deserialize(row) {
    return {
      ...row,
      metadata: safeJsonParse(row.metadata, {})
    };
  }
}
