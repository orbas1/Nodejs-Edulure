import db from '../config/database.js';

function parseJson(value, fallback) {
  if (value === undefined || value === null) {
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
    eventUuid: row.event_uuid,
    eventType: row.event_type,
    status: row.status,
    source: row.source,
    correlationId: row.correlation_id,
    payload: parseJson(row.payload, {}),
    metadata: parseJson(row.metadata, {}),
    firstQueuedAt: row.first_queued_at ? new Date(row.first_queued_at) : null,
    lastAttemptAt: row.last_attempt_at ? new Date(row.last_attempt_at) : null,
    deliveredAt: row.delivered_at ? new Date(row.delivered_at) : null,
    failedAt: row.failed_at ? new Date(row.failed_at) : null,
    createdAt: row.created_at ? new Date(row.created_at) : null,
    updatedAt: row.updated_at ? new Date(row.updated_at) : null
  };
}

export default class IntegrationWebhookEventModel {
  static tableName = 'integration_webhook_events';

  static mapRow(row) {
    return mapRow(row);
  }

  static async create(
    { eventType, source, correlationId, payload, metadata },
    connection = db
  ) {
    const insertPayload = {
      event_type: eventType,
      source,
      correlation_id: correlationId,
      payload: JSON.stringify(payload ?? {}),
      metadata: metadata ? JSON.stringify(metadata) : null
    };

    const [id] = await connection(this.tableName).insert(insertPayload);
    const row = await connection(this.tableName).where({ id }).first();
    return mapRow(row);
  }

  static async updateStatus(id, status, connection = db) {
    await connection(this.tableName)
      .where({ id })
      .update({ status, updated_at: connection.fn.now() });
  }

  static async touchAttempt(id, attemptAt = new Date(), connection = db) {
    await connection(this.tableName)
      .where({ id })
      .update({ last_attempt_at: attemptAt, updated_at: connection.fn.now() });
  }

  static async markDelivered(id, deliveredAt = new Date(), connection = db) {
    await connection(this.tableName)
      .where({ id })
      .update({
        status: 'delivered',
        delivered_at: deliveredAt,
        updated_at: connection.fn.now()
      });
  }

  static async markFailed(id, failedAt = new Date(), connection = db) {
    await connection(this.tableName)
      .where({ id })
      .update({
        status: 'failed',
        failed_at: failedAt,
        updated_at: connection.fn.now()
      });
  }

  static async markPartial(id, deliveredAt = new Date(), connection = db) {
    await connection(this.tableName)
      .where({ id })
      .update({
        status: 'partial',
        delivered_at: deliveredAt,
        updated_at: connection.fn.now()
      });
  }

  static async findById(id, connection = db) {
    const row = await connection(this.tableName).where({ id }).first();
    return mapRow(row);
  }
}
