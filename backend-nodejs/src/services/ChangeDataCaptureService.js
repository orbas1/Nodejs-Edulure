import crypto from 'crypto';

import db from '../config/database.js';
import logger from '../config/logger.js';
import { TABLES as COMPLIANCE_TABLES } from '../database/domains/compliance.js';

const DEFAULT_DOMAIN = 'governance';

function normaliseJson(value) {
  if (value === undefined || value === null) {
    return {};
  }

  if (typeof value === 'object') {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch (_error) {
    return { raw: value };
  }
}

export class ChangeDataCaptureService {
  constructor({ connection = db, loggerInstance = logger.child({ module: 'cdc-outbox' }) } = {}) {
    this.connection = connection;
    this.logger = loggerInstance;
  }

  async recordEvent({
    domain = DEFAULT_DOMAIN,
    entityName,
    entityId,
    operation,
    payload,
    schemaVersion = '1.0',
    correlationId,
    dryRun = false,
    nextAttemptAt,
    status = 'pending'
  }) {
    if (!entityName || !entityId || !operation) {
      throw new Error('ChangeDataCaptureService.recordEvent requires entityName, entityId, and operation.');
    }

    const now = new Date();
    const normalisedPayload = normaliseJson(payload);
    const schemaMetadata = {
      version: schemaVersion,
      recordedAt: now.toISOString(),
      domain
    };
    const enrichedPayload =
      normalisedPayload && typeof normalisedPayload === 'object'
        ? {
            ...normalisedPayload,
            _schema: { ...(normalisedPayload._schema ?? {}), ...schemaMetadata }
          }
        : { value: normalisedPayload ?? null, _schema: schemaMetadata };

    const eventPayload = {
      event_uuid: crypto.randomUUID(),
      domain,
      entity_name: entityName,
      entity_id: String(entityId),
      operation: operation.toUpperCase(),
      status: status.toLowerCase(),
      dry_run: Boolean(dryRun),
      correlation_id: correlationId ?? crypto.randomUUID().slice(0, 32),
      payload: enrichedPayload,
      next_attempt_at: nextAttemptAt ?? now
    };

    const [id] = await this.connection(COMPLIANCE_TABLES.CDC_OUTBOX).insert(eventPayload);
    this.logger.info({ ...eventPayload, id }, 'CDC event recorded');
    return this.connection(COMPLIANCE_TABLES.CDC_OUTBOX).where({ id }).first();
  }

  async fetchPending({ limit = 100 } = {}) {
    return this.connection(COMPLIANCE_TABLES.CDC_OUTBOX)
      .where({ status: 'pending' })
      .andWhere('next_attempt_at', '<=', this.connection.fn.now())
      .orderBy('next_attempt_at', 'asc')
      .limit(limit);
  }

  async markDelivered(eventId, { deliveredAt = new Date(), metadata } = {}) {
    if (!eventId) {
      throw new Error('markDelivered requires an event id');
    }

    const updatePayload = {
      status: 'delivered',
      processed_at: deliveredAt,
      last_attempt_at: deliveredAt
    };

    if (metadata && Object.keys(metadata).length > 0) {
      updatePayload.payload = this.connection.raw(
        'JSON_MERGE_PATCH(IFNULL(payload, JSON_OBJECT()), ?)',
        JSON.stringify({ metadata })
      );
    }

    await this.connection(COMPLIANCE_TABLES.CDC_OUTBOX).where({ id: eventId }).update(updatePayload);
  }

  async markFailed(eventId, error, { retryDelayMinutes = 15 } = {}) {
    if (!eventId) {
      throw new Error('markFailed requires an event id');
    }

    const nextAttempt = new Date(Date.now() + retryDelayMinutes * 60 * 1000);
    const message = error instanceof Error ? error.message : String(error ?? 'Unknown error');

    await this.connection(COMPLIANCE_TABLES.CDC_OUTBOX)
      .where({ id: eventId })
      .update({
        status: 'pending',
        error_message: message.slice(0, 500),
        last_attempt_at: this.connection.fn.now(),
        next_attempt_at: nextAttempt,
        retry_count: this.connection.raw('retry_count + 1')
      });
  }
}

const changeDataCaptureService = new ChangeDataCaptureService();

export default changeDataCaptureService;
