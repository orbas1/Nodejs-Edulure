import db from '../config/database.js';

const TABLE = 'payment_ledger_entries';

const BASE_COLUMNS = [
  'id',
  'payment_intent_id as paymentIntentId',
  'entry_type as entryType',
  'amount',
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
  if (value === null || value === undefined) {
    return 0;
  }
  if (typeof value === 'number') {
    return value;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export default class PaymentLedgerEntryModel {
  static async record(entry, connection = db) {
    const payload = {
      payment_intent_id: entry.paymentIntentId,
      entry_type: entry.entryType,
      amount: entry.amount,
      currency: entry.currency,
      details: JSON.stringify(entry.details ?? {}),
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
      amount: coerceAmount(record.amount),
      details: parseJson(record.details)
    };
  }
}
