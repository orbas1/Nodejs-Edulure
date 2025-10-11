import db from '../config/database.js';

function parseJson(value, fallback) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
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
    metadata: parseJson(row.metadata, {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export default class CommunityMemberPointModel {
  static table(connection = db) {
    return connection('community_member_points');
  }

  static async findSummary(communityId, userId, connection = db) {
    const row = await this.table(connection)
      .where({ community_id: communityId, user_id: userId })
      .first();
    return mapRow(row);
  }

  static async lockSummary(communityId, userId, connection = db) {
    const row = await this.table(connection)
      .where({ community_id: communityId, user_id: userId })
      .forUpdate()
      .first();
    return mapRow(row);
  }

  static async saveSummary(summary, connection = db) {
    const payload = {
      community_id: summary.communityId,
      user_id: summary.userId,
      points: summary.points,
      lifetime_points: summary.lifetimePoints,
      tier: summary.tier,
      last_awarded_at: summary.lastAwardedAt ?? null,
      last_activity_at: summary.lastActivityAt ?? null,
      metadata: JSON.stringify(summary.metadata ?? {})
    };

    const existing = await this.table(connection)
      .where({ community_id: summary.communityId, user_id: summary.userId })
      .first();

    if (existing) {
      await this.table(connection)
        .where({ community_id: summary.communityId, user_id: summary.userId })
        .update({
          ...payload,
          updated_at: connection.fn.now()
        });
    } else {
      await this.table(connection).insert(payload);
    }

    return this.findSummary(summary.communityId, summary.userId, connection);
  }

  static async listTopByPoints(communityId, { limit = 20, offset = 0 } = {}, connection = db) {
    const rows = await this.table(connection)
      .where({ community_id: communityId })
      .orderBy('points', 'desc')
      .orderBy('lifetime_points', 'desc')
      .limit(limit)
      .offset(offset);

    return rows.map((row) => mapRow(row));
  }

  static async listTopByLifetime(communityId, { limit = 20, offset = 0 } = {}, connection = db) {
    const rows = await this.table(connection)
      .where({ community_id: communityId })
      .orderBy('lifetime_points', 'desc')
      .orderBy('points', 'desc')
      .limit(limit)
      .offset(offset);

    return rows.map((row) => mapRow(row));
  }
}
