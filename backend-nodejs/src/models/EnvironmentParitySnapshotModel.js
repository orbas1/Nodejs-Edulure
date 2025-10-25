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
    if (!connection) {
      throw new TypeError('A database connection instance is required');
    }

    if (typeof connection === 'function') {
      return connection(this.tableName);
    }

    if (typeof connection.table === 'function') {
      return connection.table(this.tableName);
    }

    if (typeof connection.from === 'function') {
      return connection.from(this.tableName);
    }

    if (typeof connection.clone === 'function' && typeof connection.select === 'function') {
      const cloned = connection.clone();
      if (typeof cloned.from === 'function') {
        return cloned.from(this.tableName);
      }
      if (typeof cloned.table === 'function') {
        return cloned.table(this.tableName);
      }
      return cloned;
    }

    if (typeof connection.select === 'function') {
      return connection;
    }

    throw new TypeError('Invalid database connection provided to EnvironmentParitySnapshotModel');
  }

  static deserialize(row) {
    return deserialize(row);
  }

  static isMissingTableError(error) {
    if (!error) {
      return false;
    }

    if (error.code === 'SQLITE_ERROR' && /no such table/i.test(error.message ?? '')) {
      return true;
    }

    if (error.code === 'ER_NO_SUCH_TABLE' || error.errno === 1146) {
      return true;
    }

    return false;
  }

  static isConnectionInvocationError(error) {
    return error instanceof TypeError && /is not a function/i.test(error?.message ?? '');
  }

  static resolveGeneratedAt(snapshot, connection) {
    if (snapshot.generatedAt) {
      return snapshot.generatedAt;
    }

    const nowFn = connection?.fn?.now;
    if (typeof nowFn === 'function') {
      try {
        return nowFn.call(connection.fn);
      } catch (_error) {
        // fall through to Date fallback
      }
    }

    return new Date();
  }

  static buildFallbackSnapshot(snapshot) {
    const mismatches = Array.isArray(snapshot.mismatches) ? [...snapshot.mismatches] : [];
    const dependencies = Array.isArray(snapshot.dependencies) ? [...snapshot.dependencies] : [];
    const metadata = snapshot.metadata && typeof snapshot.metadata === 'object' ? { ...snapshot.metadata } : {};

    return {
      id: snapshot.id ?? null,
      environmentName: snapshot.environmentName ?? null,
      environmentProvider: snapshot.environmentProvider ?? null,
      environmentTier: snapshot.environmentTier ?? null,
      releaseChannel: snapshot.releaseChannel ?? null,
      gitSha: snapshot.gitSha ?? null,
      manifestVersion: snapshot.manifestVersion ?? null,
      manifestHash: snapshot.manifestHash ?? null,
      status: snapshot.status ?? 'healthy',
      mismatchesCount: Number(
        snapshot.mismatchesCount ?? (Array.isArray(snapshot.mismatches) ? snapshot.mismatches.length : mismatches.length)
      ),
      mismatches,
      dependencies,
      metadata,
      generatedAt: snapshot.generatedAt ?? new Date(),
      createdAt: snapshot.createdAt ?? null,
      updatedAt: snapshot.updatedAt ?? null
    };
  }

  static async recordSnapshot(snapshot, connection = db) {
    try {
      const builder = this.query(connection);
      const generatedAt = this.resolveGeneratedAt(snapshot, connection);
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
        generated_at: generatedAt
      };

      const [id] = await builder.insert(payload);
      return this.findById(id, connection);
    } catch (error) {
      if (this.isMissingTableError(error) || this.isConnectionInvocationError(error)) {
        return this.buildFallbackSnapshot({ ...snapshot, id: null });
      }

      throw error;
    }
  }

  static async findById(id, connection = db) {
    try {
      const row = await this.query(connection).select(BASE_COLUMNS).where({ id }).first();
      return deserialize(row);
    } catch (error) {
      if (this.isMissingTableError(error) || this.isConnectionInvocationError(error)) {
        return null;
      }

      throw error;
    }
  }

  static async findLatestForEnvironment({ environmentName, environmentProvider }, connection = db) {
    if (!environmentName || !environmentProvider) {
      return null;
    }

    try {
      const row = await this.query(connection)
        .select(BASE_COLUMNS)
        .where({ environment_name: environmentName, environment_provider: environmentProvider })
        .orderBy('generated_at', 'desc')
        .first();

      return deserialize(row);
    } catch (error) {
      if (this.isMissingTableError(error) || this.isConnectionInvocationError(error)) {
        return null;
      }

      throw error;
    }
  }

  static async listRecent(
    { environmentName, environmentProvider, limit = 10, excludeIds = [] } = {},
    connection = db
  ) {
    try {
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
    } catch (error) {
      if (this.isMissingTableError(error) || this.isConnectionInvocationError(error)) {
        return [];
      }

      throw error;
    }
  }
}

