import db from '../config/database.js';
import { PAYMENT_INTENT_STATUSES, normaliseEnum } from './shared/statusRegistry.js';

function parseJson(value, fallback = {}) {
  if (!value) {
    return { ...fallback };
  }
  if (typeof value === 'object') {
    return { ...fallback, ...value };
  }
  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === 'object') {
      return { ...fallback, ...parsed };
    }
  } catch (_error) {
    // fall through
  }
  return { ...fallback };
}

function normaliseStatus(status, fieldName) {
  return normaliseEnum(status, PAYMENT_INTENT_STATUSES, { fieldName });
}

function mapRow(row) {
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    paymentIntentId: row.payment_intent_id,
    fromStatus: row.from_status,
    toStatus: row.to_status,
    changedBy: row.changed_by ?? null,
    reason: row.reason ?? null,
    metadata: parseJson(row.metadata, {}),
    changedAt: row.changed_at,
    createdAt: row.created_at
  };
}

export default class PaymentIntentStatusTransitionModel {
  static table(connection = db) {
    return connection('payment_intent_status_transitions');
  }

  static async recordTransition(transition, connection = db) {
    if (!transition?.paymentIntentId) {
      throw new Error('paymentIntentId is required to record a status transition');
    }

    const payload = {
      payment_intent_id: transition.paymentIntentId,
      from_status: normaliseStatus(transition.fromStatus ?? 'requires_payment_method', 'fromStatus'),
      to_status: normaliseStatus(transition.toStatus, 'toStatus'),
      changed_by: transition.changedBy ?? null,
      reason: transition.reason ?? null,
      metadata: JSON.stringify(parseJson(transition.metadata, {})),
      changed_at: transition.changedAt ?? connection.fn.now()
    };

    const [id] = await this.table(connection).insert(payload);
    const row = await this.table(connection).where({ id }).first();
    return mapRow(row);
  }

  static async listForIntent(paymentIntentId, { limit = 50, offset = 0 } = {}, connection = db) {
    const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);
    const safeOffset = Math.max(Number(offset) || 0, 0);

    const rows = await this.table(connection)
      .where({ payment_intent_id: paymentIntentId })
      .orderBy('changed_at', 'desc')
      .limit(safeLimit)
      .offset(safeOffset);

    return rows.map((row) => mapRow(row));
  }
}
