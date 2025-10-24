import db from '../config/database.js';

const TABLE = 'lesson_download_assets';

const BASE_COLUMNS = [
  'asset.id',
  'asset.manifest_id as manifestId',
  'asset.asset_type as assetType',
  'asset.label',
  'asset.asset_url as assetUrl',
  'asset.checksum_sha256 as checksumSha256',
  'asset.size_bytes as sizeBytes',
  'asset.metadata',
  'asset.created_at as createdAt',
  'asset.updated_at as updatedAt'
];

function parseJson(value) {
  if (!value) {
    return {};
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (_error) {
      return {};
    }
  }
  if (typeof value === 'object' && value !== null) {
    return { ...value };
  }
  return {};
}

function toDate(value) {
  if (!value) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toNumber(value) {
  if (value === null || value === undefined) {
    return 0;
  }
  const num = typeof value === 'string' ? Number(value) : value;
  return Number.isFinite(num) ? Number(num) : 0;
}

function deserialize(row) {
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    manifestId: row.manifestId,
    assetType: row.assetType,
    label: row.label ?? null,
    assetUrl: row.assetUrl,
    checksumSha256: row.checksumSha256 ?? null,
    sizeBytes: toNumber(row.sizeBytes),
    metadata: parseJson(row.metadata),
    createdAt: toDate(row.createdAt),
    updatedAt: toDate(row.updatedAt)
  };
}

export default class LessonDownloadAssetModel {
  static async listByManifestIds(manifestIds, connection = db) {
    if (!manifestIds?.length) {
      return [];
    }
    const rows = await connection(`${TABLE} as asset`)
      .select(BASE_COLUMNS)
      .whereIn('asset.manifest_id', manifestIds)
      .orderBy('asset.manifest_id', 'asc')
      .orderBy('asset.id', 'asc');
    return rows.map(deserialize).filter(Boolean);
  }

  static async listByManifestId(manifestId, connection = db) {
    if (!manifestId) {
      return [];
    }
    const rows = await connection(`${TABLE} as asset`)
      .select(BASE_COLUMNS)
      .where('asset.manifest_id', manifestId)
      .orderBy('asset.id', 'asc');
    return rows.map(deserialize).filter(Boolean);
  }

  static async create(asset, connection = db) {
    const payload = {
      manifest_id: asset.manifestId,
      asset_type: asset.assetType ?? 'generic',
      label: asset.label ?? null,
      asset_url: asset.assetUrl,
      checksum_sha256: asset.checksumSha256 ?? null,
      size_bytes: toNumber(asset.sizeBytes ?? 0),
      metadata: JSON.stringify(asset.metadata ?? {})
    };
    const [id] = await connection(TABLE).insert(payload);
    const row = await connection(`${TABLE} as asset`)
      .select(BASE_COLUMNS)
      .where('asset.id', id)
      .first();
    return deserialize(row);
  }

  static async replaceForManifest(manifestId, assets = [], connection = db) {
    if (!manifestId) {
      return [];
    }
    return connection.transaction(async (trx) => {
      await trx(TABLE).where({ manifest_id: manifestId }).del();
      if (!assets.length) {
        return [];
      }
      await trx(TABLE).insert(
        assets.map((asset) => ({
          manifest_id: manifestId,
          asset_type: asset.assetType ?? 'generic',
          label: asset.label ?? null,
          asset_url: asset.assetUrl,
          checksum_sha256: asset.checksumSha256 ?? null,
          size_bytes: toNumber(asset.sizeBytes ?? 0),
          metadata: JSON.stringify(asset.metadata ?? {})
        }))
      );
      const rows = await trx(`${TABLE} as asset`)
        .select(BASE_COLUMNS)
        .where('asset.manifest_id', manifestId)
        .orderBy('asset.id', 'asc');
      return rows.map(deserialize).filter(Boolean);
    });
  }
}
