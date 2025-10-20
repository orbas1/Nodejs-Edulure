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
      .limit(limit)
      .forUpdate()
      .skipLocked();
    return rows.map((row) => this.deserialize(row));
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
        updated_at: connection.fn.now()
      });
  }

  static deserialize(row) {
    return {
      ...row,
      resultMetadata: safeJsonParse(row.resultMetadata, {})
    };
  }
}
