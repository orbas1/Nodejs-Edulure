import db from '../config/database.js';

function safeParse(value) {
  try {
    return JSON.parse(value || '{}');
  } catch (_error) {
    return {};
  }
}

function mapRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    provider: row.provider,
    externalEventId: row.external_event_id,
    signature: row.signature ?? null,
    payloadHash: row.payload_hash,
    status: row.status,
    metadata:
      typeof row.metadata === 'string'
        ? safeParse(row.metadata)
        : row.metadata ?? {},
    receivedAt: row.received_at ? new Date(row.received_at) : null,
    processedAt: row.processed_at ? new Date(row.processed_at) : null,
    errorMessage: row.error_message ?? null,
    createdAt: row.created_at ? new Date(row.created_at) : null,
    updatedAt: row.updated_at ? new Date(row.updated_at) : null
  };
}

export default class IntegrationWebhookReceiptModel {
  static tableName = 'integration_webhook_receipts';

  static mapRow(row) {
    return mapRow(row);
  }

  static async recordReceipt(payload, connection = db) {
    const record = {
      provider: payload.provider,
      external_event_id: payload.externalEventId,
      signature: payload.signature ?? null,
      payload_hash: payload.payloadHash,
      metadata: payload.metadata ? JSON.stringify(payload.metadata) : null,
      received_at: payload.receivedAt ?? new Date(),
      status: payload.status ?? 'received'
    };

    return connection.transaction(async (trx) => {
      const insertResult = await trx(this.tableName)
        .insert(record)
        .onConflict(['provider', 'external_event_id'])
        .ignore();

      if (Array.isArray(insertResult) && insertResult.length && insertResult[0]) {
        const row = await trx(this.tableName).where({ id: insertResult[0] }).first();
        return { receipt: mapRow(row), created: true };
      }

      const existing = await trx(this.tableName)
        .where({ provider: payload.provider, external_event_id: payload.externalEventId })
        .first();

      return { receipt: mapRow(existing), created: false };
    });
  }

  static async markProcessed(id, { status = 'processed', errorMessage = null } = {}, connection = db) {
    await connection(this.tableName)
      .where({ id })
      .update({
        status,
        error_message: errorMessage,
        processed_at: connection.fn.now(),
        updated_at: connection.fn.now()
      });

    const row = await connection(this.tableName).where({ id }).first();
    return mapRow(row);
  }

  static async pruneOlderThan(cutoffDate, connection = db) {
    if (!(cutoffDate instanceof Date)) {
      throw new Error('IntegrationWebhookReceiptModel.pruneOlderThan requires a Date instance.');
    }

    return connection(this.tableName)
      .where('received_at', '<', cutoffDate)
      .delete();
  }
}
