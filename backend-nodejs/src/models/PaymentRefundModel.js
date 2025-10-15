import { randomUUID } from 'node:crypto';

import db from '../config/database.js';
import DataEncryptionService from '../services/DataEncryptionService.js';

const TABLE = 'payment_refunds';

const BASE_COLUMNS = [
  'id',
  'public_id as publicId',
  'payment_intent_id as paymentIntentId',
  'provider_refund_id as providerRefundHash',
  'status',
  'amount',
  'currency',
  'reason',
  'requested_by as requestedBy',
  'processed_at as processedAt',
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

function buildSensitiveDetails(refund) {
  return {
    providerRefundId: refund.providerRefundId ?? null,
    failureCode: refund.failureCode ?? null,
    failureMessage: refund.failureMessage ?? null
  };
}

function encryptSensitiveDetails(details) {
  return DataEncryptionService.encryptStructured(details, {
    classificationTag: 'payment.refund',
    fingerprintValues: [details.providerRefundId ?? '']
  });
}

function maskSensitiveColumns(details, fallbackIdentifier) {
  return {
    provider_refund_id: details.providerRefundId
      ? DataEncryptionService.hash(details.providerRefundId)
      : DataEncryptionService.hash(fallbackIdentifier ?? randomUUID()),
    failure_code: details.failureCode ? 'encrypted' : null,
    failure_message: details.failureMessage ? 'encrypted' : null
  };
}

function deserializeSensitive(record) {
  const encrypted = record.sensitiveDetailsCiphertext
    ? DataEncryptionService.decryptStructured(record.sensitiveDetailsCiphertext, record.encryptionKeyVersion)
    : null;

  const fallback = {
    providerRefundId: record.providerRefundHash ?? null,
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

function toDbPayload(refund) {
  const sensitive = buildSensitiveDetails(refund);
  const encrypted = encryptSensitiveDetails(sensitive);
  const masked = maskSensitiveColumns(sensitive, refund.providerRefundId ?? refund.publicId ?? randomUUID());

  return {
    public_id: refund.publicId ?? randomUUID(),
    payment_intent_id: refund.paymentIntentId,
    status: refund.status ?? 'pending',
    amount: refund.amount,
    currency: refund.currency,
    reason: refund.reason ?? null,
    requested_by: refund.requestedBy ?? null,
    processed_at: refund.processedAt ?? null,
    ...masked,
    sensitive_details_ciphertext: encrypted.ciphertext,
    sensitive_details_hash: encrypted.hash,
    classification_tag: encrypted.classificationTag,
    encryption_key_version: encrypted.keyId
  };
}

function pickSensitiveUpdates(updates) {
  const allowed = ['providerRefundId', 'failureCode', 'failureMessage'];
  return allowed.reduce((acc, key) => {
    if (Object.prototype.hasOwnProperty.call(updates, key)) {
      acc[key] = updates[key];
    }
    return acc;
  }, {});
}

export default class PaymentRefundModel {
  static async create(refund, connection = db) {
    const payload = toDbPayload(refund);
    const [id] = await connection(TABLE).insert(payload);
    return this.findById(id, connection);
  }

  static async findById(id, connection = db) {
    const record = await connection(TABLE).select(BASE_COLUMNS).where({ id }).first();
    return record ? this.deserialize(record) : null;
  }

  static async findByPublicId(publicId, connection = db) {
    const record = await connection(TABLE)
      .select(BASE_COLUMNS)
      .where({ public_id: publicId })
      .first();
    return record ? this.deserialize(record) : null;
  }

  static async findByProviderRefundId(providerRefundId, connection = db) {
    const fingerprint = DataEncryptionService.hash(providerRefundId);
    const record = await connection(TABLE)
      .select(BASE_COLUMNS)
      .where({ provider_refund_id: fingerprint })
      .first();
    if (record) {
      return this.deserialize(record);
    }
    const legacyRecord = await connection(TABLE)
      .select(BASE_COLUMNS)
      .where({ provider_refund_id: providerRefundId })
      .first();
    return legacyRecord ? this.deserialize(legacyRecord) : null;
  }

  static deserialize(record) {
    const sensitive = deserializeSensitive(record);
    return {
      id: record.id,
      publicId: record.publicId,
      paymentIntentId: record.paymentIntentId,
      providerRefundId: sensitive.providerRefundId,
      status: record.status,
      amount: coerceAmount(record.amount),
      currency: record.currency,
      reason: record.reason ?? null,
      requestedBy: record.requestedBy ?? null,
      processedAt: record.processedAt ?? null,
      failureCode: sensitive.failureCode,
      failureMessage: sensitive.failureMessage,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      sensitiveDetailsHash: record.sensitiveDetailsHash,
      sensitiveClassification: record.sensitiveClassification
    };
  }

  static async updateById(id, updates, connection = db) {
    const record = await connection(TABLE).select(BASE_COLUMNS).where({ id }).first();
    if (!record) {
      return null;
    }

    const sensitiveUpdates = pickSensitiveUpdates(updates);
    const mergedSensitive = { ...deserializeSensitive(record), ...sensitiveUpdates };
    const encrypted = encryptSensitiveDetails(mergedSensitive);
    const masked = maskSensitiveColumns(mergedSensitive, record.publicId);

    const payload = {
      ...masked,
      sensitive_details_ciphertext: encrypted.ciphertext,
      sensitive_details_hash: encrypted.hash,
      classification_tag: encrypted.classificationTag,
      encryption_key_version: encrypted.keyId
    };

    if (updates.status) payload.status = updates.status;
    if (updates.processedAt !== undefined) payload.processed_at = updates.processedAt;
    if (updates.amount !== undefined) payload.amount = updates.amount;
    if (updates.reason !== undefined) payload.reason = updates.reason ?? null;

    await connection(TABLE)
      .where({ id })
      .update({ ...payload, updated_at: connection.fn.now() });

    return this.findById(id, connection);
  }
}
