import db from '../config/database.js';
import DataEncryptionService from '../services/DataEncryptionService.js';
import { ensureIntegerInRange, normaliseOptionalString, readJsonColumn, writeJsonColumn } from '../utils/modelUtils.js';

const BASE_COLUMNS = [
  'cap.id',
  'cap.affiliate_id as affiliateId',
  'cap.amount_cents as amountCents',
  'cap.status',
  'cap.payout_reference as payoutReferenceMask',
  'cap.scheduled_at as scheduledAt',
  'cap.processed_at as processedAt',
  'cap.failure_reason as failureReasonMask',
  'cap.metadata',
  'cap.disbursement_payload_ciphertext as disbursementCiphertext',
  'cap.disbursement_payload_hash as disbursementHash',
  'cap.classification_tag as disbursementClassification',
  'cap.encryption_key_version as encryptionKeyVersion',
  'cap.created_at as createdAt',
  'cap.updated_at as updatedAt'
];

function buildDisbursement(details) {
  return {
    payoutReference: details.payoutReference ?? null,
    failureReason: details.failureReason ?? null
  };
}

function encryptDisbursement(details) {
  return DataEncryptionService.encryptStructured(details, {
    classificationTag: 'payout.affiliate',
    fingerprintValues: [details.payoutReference ?? '', details.failureReason ?? '']
  });
}

function maskDisbursement(details, fallback) {
  return {
    payout_reference: details.payoutReference
      ? DataEncryptionService.hash(details.payoutReference).slice(0, 120)
      : fallback,
    failure_reason: details.failureReason ? 'encrypted' : null
  };
}

function deserializeDisbursement(row) {
  const encrypted = row.disbursementCiphertext
    ? DataEncryptionService.decryptStructured(row.disbursementCiphertext, row.encryptionKeyVersion)
    : null;
  const fallback = {
    payoutReference: row.payoutReferenceMask ?? null,
    failureReason: row.failureReasonMask ?? null
  };

  if (!encrypted) {
    return fallback;
  }

  return {
    ...fallback,
    ...encrypted
  };
}

const PAYOUT_STATUSES = new Set(['pending', 'scheduled', 'processing', 'completed', 'failed', 'cancelled']);

function normaliseStatus(status) {
  if (!status) {
    return 'pending';
  }
  const candidate = String(status).trim().toLowerCase();
  if (!PAYOUT_STATUSES.has(candidate)) {
    throw new Error(`Unsupported affiliate payout status '${status}'`);
  }
  return candidate;
}

function mapRecord(record) {
  if (!record) return null;
  const disbursement = deserializeDisbursement(record);
  return {
    id: record.id,
    affiliateId: record.affiliateId,
    amountCents: Number(record.amountCents),
    status: record.status,
    payoutReference: disbursement.payoutReference,
    scheduledAt: record.scheduledAt,
    processedAt: record.processedAt,
    failureReason: disbursement.failureReason,
    metadata: readJsonColumn(record.metadata, {}),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    disbursementHash: record.disbursementHash,
    disbursementClassification: record.disbursementClassification
  };
}

function normaliseDisbursementDetails(payout) {
  return {
    payoutReference: normaliseOptionalString(payout.payoutReference, { maxLength: 120 }),
    failureReason: normaliseOptionalString(payout.failureReason, { maxLength: 400 })
  };
}

function buildInsertPayload(payout) {
  const disbursement = buildDisbursement(payout);
  const encrypted = encryptDisbursement(disbursement);
  const masked = maskDisbursement(disbursement, `enc-${payout.affiliateId ?? 'affiliate'}`);

  return {
    affiliate_id: ensureIntegerInRange(payout.affiliateId, { fieldName: 'affiliateId', min: 1 }),
    amount_cents: ensureIntegerInRange(payout.amountCents, { fieldName: 'amountCents', min: 1 }),
    status: normaliseStatus(payout.status),
    payout_reference: masked.payout_reference,
    scheduled_at: payout.scheduledAt ?? null,
    processed_at: payout.processedAt ?? null,
    failure_reason: masked.failure_reason,
    metadata: writeJsonColumn(payout.metadata, {}),
    disbursement_payload_ciphertext: encrypted.ciphertext,
    disbursement_payload_hash: encrypted.hash,
    classification_tag: encrypted.classificationTag,
    encryption_key_version: encrypted.keyId
  };
}

function buildUpdatePayload(payout, existing) {
  const current = deserializeDisbursement(existing);
  const overrides = normaliseDisbursementDetails({
    payoutReference: payout.payoutReference ?? current.payoutReference,
    failureReason: payout.failureReason ?? current.failureReason
  });
  const disbursement = buildDisbursement(overrides);
  const encrypted = encryptDisbursement(disbursement);
  const masked = maskDisbursement(disbursement, existing.payoutReferenceMask ?? `enc-${existing.affiliateId}`);

  return {
    payout_reference: masked.payout_reference,
    failure_reason: masked.failure_reason,
    disbursement_payload_ciphertext: encrypted.ciphertext,
    disbursement_payload_hash: encrypted.hash,
    classification_tag: encrypted.classificationTag,
    encryption_key_version: encrypted.keyId
  };
}

export default class CommunityAffiliatePayoutModel {
  static async create(payout, connection = db) {
    const payload = buildInsertPayload({ ...payout, ...normaliseDisbursementDetails(payout) });
    const [id] = await connection('community_affiliate_payouts').insert(payload);
    return this.findById(id, connection);
  }

  static async updateStatus(id, updates, connection = db) {
    const current = await connection('community_affiliate_payouts as cap')
      .select(BASE_COLUMNS)
      .where({ id })
      .first();
    if (!current) {
      return null;
    }

    const disbursementUpdates = buildUpdatePayload(updates, current);
    const payload = { ...disbursementUpdates };

    if (updates.status !== undefined) payload.status = normaliseStatus(updates.status);
    if (updates.processedAt !== undefined) payload.processed_at = updates.processedAt;
    if (updates.scheduledAt !== undefined) payload.scheduled_at = updates.scheduledAt;
    if (updates.metadata !== undefined) payload.metadata = writeJsonColumn(updates.metadata, {});

    await connection('community_affiliate_payouts')
      .where({ id })
      .update({ ...payload, updated_at: connection.fn.now() });

    return this.findById(id, connection);
  }

  static async findById(id, connection = db) {
    const record = await connection('community_affiliate_payouts as cap').select(BASE_COLUMNS).where({ id }).first();
    return mapRecord(record);
  }

  static async listByAffiliate(affiliateId, connection = db) {
    const rows = await connection('community_affiliate_payouts as cap')
      .select(BASE_COLUMNS)
      .where({ affiliate_id: affiliateId })
      .orderBy('created_at', 'desc');
    return rows.map((row) => mapRecord(row));
  }
}
