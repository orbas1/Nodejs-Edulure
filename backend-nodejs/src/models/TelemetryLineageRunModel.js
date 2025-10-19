import db from '../config/database.js';
import { TABLES } from '../database/domains/telemetry.js';

function parseJson(value, fallback = {}) {
  if (value === null || value === undefined) {
    return fallback;
  }

  if (typeof value === 'object') {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
}

function toDomain(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    runUuid: row.run_uuid,
    tool: row.tool,
    modelName: row.model_name,
    status: row.status,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    input: parseJson(row.input, {}),
    output: parseJson(row.output, {}),
    errorMessage: row.error_message,
    metadata: parseJson(row.metadata, {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export default class TelemetryLineageRunModel {
  static async findById(id, connection = db) {
    const row = await connection(TABLES.LINEAGE_RUNS).where({ id }).first();
    return toDomain(row);
  }

  static async startRun(
    { tool, modelName, input = {}, metadata = {}, startedAt = new Date() },
    connection = db
  ) {
    if (!tool || !modelName) {
      throw new Error('TelemetryLineageRunModel.startRun requires tool and modelName.');
    }

    const insertPayload = {
      tool,
      model_name: modelName,
      status: 'running',
      started_at: startedAt,
      input: JSON.stringify(input ?? {}),
      metadata: JSON.stringify(metadata ?? {})
    };

    const [id] = await connection(TABLES.LINEAGE_RUNS).insert(insertPayload);
    return this.findById(id, connection);
  }

  static async completeRun(
    id,
    { status = 'success', output = {}, error, completedAt = new Date(), metadata = {} } = {},
    connection = db
  ) {
    if (!id) {
      throw new Error('TelemetryLineageRunModel.completeRun requires a run identifier.');
    }

    const normalizedStatus = ['success', 'failed'].includes(status) ? status : 'success';
    const updatePayload = {
      status: normalizedStatus,
      completed_at: completedAt,
      output: JSON.stringify(output ?? {}),
      metadata: connection.raw(
        'JSON_MERGE_PATCH(IFNULL(metadata, JSON_OBJECT()), ?)',
        JSON.stringify(metadata)
      )
    };

    if (error) {
      const message = error instanceof Error ? error.message : String(error);
      updatePayload.error_message = message.slice(0, 1000);
    }

    await connection(TABLES.LINEAGE_RUNS).where({ id }).update(updatePayload);
    return this.findById(id, connection);
  }
}
