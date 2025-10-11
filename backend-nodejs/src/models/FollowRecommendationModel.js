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

function mapRecord(record) {
  if (!record) return null;
  return {
    id: record.id,
    userId: record.user_id,
    recommendedUserId: record.recommended_user_id,
    score: Number(record.score ?? 0),
    mutualFollowersCount: Number(record.mutual_followers_count ?? 0),
    reasonCode: record.reason_code,
    metadata: parseJson(record.metadata, {}),
    generatedAt: record.generated_at,
    consumedAt: record.consumed_at,
    createdAt: record.created_at,
    updatedAt: record.updated_at
  };
}

function mapRowWithUser(row) {
  if (!row) return null;
  return {
    recommendation: mapRecord(row),
    user: {
      id: row.recommended_user_id,
      firstName: row.first_name,
      lastName: row.last_name,
      role: row.role,
      email: row.email
    }
  };
}

export default class FollowRecommendationModel {
  static async upsert(userId, recommendedUserId, payload = {}, connection = db) {
    const data = {
      user_id: userId,
      recommended_user_id: recommendedUserId,
      score: payload.score ?? 0,
      mutual_followers_count: payload.mutualFollowersCount ?? 0,
      reason_code: payload.reasonCode ?? 'mutual_followers',
      metadata: JSON.stringify(payload.metadata ?? {}),
      generated_at: payload.generatedAt ?? connection.fn.now()
    };

    await connection('user_follow_recommendations')
      .insert(data)
      .onConflict(['user_id', 'recommended_user_id'])
      .merge({
        score: data.score,
        mutual_followers_count: data.mutual_followers_count,
        reason_code: data.reason_code,
        metadata: data.metadata,
        generated_at: data.generated_at,
        updated_at: connection.fn.now(),
        consumed_at: payload.consumedAt ?? null
      });

    const record = await connection('user_follow_recommendations')
      .where({ user_id: userId, recommended_user_id: recommendedUserId })
      .first();
    return mapRecord(record);
  }

  static async markConsumed(userId, recommendedUserId, status, connection = db) {
    await connection('user_follow_recommendations')
      .where({ user_id: userId, recommended_user_id: recommendedUserId })
      .update({
        consumed_at: connection.fn.now(),
        reason_code: status ? `consumed:${status}` : 'consumed',
        updated_at: connection.fn.now()
      });
  }

  static async delete(userId, recommendedUserId, connection = db) {
    await connection('user_follow_recommendations')
      .where({ user_id: userId, recommended_user_id: recommendedUserId })
      .del();
  }

  static async listForUser(userId, { limit = 10 } = {}, connection = db) {
    const rows = await connection('user_follow_recommendations as rec')
      .innerJoin('users as u', 'u.id', 'rec.recommended_user_id')
      .where('rec.user_id', userId)
      .orderBy('rec.score', 'desc')
      .limit(limit);
    return rows.map((row) => mapRowWithUser(row));
  }
}
