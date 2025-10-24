import db from '../config/database.js';
import { TABLES } from '../database/domains/telemetry.js';
import jsonMergePatch from '../database/utils/jsonMergePatch.js';

function parseJson(value, fallback = {}) {
  if (value === null || value === undefined) {
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

function toDomain(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    pipelineKey: row.pipeline_key,
    status: row.status,
    thresholdMinutes: row.threshold_minutes,
    lastEventAt: row.last_event_at,
    lagSeconds: row.lag_seconds,
    metadata: parseJson(row.metadata, {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function computeStatus({ lastEventAt, thresholdMinutes }) {
  if (!lastEventAt) {
    return { status: 'critical', lagSeconds: 0 };
  }

  const now = Date.now();
  const occurred = new Date(lastEventAt).getTime();
  const diffMs = Math.max(0, now - occurred);
  const lagSeconds = Math.round(diffMs / 1000);
  const thresholdSeconds = Math.max(60, (thresholdMinutes ?? 15) * 60);

  if (lagSeconds <= thresholdSeconds) {
    return { status: 'healthy', lagSeconds };
  }

  if (lagSeconds <= thresholdSeconds * 3) {
    return { status: 'warning', lagSeconds };
  }

  return { status: 'critical', lagSeconds };
}

export default class TelemetryFreshnessMonitorModel {
  static async touchCheckpoint(
    pipelineKey,
    { lastEventAt = new Date(), thresholdMinutes = 15, metadata = {} } = {},
    connection = db
  ) {
    if (!pipelineKey) {
      throw new Error('TelemetryFreshnessMonitorModel.touchCheckpoint requires a pipeline key.');
    }

    const { status, lagSeconds } = computeStatus({ lastEventAt, thresholdMinutes });

    const insertPayload = {
      pipeline_key: pipelineKey,
      last_event_at: lastEventAt,
      status,
      threshold_minutes: thresholdMinutes,
      lag_seconds: lagSeconds,
      metadata: JSON.stringify(metadata ?? {})
    };

    const mergePayload = {
      last_event_at: lastEventAt,
      status,
      threshold_minutes: thresholdMinutes,
      lag_seconds: lagSeconds,
      updated_at: connection.fn.now()
    };

    const mergeExpression = jsonMergePatch(connection, 'metadata', metadata);
    if (mergeExpression) {
      mergePayload.metadata = mergeExpression;
    }

    await connection(TABLES.FRESHNESS_MONITORS).insert(insertPayload).onConflict('pipeline_key').merge(mergePayload);

    const row = await connection(TABLES.FRESHNESS_MONITORS).where({ pipeline_key: pipelineKey }).first();
    return toDomain(row);
  }

  static async listSnapshots({ limit = 50 } = {}, connection = db) {
    const rows = await connection(TABLES.FRESHNESS_MONITORS)
      .orderBy('pipeline_key', 'asc')
      .limit(limit);

    return rows.map(toDomain);
  }
}
