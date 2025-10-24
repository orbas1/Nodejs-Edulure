import db from '../config/database.js';
import { normaliseCurrencyCode, toMinorUnit } from '../utils/currency.js';

const TABLE = 'payment_ledger_entries';

const BASE_COLUMNS = [
  'id',
  'payment_intent_id as paymentIntentId',
  'entry_type as entryType',
  'amount_cents as amountCents',
  'currency',
  'details',
  'recorded_at as recordedAt'
];

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

function coerceAmount(value) {
  try {
    return toMinorUnit(value, { allowNegative: true, fieldName: 'amountCents' });
  } catch (_error) {
    return 0;
  }
}

function normaliseEntryType(value) {
  if (!value) {
    return 'adjustment';
  }
  const normalised = String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '-');
  return normalised ? normalised.slice(0, 64) : 'adjustment';
}

function ensurePlainObject(value) {
  if (!value || typeof value !== 'object') {
    return {};
  }
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (_error) {
    return {};
  }
}

export default class PaymentLedgerEntryModel {
  static async record(entry, connection = db) {
    if (!entry || !entry.paymentIntentId) {
      throw new Error('paymentIntentId is required to record a ledger entry');
    }

    const amountCents = toMinorUnit(entry.amountCents ?? entry.amount ?? 0, {
      allowNegative: true,
      fieldName: 'amountCents'
    });
    const currency = normaliseCurrencyCode(entry.currency, { fallback: 'GBP' });
    const entryType = normaliseEntryType(entry.entryType);
    const details = ensurePlainObject(entry.details);

    const payload = {
      payment_intent_id: entry.paymentIntentId,
      entry_type: entryType,
      amount_cents: amountCents,
      currency,
      details: JSON.stringify({ ...details, currency, entryType }),
      recorded_at: entry.recordedAt ?? connection.fn.now()
    };

    const [id] = await connection(TABLE).insert(payload);
    return this.findById(id, connection);
  }

  static async findById(id, connection = db) {
    const record = await connection(TABLE).select(BASE_COLUMNS).where({ id }).first();
    return record ? this.deserialize(record) : null;
  }

  static async listForPayment(paymentIntentId, connection = db) {
    const rows = await connection(TABLE)
      .select(BASE_COLUMNS)
      .where({ payment_intent_id: paymentIntentId })
      .orderBy('recorded_at', 'asc');
    return rows.map((row) => this.deserialize(row));
  }

  static deserialize(record) {
    return {
      ...record,
      amountCents: coerceAmount(record.amountCents),
      currency: normaliseCurrencyCode(record.currency, { fallback: 'GBP' }),
      entryType: normaliseEntryType(record.entryType),
      details: parseJson(record.details)
    };
  }
}
