import db from '../config/database.js';
import logger from '../config/logger.js';

const TABLE = 'scheduler_checkpoints';

function normaliseJobKey(jobKey) {
  if (!jobKey || typeof jobKey !== 'string') {
    throw new Error('SchedulerCheckpointModel requires a non-empty job key.');
  }
  const key = jobKey.trim();
  if (!key) {
    throw new Error('SchedulerCheckpointModel requires a non-empty job key.');
  }
  return key.slice(0, 160);
}

function parseJson(value, fallback = {}) {
  if (!value) {
    return fallback;
  }
  if (typeof value === 'object') {
    return value;
  }
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : fallback;
  } catch (error) {
    return fallback;
  }
}

function toDate(value) {
  if (!value) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.valueOf()) ? null : date;
}

function toDomain(row) {
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    jobKey: row.job_key,
    lastRunAt: row.last_run_at ? new Date(row.last_run_at) : null,
    nextRunAt: row.next_run_at ? new Date(row.next_run_at) : null,
    lastStatus: row.last_status,
    metadata: parseJson(row.metadata),
    lastError: row.last_error ?? null,
    createdAt: row.created_at ? new Date(row.created_at) : null,
    updatedAt: row.updated_at ? new Date(row.updated_at) : null
  };
}

export class SchedulerCheckpointModel {
  constructor({
    dbClient = db,
    loggerInstance = logger.child({ model: 'SchedulerCheckpoint' })
  } = {}) {
    this.db = dbClient;
    this.logger = loggerInstance;
  }

  withConnection(connection) {
    if (!connection) {
      return this;
    }
    return new SchedulerCheckpointModel({ dbClient: connection, loggerInstance: this.logger });
  }

  async recordRun(jobKey, { status = 'unknown', ranAt = new Date(), nextRunAt = null, metadata = {}, errorMessage = null } = {}) {
    const key = normaliseJobKey(jobKey);
    const lastRunAt = toDate(ranAt) ?? new Date();
    const nextRun = toDate(nextRunAt);
    const payload = {
      job_key: key,
      last_status: status,
      last_run_at: lastRunAt,
      next_run_at: nextRun,
      metadata: JSON.stringify(metadata ?? {}),
      last_error: errorMessage ? String(errorMessage).slice(0, 2048) : null,
      updated_at: this.db.fn.now()
    };

    try {
      await this.db(TABLE)
        .insert({ ...payload, created_at: this.db.fn.now() })
        .onConflict('job_key')
        .merge(payload);
    } catch (error) {
      this.logger.error({ err: error, jobKey: key }, 'Failed to record scheduler checkpoint');
      throw error;
    }

    return this.get(jobKey);
  }

  async get(jobKey) {
    const key = normaliseJobKey(jobKey);
    try {
      const row = await this.db(TABLE).where({ job_key: key }).first();
      return toDomain(row);
    } catch (error) {
      this.logger.error({ err: error, jobKey: key }, 'Failed to load scheduler checkpoint');
      throw error;
    }
  }

  async list({ limit = 100 } = {}) {
    try {
      const rows = await this.db(TABLE)
        .orderBy('updated_at', 'desc')
        .limit(Math.max(1, limit));
      return rows.map(toDomain);
    } catch (error) {
      this.logger.error({ err: error }, 'Failed to list scheduler checkpoints');
      throw error;
    }
  }
}

export const schedulerCheckpointModel = new SchedulerCheckpointModel();

export default SchedulerCheckpointModel;
