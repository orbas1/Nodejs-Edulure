import db from '../config/database.js';
import { ensureIntegerInRange, readJsonColumn, writeJsonColumn } from '../utils/modelUtils.js';

const TABLE = 'community_member_points';

function normalisePrimaryId(value, fieldName) {
  if (value === undefined || value === null || value === '') {
    throw new Error(`${fieldName} is required`);
  }

  return ensureIntegerInRange(value, { fieldName, min: 1 });
}

function normaliseTier(value) {
  if (value === undefined || value === null || value === '') {
    return 'bronze';
  }

  const tier = String(value).trim().toLowerCase();
  if (tier.length < 2 || tier.length > 60) {
    throw new Error('tier must be between 2 and 60 characters');
  }
  if (!/^[a-z0-9_-]+$/i.test(tier)) {
    throw new Error('tier must contain only letters, numbers, underscores, or dashes');
  }
  return tier;
}

function normaliseTimestamp(value, { fieldName } = {}) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${fieldName} must be a valid datetime`);
  }
  return date;
}

function normalisePoints(value, { fieldName, min = 0 } = {}) {
  return ensureIntegerInRange(value, {
    fieldName,
    min,
    max: 10_000_000,
    defaultValue: min
  });
}

function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    communityId: row.community_id,
    userId: row.user_id,
    points: Number(row.points ?? 0),
    lifetimePoints: Number(row.lifetime_points ?? 0),
    tier: row.tier,
    lastAwardedAt: row.last_awarded_at ?? null,
    lastActivityAt: row.last_activity_at ?? null,
    metadata: readJsonColumn(row.metadata, {}),
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null
  };
}

function buildPayload(summary) {
  if (!summary) {
    throw new Error('Points summary payload is required');
  }

  return {
    community_id: normalisePrimaryId(summary.communityId, 'communityId'),
    user_id: normalisePrimaryId(summary.userId, 'userId'),
    points: normalisePoints(summary.points, { fieldName: 'points', min: 0 }),
    lifetime_points: normalisePoints(summary.lifetimePoints, { fieldName: 'lifetimePoints', min: 0 }),
    tier: normaliseTier(summary.tier),
    last_awarded_at: normaliseTimestamp(summary.lastAwardedAt, { fieldName: 'lastAwardedAt' }),
    last_activity_at: normaliseTimestamp(summary.lastActivityAt, { fieldName: 'lastActivityAt' }),
    metadata: writeJsonColumn(summary.metadata, {})
  };
}

export default class CommunityMemberPointModel {
  static table(connection = db) {
    return connection(TABLE);
  }

  static async findSummary(communityId, userId, connection = db) {
    const row = await this.table(connection)
      .where({
        community_id: normalisePrimaryId(communityId, 'communityId'),
        user_id: normalisePrimaryId(userId, 'userId')
      })
      .first();
    return mapRow(row);
  }

  static async lockSummary(communityId, userId, connection = db) {
    const query = this.table(connection)
      .where({
        community_id: normalisePrimaryId(communityId, 'communityId'),
        user_id: normalisePrimaryId(userId, 'userId')
      });

    if (typeof query.forUpdate === 'function') {
      query.forUpdate();
    }

    const row = await query.first();
    return mapRow(row);
  }

  static async saveSummary(summary, connection = db) {
    const payload = buildPayload(summary);

    const selector = {
      community_id: payload.community_id,
      user_id: payload.user_id
    };

    const existing = await this.table(connection).where(selector).first();

    if (existing) {
      await this.table(connection)
        .where(selector)
        .update({
          ...payload,
          updated_at: connection.fn.now()
        });
    } else {
      await this.table(connection).insert(payload);
    }

    return this.findSummary(payload.community_id, payload.user_id, connection);
  }

  static async listTopByPoints(communityId, { limit = 20, offset = 0 } = {}, connection = db) {
    const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 200);
    const safeOffset = Math.max(Number(offset) || 0, 0);

    const rows = await this.table(connection)
      .where({ community_id: normalisePrimaryId(communityId, 'communityId') })
      .orderBy('points', 'desc')
      .orderBy('lifetime_points', 'desc')
      .limit(safeLimit)
      .offset(safeOffset);

    return rows.map((row) => mapRow(row));
  }

  static async listTopByLifetime(communityId, { limit = 20, offset = 0 } = {}, connection = db) {
    const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 200);
    const safeOffset = Math.max(Number(offset) || 0, 0);

    const rows = await this.table(connection)
      .where({ community_id: normalisePrimaryId(communityId, 'communityId') })
      .orderBy('lifetime_points', 'desc')
      .orderBy('points', 'desc')
      .limit(safeLimit)
      .offset(safeOffset);

    return rows.map((row) => mapRow(row));
  }
}
