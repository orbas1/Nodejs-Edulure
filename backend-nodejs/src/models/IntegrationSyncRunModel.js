import db from '../config/database.js';

function parseJson(value, fallback = null) {
  if (!value) {
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
    integration: row.integration,
    syncType: row.sync_type,
    status: row.status,
    triggeredBy: row.triggered_by,
    correlationId: row.correlation_id,
    retryAttempt: Number(row.retry_attempt ?? 0),
    windowStartAt: row.window_start_at,
    windowEndAt: row.window_end_at,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    recordsPushed: Number(row.records_pushed ?? 0),
    recordsPulled: Number(row.records_pulled ?? 0),
    recordsFailed: Number(row.records_failed ?? 0),
    recordsSkipped: Number(row.records_skipped ?? 0),
    lastError: row.last_error,
    metadata: parseJson(row.metadata, {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function serialiseMetadata(metadata) {
  if (metadata === undefined || metadata === null) {
    return null;
  }

  try {
    return JSON.stringify(metadata);
  } catch (_error) {
    return JSON.stringify({});
  }
}

export default class IntegrationSyncRunModel {
  static async create(run, connection = db) {
    const payload = {
      integration: run.integration,
      sync_type: run.syncType,
      status: run.status ?? 'pending',
      triggered_by: run.triggeredBy ?? 'scheduler',
      correlation_id: run.correlationId,
      retry_attempt: run.retryAttempt ?? 0,
      window_start_at: run.windowStartAt ?? null,
      window_end_at: run.windowEndAt ?? null,
      metadata: serialiseMetadata(run.metadata)
    };

    const [id] = await connection('integration_sync_runs').insert(payload);
    const row = await connection('integration_sync_runs').where({ id }).first();
    return mapRow(row);
  }

  static async markStarted(id, { retryAttempt, startedAt = new Date() } = {}, connection = db) {
    await connection('integration_sync_runs')
      .where({ id })
      .update({
        status: 'running',
        retry_attempt: retryAttempt ?? 0,
        started_at: startedAt,
        updated_at: connection.fn.now()
      });

    return this.findById(id, connection);
  }

  static async markCompleted(
    id,
    {
      status = 'succeeded',
      finishedAt = new Date(),
      recordsPushed,
      recordsPulled,
      recordsFailed,
      recordsSkipped,
      lastError,
      metadata
    } = {},
    connection = db
  ) {
    const updates = {
      status,
      finished_at: finishedAt,
      updated_at: connection.fn.now()
    };

    if (recordsPushed !== undefined) updates.records_pushed = recordsPushed;
    if (recordsPulled !== undefined) updates.records_pulled = recordsPulled;
    if (recordsFailed !== undefined) updates.records_failed = recordsFailed;
    if (recordsSkipped !== undefined) updates.records_skipped = recordsSkipped;
    if (lastError !== undefined) updates.last_error = lastError ?? null;
    if (metadata !== undefined) updates.metadata = serialiseMetadata(metadata);

    await connection('integration_sync_runs').where({ id }).update(updates);

    return this.findById(id, connection);
  }

  static async incrementCounters(
    id,
    {
      pushed = 0,
      pulled = 0,
      failed = 0,
      skipped = 0,
      metadataPatch
    } = {},
    connection = db
  ) {
    const updates = {
      updated_at: connection.fn.now()
    };

    if (pushed) {
      updates.records_pushed = connection.raw('records_pushed + ?', [pushed]);
    }
    if (pulled) {
      updates.records_pulled = connection.raw('records_pulled + ?', [pulled]);
    }
    if (failed) {
      updates.records_failed = connection.raw('records_failed + ?', [failed]);
    }
    if (skipped) {
      updates.records_skipped = connection.raw('records_skipped + ?', [skipped]);
    }
    if (metadataPatch) {
      updates.metadata = connection.raw(
        "JSON_MERGE_PATCH(IFNULL(metadata, '{}'), CAST(? AS JSON))",
        JSON.stringify(metadataPatch)
      );
    }

    await connection('integration_sync_runs').where({ id }).update(updates);

    return this.findById(id, connection);
  }

  static async recordError(id, error, connection = db) {
    await connection('integration_sync_runs')
      .where({ id })
      .update({
        status: 'failed',
        finished_at: connection.fn.now(),
        last_error: typeof error === 'string' ? error : error?.message ?? 'Unknown integration error',
        updated_at: connection.fn.now()
      });

    return this.findById(id, connection);
  }

  static async findById(id, connection = db) {
    const row = await connection('integration_sync_runs').where({ id }).first();
    return mapRow(row);
  }

  static async latestForIntegration(integration, syncType, connection = db) {
    const query = connection('integration_sync_runs')
      .where({ integration })
      .orderBy('created_at', 'desc');

    if (syncType) {
      query.andWhere({ sync_type: syncType });
    }

    const row = await query.first();
    return mapRow(row);
  }

  static async listRecent(integration, { limit = 25 } = {}, connection = db) {
    const query = connection('integration_sync_runs')
      .where({ integration })
      .orderBy('created_at', 'desc')
      .limit(limit);

    const rows = await query;
    return rows.map((row) => mapRow(row));
  }
}
