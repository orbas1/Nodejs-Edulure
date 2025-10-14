import db from '../config/database.js';

function parseJson(value, fallback) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (_error) {
    return fallback;
  }
}

function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    communityId: row.community_id,
    userId: row.user_id,
    currentStreakDays: Number(row.current_streak_days ?? 0),
    longestStreakDays: Number(row.longest_streak_days ?? 0),
    lastActiveOn: row.last_active_on ?? null,
    resumedAt: row.resumed_at ?? null,
    metadata: parseJson(row.metadata, {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export default class CommunityMemberStreakModel {
  static table(connection = db) {
    return connection('community_member_streaks');
  }

  static async find(communityId, userId, connection = db) {
    const row = await this.table(connection)
      .where({ community_id: communityId, user_id: userId })
      .first();
    return mapRow(row);
  }

  static async lock(communityId, userId, connection = db) {
    const row = await this.table(connection)
      .where({ community_id: communityId, user_id: userId })
      .forUpdate()
      .first();
    return mapRow(row);
  }

  static async save(streak, connection = db) {
    const payload = {
      community_id: streak.communityId,
      user_id: streak.userId,
      current_streak_days: streak.currentStreakDays,
      longest_streak_days: streak.longestStreakDays,
      last_active_on: streak.lastActiveOn ?? null,
      resumed_at: streak.resumedAt ?? null,
      metadata: JSON.stringify(streak.metadata ?? {})
    };

    const existing = await this.table(connection)
      .where({ community_id: streak.communityId, user_id: streak.userId })
      .first();

    if (existing) {
      await this.table(connection)
        .where({ community_id: streak.communityId, user_id: streak.userId })
        .update({
          ...payload,
          updated_at: connection.fn.now()
        });
    } else {
      await this.table(connection).insert(payload);
    }

    return this.find(streak.communityId, streak.userId, connection);
  }
}
