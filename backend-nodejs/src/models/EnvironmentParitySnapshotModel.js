import db from '../config/database.js';
import { safeJsonParse, safeJsonStringify } from '../utils/modelUtils.js';

const TABLE = 'environment_parity_snapshots';

const BASE_COLUMNS = [
  'id',
  'environment_name as environmentName',
  'environment_provider as environmentProvider',
  'environment_tier as environmentTier',
  'release_channel as releaseChannel',
  'git_sha as gitSha',
  'manifest_version as manifestVersion',
  'manifest_hash as manifestHash',
  'status',
  'mismatches_count as mismatchesCount',
  'mismatches',
  'dependencies',
  'metadata',
  'generated_at as generatedAt',
  'created_at as createdAt',
  'updated_at as updatedAt'
];

function deserialize(row) {
  if (!row) {
    return null;
  }

  return {
    ...row,
    mismatches: safeJsonParse(row.mismatches, []),
    dependencies: safeJsonParse(row.dependencies, []),
    metadata: safeJsonParse(row.metadata, {})
  };
}

export default class EnvironmentParitySnapshotModel {
  static tableName = TABLE;

  static query(connection = db) {
    return connection(this.tableName);
  }

  static deserialize(row) {
    return deserialize(row);
  }

  static async recordSnapshot(snapshot, connection = db) {
    const payload = {
      environment_name: snapshot.environmentName,
      environment_provider: snapshot.environmentProvider,
      environment_tier: snapshot.environmentTier ?? null,
      release_channel: snapshot.releaseChannel ?? null,
      git_sha: snapshot.gitSha ?? null,
      manifest_version: snapshot.manifestVersion ?? null,
      manifest_hash: snapshot.manifestHash,
      status: snapshot.status ?? 'healthy',
      mismatches_count: Number(snapshot.mismatchesCount ?? 0),
      mismatches: safeJsonStringify(snapshot.mismatches ?? [], []),
      dependencies: safeJsonStringify(snapshot.dependencies ?? [], []),
      metadata: safeJsonStringify(snapshot.metadata ?? {}, {}),
      generated_at: snapshot.generatedAt ?? connection.fn.now()
    };

    const [id] = await this.query(connection).insert(payload);
    return this.findById(id, connection);
  }

  static async findById(id, connection = db) {
    const row = await this.query(connection).select(BASE_COLUMNS).where({ id }).first();
    return deserialize(row);
  }

  static async findLatestForEnvironment({ environmentName, environmentProvider }, connection = db) {
    if (!environmentName || !environmentProvider) {
      return null;
    }

    const row = await this.query(connection)
      .select(BASE_COLUMNS)
      .where({ environment_name: environmentName, environment_provider: environmentProvider })
      .orderBy('generated_at', 'desc')
      .first();

    return deserialize(row);
  }

  static async listRecent(
    { environmentName, environmentProvider, limit = 10, excludeIds = [] } = {},
    connection = db
  ) {
    const builder = this.query(connection).select(BASE_COLUMNS).orderBy('generated_at', 'desc');

    if (environmentName) {
      builder.where({ environment_name: environmentName });
    }

    if (environmentProvider) {
      builder.where({ environment_provider: environmentProvider });
    }

    if (Array.isArray(excludeIds) && excludeIds.length > 0) {
      builder.whereNotIn('id', excludeIds);
    }

    builder.limit(Math.max(1, Math.min(limit, 100)));

    const rows = await builder;
    return rows.map((row) => deserialize(row));
  }
}

