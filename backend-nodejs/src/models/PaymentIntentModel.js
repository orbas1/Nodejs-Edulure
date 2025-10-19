import { randomUUID } from 'node:crypto';

import db from '../config/database.js';
import DataEncryptionService from '../services/DataEncryptionService.js';

const TABLE = 'payment_intents';

const BASE_COLUMNS = [
  'id',
  'public_id as publicId',
  'user_id as userId',
  'provider',
  'provider_intent_id as providerIntentHash',
  'provider_capture_id as providerCaptureHash',
  'provider_latest_charge_id as providerLatestChargeHash',
  'status',
  'currency',
  'amount_subtotal as amountSubtotal',
  'amount_discount as amountDiscount',
  'amount_tax as amountTax',
  'amount_total as amountTotal',
  'amount_refunded as amountRefunded',
  'tax_breakdown as taxBreakdown',
  'metadata',
  'coupon_id as couponId',
  'entity_type as entityType',
  'entity_id as entityId',
  'receipt_email as receiptEmailMask',
  'captured_at as capturedAt',
  'canceled_at as canceledAt',
  'expires_at as expiresAt',
  'failure_code as failureCodeMask',
  'failure_message as failureMessageMask',
  'sensitive_details_ciphertext as sensitiveDetailsCiphertext',
  'sensitive_details_hash as sensitiveDetailsHash',
  'classification_tag as sensitiveClassification',
  'encryption_key_version as encryptionKeyVersion',
  'created_at as createdAt',
  'updated_at as updatedAt'
];

