import db from '../config/database.js';
import {
  ensureIntegerInRange,
  ensureNonEmptyString,
  normaliseOptionalString,
  readJsonColumn,
  writeJsonColumn
} from '../utils/modelUtils.js';

const TABLE = 'community_member_point_transactions';

function normalisePrimaryId(value, fieldName, { required = true } = {}) {
  if (value === undefined || value === null || value === '') {
    if (required) {
      throw new Error(`${fieldName} is required`);
    }
    return null;
  }

  return ensureIntegerInRange(value, { fieldName, min: 1 });
}

function normaliseDeltaPoints(value) {
  return ensureIntegerInRange(value, {
    fieldName: 'deltaPoints',
    min: -1_000_000,
    max: 1_000_000
  });
}

function normaliseBalanceAfter(value) {
  return ensureIntegerInRange(value, {
    fieldName: 'balanceAfter',
    min: 0,
    max: 20_000_000
  });
}

function normaliseTimestamp(value, { fieldName, defaultValue } = {}) {
  if (value === undefined || value === null || value === '') {
    return defaultValue ?? null;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${fieldName} must be a valid datetime`);
  }
  return date;
}

function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    communityId: row.community_id,
    userId: row.user_id,
    awardedBy: row.awarded_by ?? null,
    deltaPoints: Number(row.delta_points ?? 0),
    balanceAfter: Number(row.balance_after ?? 0),
    reason: row.reason,
    source: row.source,
    referenceId: row.reference_id ?? null,
    metadata: readJsonColumn(row.metadata, {}),
    awardedAt: row.awarded_at ?? null
  };
}

function buildInsertPayload(transaction, connection) {
  if (!transaction) {
    throw new Error('Transaction payload is required');
  }

  return {
    community_id: normalisePrimaryId(transaction.communityId, 'communityId'),
    user_id: normalisePrimaryId(transaction.userId, 'userId'),
    awarded_by: normalisePrimaryId(transaction.awardedBy, 'awardedBy', { required: false }),
    delta_points: normaliseDeltaPoints(transaction.deltaPoints),
    balance_after: normaliseBalanceAfter(transaction.balanceAfter),
    reason: ensureNonEmptyString(transaction.reason, { fieldName: 'reason', maxLength: 240 }),
    source: normaliseOptionalString(transaction.source ?? 'manual', { maxLength: 120 }) ?? 'manual',
    reference_id: normaliseOptionalString(transaction.referenceId, { maxLength: 120 }),
    metadata: writeJsonColumn(transaction.metadata, {}),
    awarded_at: normaliseTimestamp(transaction.awardedAt, {
      fieldName: 'awardedAt',
      defaultValue: connection.fn.now()
    })
  };
}

export default class CommunityMemberPointTransactionModel {
  static table(connection = db) {
    return connection(TABLE);
  }

  static async create(transaction, connection = db) {
    const payload = buildInsertPayload(transaction, connection);
    const [id] = await this.table(connection).insert(payload);
    const row = await this.table(connection).where({ id }).first();
    return mapRow(row);
  }

  static async listRecentForUser(communityId, userId, { limit = 20 } = {}, connection = db) {
    const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 200);

    const rows = await this.table(connection)
      .where({
        community_id: normalisePrimaryId(communityId, 'communityId'),
        user_id: normalisePrimaryId(userId, 'userId')
      })
      .orderBy('awarded_at', 'desc')
      .limit(safeLimit);

    return rows.map((row) => mapRow(row));
  }
}
