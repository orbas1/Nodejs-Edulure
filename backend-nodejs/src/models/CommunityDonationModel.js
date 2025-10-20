import db from '../config/database.js';
import {
  ensureIntegerInRange,
  ensureNonEmptyString,
  normaliseOptionalString,
  readJsonColumn,
  writeJsonColumn
} from '../utils/modelUtils.js';

const TABLE = 'community_donations';
const STATUS_OPTIONS = new Set(['pending', 'succeeded', 'failed', 'refunded']);

function normalisePrimaryId(value, { fieldName, required = false } = {}) {
  if (value === undefined || value === null || value === '') {
    if (required) {
      throw new Error(`${fieldName} is required`);
    }
    return null;
  }

  return ensureIntegerInRange(value, { fieldName, min: 1 });
}

function normaliseStatus(status) {
  if (status === undefined || status === null) {
    return 'pending';
  }

  const candidate = String(status).trim().toLowerCase();
  if (!STATUS_OPTIONS.has(candidate)) {
    throw new Error(`Unsupported community donation status '${status}'`);
  }
  return candidate;
}

function normaliseCurrency(currency) {
  const value = ensureNonEmptyString(currency, { fieldName: 'currency', maxLength: 3 }).toUpperCase();
  if (!/^[A-Z]{3}$/.test(value)) {
    throw new Error('currency must be a 3-letter ISO code');
  }
  return value;
}

function normaliseAmountCents(amount) {
  if (amount === undefined || amount === null) {
    throw new Error('amountCents is required');
  }

  return ensureIntegerInRange(amount, {
    fieldName: 'amountCents',
    min: 1,
    max: 10_000_000_000
  });
}

function normaliseReferralCode(code) {
  const value = normaliseOptionalString(code, { maxLength: 60 });
  if (!value) {
    return null;
  }

  const upper = value.toUpperCase();
  if (!/^[A-Z0-9\-]{3,60}$/.test(upper)) {
    throw new Error('referralCode must contain 3-60 alphanumeric characters or dashes');
  }
  return upper;
}

function mapRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    communityId: row.community_id,
    eventId: row.event_id ?? null,
    paymentIntentId: row.payment_intent_id,
    userId: row.user_id ?? null,
    affiliateId: row.affiliate_id ?? null,
    amountCents: Number(row.amount_cents ?? 0),
    currency: row.currency,
    status: row.status,
    referralCode: row.referral_code ?? null,
    donorName: row.donor_name ?? null,
    message: row.message ?? null,
    metadata: readJsonColumn(row.metadata, {}),
    capturedAt: row.captured_at ?? null,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null
  };
}

function buildInsertPayload(donation) {
  if (!donation) {
    throw new Error('Donation payload is required');
  }

  return {
    community_id: normalisePrimaryId(donation.communityId, { fieldName: 'communityId', required: true }),
    event_id: normalisePrimaryId(donation.eventId, { fieldName: 'eventId' }),
    payment_intent_id: normalisePrimaryId(donation.paymentIntentId, {
      fieldName: 'paymentIntentId',
      required: true
    }),
    user_id: normalisePrimaryId(donation.userId, { fieldName: 'userId' }),
    affiliate_id: normalisePrimaryId(donation.affiliateId, { fieldName: 'affiliateId' }),
    amount_cents: normaliseAmountCents(donation.amountCents),
    currency: normaliseCurrency(donation.currency),
    status: normaliseStatus(donation.status),
    referral_code: normaliseReferralCode(donation.referralCode),
    donor_name: normaliseOptionalString(donation.donorName, { fieldName: 'donorName', maxLength: 120 }),
    message: normaliseOptionalString(donation.message, { fieldName: 'message', maxLength: 2000 }),
    metadata: writeJsonColumn(donation.metadata, {}),
    captured_at: donation.capturedAt ?? null
  };
}

function buildUpdatePayload(updates) {
  const payload = {};

  if (updates.status !== undefined) {
    payload.status = normaliseStatus(updates.status);
  }

  if (updates.affiliateId !== undefined) {
    payload.affiliate_id = normalisePrimaryId(updates.affiliateId, {
      fieldName: 'affiliateId'
    });
  }

  if (updates.amountCents !== undefined) {
    payload.amount_cents = normaliseAmountCents(updates.amountCents);
  }

  if (updates.currency !== undefined) {
    payload.currency = normaliseCurrency(updates.currency);
  }

  if (updates.referralCode !== undefined) {
    payload.referral_code = normaliseReferralCode(updates.referralCode);
  }

  if (updates.donorName !== undefined) {
    payload.donor_name = normaliseOptionalString(updates.donorName, {
      fieldName: 'donorName',
      maxLength: 120
    });
  }

  if (updates.message !== undefined) {
    payload.message = normaliseOptionalString(updates.message, {
      fieldName: 'message',
      maxLength: 2000
    });
  }

  if (updates.metadata !== undefined) {
    payload.metadata = writeJsonColumn(updates.metadata, {});
  }

  if (updates.capturedAt !== undefined) {
    payload.captured_at = updates.capturedAt ?? null;
  }

  return payload;
}

export default class CommunityDonationModel {
  static table(connection = db) {
    return connection(TABLE);
  }

  static async create(donation, connection = db) {
    const payload = buildInsertPayload(donation);
    const [id] = await this.table(connection).insert(payload);
    return this.findById(id, connection);
  }

  static async updateById(id, updates, connection = db) {
    const payload = buildUpdatePayload(updates ?? {});

    if (Object.keys(payload).length === 0) {
      return this.findById(id, connection);
    }

    await this.table(connection)
      .where({ id })
      .update({ ...payload, updated_at: connection.fn.now() });

    return this.findById(id, connection);
  }

  static async findById(id, connection = db) {
    const row = await this.table(connection).where({ id }).first();
    return mapRow(row);
  }

  static async findByPaymentIntent(paymentIntentId, connection = db) {
    const row = await this.table(connection)
      .where({ payment_intent_id: normalisePrimaryId(paymentIntentId, { fieldName: 'paymentIntentId', required: true }) })
      .first();
    return mapRow(row);
  }

  static async listByCommunity(communityId, { status, limit = 50, offset = 0 } = {}, connection = db) {
    const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);
    const safeOffset = Math.max(Number(offset) || 0, 0);

    const query = this.table(connection)
      .where({ community_id: normalisePrimaryId(communityId, { fieldName: 'communityId', required: true }) })
      .orderBy('created_at', 'desc')
      .limit(safeLimit)
      .offset(safeOffset);

    if (status !== undefined) {
      query.andWhere({ status: normaliseStatus(status) });
    }

    const rows = await query;
    return rows.map((row) => mapRow(row));
  }
}