function coerceAmount(value) {
  if (value === null || value === undefined) {
    return 0;
  }

  if (typeof value === 'number') {
    return value;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function parseJson(value) {
  if (!value) {
    return {};
  }

  if (typeof value === 'object') {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch (_error) {
    return {};
  }
}

function buildSensitiveDetails(intent) {
  return {
    providerIntentId: intent.providerIntentId ?? null,
    providerCaptureId: intent.providerCaptureId ?? null,
    providerLatestChargeId: intent.providerLatestChargeId ?? null,
    receiptEmail: intent.receiptEmail ?? null,
    failureCode: intent.failureCode ?? null,
    failureMessage: intent.failureMessage ?? null
  };
}

function encryptSensitiveDetails(details) {
  return DataEncryptionService.encryptStructured(details, {
    classificationTag: 'payment.intent',
    fingerprintValues: [details.providerIntentId ?? '', details.receiptEmail ?? '']
  });
}

function maskSensitiveColumns(details, fallbackIdentifier) {
  const providerIntentSource = details.providerIntentId ?? fallbackIdentifier;
  return {
    provider_intent_id: providerIntentSource
      ? DataEncryptionService.hash(providerIntentSource)
      : DataEncryptionService.hash(fallbackIdentifier ?? randomUUID()),
    provider_capture_id: details.providerCaptureId
      ? DataEncryptionService.hash(details.providerCaptureId)
      : null,
    provider_latest_charge_id: details.providerLatestChargeId
      ? DataEncryptionService.hash(details.providerLatestChargeId)
      : null,
    receipt_email: details.receiptEmail ? 'encrypted' : null,
    failure_code: details.failureCode ? 'encrypted' : null,
    failure_message: details.failureMessage ? 'encrypted' : null
  };
}

function deserializeSensitive(record) {
  const encrypted = record.sensitiveDetailsCiphertext
    ? DataEncryptionService.decryptStructured(record.sensitiveDetailsCiphertext, record.encryptionKeyVersion)
    : null;

  const fallback = {
    providerIntentId: record.providerIntentHash ?? null,
    providerCaptureId: record.providerCaptureHash ?? null,
    providerLatestChargeId: record.providerLatestChargeHash ?? null,
    receiptEmail: record.receiptEmailMask ?? null,
    failureCode: record.failureCodeMask ?? null,
    failureMessage: record.failureMessageMask ?? null
  };

  if (!encrypted) {
    return fallback;
  }

  return {
    ...fallback,
    ...encrypted
  };
}

function toDbPayload(intent) {
  const sensitive = buildSensitiveDetails(intent);
  const encrypted = encryptSensitiveDetails(sensitive);
  const masked = maskSensitiveColumns(sensitive, intent.providerIntentId ?? intent.publicId ?? randomUUID());

  return {
    public_id: intent.publicId ?? randomUUID(),
    user_id: intent.userId ?? null,
    provider: intent.provider,
    status: intent.status ?? 'requires_payment_method',
    currency: intent.currency,
    amount_subtotal: intent.amountSubtotal,
    amount_discount: intent.amountDiscount ?? 0,
    amount_tax: intent.amountTax ?? 0,
    amount_total: intent.amountTotal,
    amount_refunded: intent.amountRefunded ?? 0,
    tax_breakdown: JSON.stringify(intent.taxBreakdown ?? {}),
    metadata: JSON.stringify(intent.metadata ?? {}),
    coupon_id: intent.couponId ?? null,
    entity_type: intent.entityType,
    entity_id: intent.entityId,
    captured_at: intent.capturedAt ?? null,
    canceled_at: intent.canceledAt ?? null,
    expires_at: intent.expiresAt ?? null,
    ...masked,
    sensitive_details_ciphertext: encrypted.ciphertext,
    sensitive_details_hash: encrypted.hash,
    classification_tag: encrypted.classificationTag,
    encryption_key_version: encrypted.keyId
  };
}

function deserialize(record) {
  const sensitive = deserializeSensitive(record);
  return {
    id: record.id,
    publicId: record.publicId,
    userId: record.userId,
    provider: record.provider,
    providerIntentId: sensitive.providerIntentId,
    providerCaptureId: sensitive.providerCaptureId,
    providerLatestChargeId: sensitive.providerLatestChargeId,
    status: record.status,
    currency: record.currency,
    amountSubtotal: coerceAmount(record.amountSubtotal),
    amountDiscount: coerceAmount(record.amountDiscount),
    amountTax: coerceAmount(record.amountTax),
    amountTotal: coerceAmount(record.amountTotal),
    amountRefunded: coerceAmount(record.amountRefunded),
    taxBreakdown: parseJson(record.taxBreakdown),
    metadata: parseJson(record.metadata),
    couponId: record.couponId,
    entityType: record.entityType,
    entityId: record.entityId,
    receiptEmail: sensitive.receiptEmail,
    capturedAt: record.capturedAt,
    canceledAt: record.canceledAt,
    expiresAt: record.expiresAt,
    failureCode: sensitive.failureCode,
    failureMessage: sensitive.failureMessage,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    sensitiveDetailsHash: record.sensitiveDetailsHash,
    sensitiveClassification: record.sensitiveClassification
  };
}

function pickSensitiveUpdates(updates) {
  const allowed = ['providerIntentId', 'providerCaptureId', 'providerLatestChargeId', 'receiptEmail', 'failureCode', 'failureMessage'];
  return allowed.reduce((acc, key) => {
    if (Object.prototype.hasOwnProperty.call(updates, key)) {
      acc[key] = updates[key];
    }
    return acc;
  }, {});
}

export default class PaymentIntentModel {
  static async listByUser(userId, { limit = 25 } = {}, connection = db) {
    if (!userId) {
      return [];
    }

    const rows = await connection(TABLE)
      .select(BASE_COLUMNS)
      .where({ user_id: userId })
      .orderBy('created_at', 'desc')
      .limit(limit);

    return rows.map((row) => deserialize(row));
  }

  static async create(intent, connection = db) {
    const payload = toDbPayload(intent);
    const [id] = await connection(TABLE).insert(payload);
    return this.findById(id, connection);
  }

  static async findById(id, connection = db) {
    const record = await connection(TABLE).select(BASE_COLUMNS).where({ id }).first();
    return record ? deserialize(record) : null;
  }

  static async findByPublicId(publicId, connection = db) {
    const record = await connection(TABLE).select(BASE_COLUMNS).where({ public_id: publicId }).first();
    return record ? deserialize(record) : null;
  }

  static async findByProviderIntentId(providerIntentId, connection = db) {
    const fingerprint = DataEncryptionService.hash(providerIntentId);
    const record = await connection(TABLE)
      .select(BASE_COLUMNS)
      .where({ provider_intent_id: fingerprint })
      .first();
    if (record) {
      return deserialize(record);
    }

    // Fallback for legacy rows stored without hashing
    const legacyRecord = await connection(TABLE)
      .select(BASE_COLUMNS)
      .where({ provider_intent_id: providerIntentId })
      .first();
    return legacyRecord ? deserialize(legacyRecord) : null;
  }

  static async lockByPublicId(publicId, connection = db) {
    const record = await connection(TABLE).where({ public_id: publicId }).forUpdate().first();
    return record ? deserialize(record) : null;
  }

  static async updateById(id, updates, connection = db) {
    const currentRecord = await connection(TABLE).select(BASE_COLUMNS).where({ id }).first();
    if (!currentRecord) {
      return null;
    }

    const sensitiveUpdates = pickSensitiveUpdates(updates);
    const mergedSensitive = {
      ...deserializeSensitive(currentRecord),
      ...sensitiveUpdates
    };
    const encrypted = encryptSensitiveDetails(mergedSensitive);
    const masked = maskSensitiveColumns(mergedSensitive, currentRecord.publicId);

    const payload = {
      ...masked,
      sensitive_details_ciphertext: encrypted.ciphertext,
      sensitive_details_hash: encrypted.hash,
      classification_tag: encrypted.classificationTag,
      encryption_key_version: encrypted.keyId
    };

    if (updates.status) payload.status = updates.status;
    if (updates.currency) payload.currency = updates.currency;
    if (updates.amountSubtotal !== undefined) payload.amount_subtotal = updates.amountSubtotal;
    if (updates.amountDiscount !== undefined) payload.amount_discount = updates.amountDiscount;
    if (updates.amountTax !== undefined) payload.amount_tax = updates.amountTax;
    if (updates.amountTotal !== undefined) payload.amount_total = updates.amountTotal;
    if (updates.amountRefunded !== undefined) payload.amount_refunded = updates.amountRefunded;
    if (updates.taxBreakdown) payload.tax_breakdown = JSON.stringify(updates.taxBreakdown);
    if (updates.metadata) payload.metadata = JSON.stringify(updates.metadata);
    if (updates.couponId !== undefined) payload.coupon_id = updates.couponId;
    if (updates.entityType) payload.entity_type = updates.entityType;
    if (updates.entityId) payload.entity_id = updates.entityId;
    if (updates.capturedAt !== undefined) payload.captured_at = updates.capturedAt;
    if (updates.canceledAt !== undefined) payload.canceled_at = updates.canceledAt;
    if (updates.expiresAt !== undefined) payload.expires_at = updates.expiresAt;

    await connection(TABLE)
      .where({ id })
      .update({ ...payload, updated_at: connection.fn.now() });

    return this.findById(id, connection);
  }

  static async updateByPublicId(publicId, updates, connection = db) {
    const intent = await connection(TABLE).select(['id']).where({ public_id: publicId }).first();
    if (!intent) {
      return null;
    }
    await this.updateById(intent.id, updates, connection);
    return this.findById(intent.id, connection);
  }

  static async incrementRefundAmount(id, amount, connection = db) {
    await connection(TABLE)
      .where({ id })
      .increment('amount_refunded', amount)
      .update({ updated_at: connection.fn.now() });
  }
}
