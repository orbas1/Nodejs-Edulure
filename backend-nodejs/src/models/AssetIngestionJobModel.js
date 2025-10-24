import db from '../config/database.js';
import { safeJsonParse, safeJsonStringify } from '../utils/modelUtils.js';

const TABLE = 'asset_ingestion_jobs';

const BASE_COLUMNS = [
  'id',
  'asset_id as assetId',
  'job_type as jobType',
  'status',
  'attempts',
  'last_error as lastError',
  'result_metadata as resultMetadata',
  'created_at as createdAt',
  'updated_at as updatedAt',
  'started_at as startedAt',
  'completed_at as completedAt'
];

export default class AssetIngestionJobModel {
  static async create(job, connection = db) {
    const payload = {
      asset_id: job.assetId,
      job_type: job.jobType,
      status: job.status ?? 'pending',
      attempts: job.attempts ?? 0,
      result_metadata: safeJsonStringify(job.resultMetadata)
    };
    const [id] = await connection(TABLE).insert(payload);
    return this.findById(id, connection);
  }

  static async findById(id, connection = db) {
    const row = await connection(TABLE).select(BASE_COLUMNS).where({ id }).first();
    if (!row) return null;
    return this.deserialize(row);
  }

  static async takeNextPending(limit = 5, connection = db) {
    const rows = await connection
      .select(BASE_COLUMNS)
      .from(TABLE)
      .where({ status: 'pending' })
      .orderBy('created_at', 'asc')
      .limit(limit * 3)
      .forUpdate()
      .skipLocked();

    const now = Date.now();
    const ready = [];

    for (const row of rows) {
      if (ready.length >= limit) {
        break;
      }

      const job = this.deserialize(row);
      const retryAtRaw = job.resultMetadata?.retryAt;
      const retryAt = retryAtRaw ? new Date(retryAtRaw).getTime() : null;
      if (retryAt && retryAt > now) {
        continue;
      }

      ready.push(job);
    }

    const prepared = [];
    for (const job of ready) {
      const metadata = { ...(job.resultMetadata ?? {}) };
      if (metadata.retryAt) {
        delete metadata.retryAt;
      }
      await connection(TABLE)
        .where({ id: job.id })
        .update({
          status: 'processing',
          started_at: connection.fn.now(),
          updated_at: connection.fn.now(),
          result_metadata: safeJsonStringify(metadata)
        });
      prepared.push({ ...job, status: 'processing', resultMetadata: metadata });
    }

    return prepared;
  }

  static async markProcessing(id, connection = db) {
    await connection(TABLE)
      .where({ id })
      .update({ status: 'processing', started_at: connection.fn.now(), updated_at: connection.fn.now() });
  }

  static async markCompleted(id, resultMetadata = {}, connection = db) {
    await connection(TABLE)
      .where({ id })
      .update({
        status: 'completed',
        result_metadata: safeJsonStringify(resultMetadata),
        completed_at: connection.fn.now(),
        updated_at: connection.fn.now()
      });
  }

  static async markFailed(id, lastError, connection = db) {
    await connection(TABLE)
      .where({ id })
      .update({
        status: 'failed',
        last_error: lastError?.toString()?.slice(0, 2000) ?? null,
        attempts: connection.raw('attempts + 1'),
        completed_at: connection.fn.now(),
        updated_at: connection.fn.now()
      });
  }

  static async scheduleRetry(id, { lastError, retryAt, attempts }, connection = db) {
    const job = await this.findById(id, connection);
    const metadata = { ...(job?.resultMetadata ?? {}) };
    if (retryAt) {
      const retryDate = retryAt instanceof Date ? retryAt : new Date(retryAt);
      if (Number.isFinite(retryDate.getTime())) {
        metadata.retryAt = retryDate.toISOString();
      }
    }

    await connection(TABLE)
      .where({ id })
      .update({
        status: 'pending',
        attempts,
        last_error: lastError?.toString()?.slice(0, 2000) ?? null,
        result_metadata: safeJsonStringify(metadata),
        started_at: null,
        completed_at: null,
        updated_at: connection.fn.now()
      });

    return this.findById(id, connection);
  }

  static deserialize(row) {
    return {
      ...row,
      resultMetadata: safeJsonParse(row.resultMetadata, {})
    };
  }
}
