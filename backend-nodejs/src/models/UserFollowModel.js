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

function mapRelationship(record) {
  if (!record) return null;
  return {
    id: record.id,
    followerId: record.follower_id,
    followingId: record.following_id,
    status: record.status,
    source: record.source ?? null,
    reason: record.reason ?? null,
    acceptedAt: record.accepted_at,
    metadata: parseJson(record.metadata, {}),
    createdAt: record.created_at,
    updatedAt: record.updated_at
  };
}

function mapUserFromRow(row) {
  if (!row) return null;
  return {
    id: row.user_id,
    firstName: row.first_name,
    lastName: row.last_name,
    role: row.role,
    email: row.email,
    mutualFollowers: Number(row.mutual_followers ?? 0)
  };
}

export default class UserFollowModel {
  static async findRelationship(followerId, followingId, connection = db) {
    const record = await connection('user_follows')
      .where({ follower_id: followerId, following_id: followingId })
      .first();
    return mapRelationship(record);
  }

  static async upsertRelationship(followerId, followingId, data, connection = db) {
    const payload = {
      follower_id: followerId,
      following_id: followingId,
      status: data.status ?? 'pending',
      source: data.source ?? null,
      reason: data.reason ?? null,
      accepted_at: data.acceptedAt ?? null,
      metadata: JSON.stringify(data.metadata ?? {})
    };

    await connection('user_follows')
      .insert(payload)
      .onConflict(['follower_id', 'following_id'])
      .merge({
        status: payload.status,
        source: payload.source,
        reason: payload.reason,
        accepted_at: payload.accepted_at,
        metadata: payload.metadata,
        updated_at: connection.fn.now()
      });

    const record = await connection('user_follows')
      .where({ follower_id: followerId, following_id: followingId })
      .first();
    return mapRelationship(record);
  }

  static async updateStatus(followerId, followingId, status, data = {}, connection = db) {
    await connection('user_follows')
      .where({ follower_id: followerId, following_id: followingId })
      .update({
        status,
        accepted_at: data.acceptedAt ?? null,
        reason: data.reason ?? null,
        updated_at: connection.fn.now()
      });
    return this.findRelationship(followerId, followingId, connection);
  }

  static async deleteRelationship(followerId, followingId, connection = db) {
    return connection('user_follows')
      .where({ follower_id: followerId, following_id: followingId })
      .del();
  }

  static async removeBetween(userIdA, userIdB, connection = db) {
    return connection('user_follows')
      .whereIn('follower_id', [userIdA, userIdB])
      .whereIn('following_id', [userIdA, userIdB])
      .del();
  }

  static async isFollowing(followerId, followingId, connection = db) {
    const record = await connection('user_follows')
      .where({ follower_id: followerId, following_id: followingId, status: 'accepted' })
      .first();
    return Boolean(record);
  }

  static async countFollowers(userId, connection = db) {
    const [{ count }] = await connection('user_follows')
      .where({ following_id: userId, status: 'accepted' })
      .count('* as count');
    return Number(count ?? 0);
  }

  static async countFollowing(userId, connection = db) {
    const [{ count }] = await connection('user_follows')
      .where({ follower_id: userId, status: 'accepted' })
      .count('* as count');
    return Number(count ?? 0);
  }

  static async listFollowers(userId, { limit = 20, offset = 0, status = 'accepted', search } = {}, connection = db) {
    const baseQuery = connection('user_follows as uf')
      .innerJoin('users as u', 'u.id', 'uf.follower_id')
      .where('uf.following_id', userId);

    if (status) {
      baseQuery.andWhere('uf.status', status);
    }

    if (search) {
      baseQuery.andWhere((builder) => {
        builder
          .where('u.first_name', 'like', `%${search}%`)
          .orWhere('u.last_name', 'like', `%${search}%`)
          .orWhere('u.email', 'like', `%${search}%`);
      });
    }

    const rows = await baseQuery
      .clone()
      .select(
        'uf.*',
        'u.id as user_id',
        'u.first_name',
        'u.last_name',
        'u.role',
        'u.email'
      )
      .orderBy('uf.created_at', 'desc')
      .limit(limit)
      .offset(offset);

    const [{ count }] = await baseQuery.clone().count('* as count');

    return {
      items: rows.map((row) => ({
        relationship: mapRelationship(row),
        user: mapUserFromRow(row)
      })),
      total: Number(count ?? 0)
    };
  }

  static async listFollowing(userId, { limit = 20, offset = 0, status = 'accepted', search } = {}, connection = db) {
    const baseQuery = connection('user_follows as uf')
      .innerJoin('users as u', 'u.id', 'uf.following_id')
      .where('uf.follower_id', userId);

    if (status) {
      baseQuery.andWhere('uf.status', status);
    }

    if (search) {
      baseQuery.andWhere((builder) => {
        builder
          .where('u.first_name', 'like', `%${search}%`)
          .orWhere('u.last_name', 'like', `%${search}%`)
          .orWhere('u.email', 'like', `%${search}%`);
      });
    }

    const rows = await baseQuery
      .clone()
      .select(
        'uf.*',
        'u.id as user_id',
        'u.first_name',
        'u.last_name',
        'u.role',
        'u.email'
      )
      .orderBy('uf.created_at', 'desc')
      .limit(limit)
      .offset(offset);

    const [{ count }] = await baseQuery.clone().count('* as count');

    return {
      items: rows.map((row) => ({
        relationship: mapRelationship(row),
        user: mapUserFromRow(row)
      })),
      total: Number(count ?? 0)
    };
  }

  static async listMutualFollowers(userId, otherUserId, connection = db) {
    const rows = await connection('user_follows as uf')
      .innerJoin('user_follows as other', function join() {
        this.on('uf.following_id', '=', 'other.following_id')
          .andOn('uf.status', '=', connection.raw('?', ['accepted']))
          .andOn('other.status', '=', connection.raw('?', ['accepted']))
          .andOn('other.follower_id', '=', connection.raw('?', [otherUserId]));
      })
      .innerJoin('users as u', 'u.id', 'uf.following_id')
      .where('uf.follower_id', userId)
      .whereNot('uf.following_id', userId)
      .whereNot('uf.following_id', otherUserId)
      .groupBy('uf.following_id', 'u.id', 'u.first_name', 'u.last_name', 'u.role', 'u.email')
      .select('uf.following_id as user_id', 'u.first_name', 'u.last_name', 'u.role', 'u.email')
      .count('* as mutual_followers');

    return rows.map((row) => mapUserFromRow(row));
  }

  static async findMutualCandidates(userId, { limit = 20, excludeIds = [] } = {}, connection = db) {
    const query = connection('user_follows as uf')
      .innerJoin('user_follows as reverse', function join() {
        this.on('uf.following_id', '=', 'reverse.follower_id')
          .andOn('reverse.following_id', '=', connection.raw('?', [userId]))
          .andOn('uf.status', '=', connection.raw('?', ['accepted']))
          .andOn('reverse.status', '=', connection.raw('?', ['accepted']));
      })
      .innerJoin('users as u', 'u.id', 'uf.follower_id')
      .whereNot('uf.follower_id', userId)
      .where('reverse.status', 'accepted')
      .whereNotIn('uf.follower_id', excludeIds)
      .groupBy('uf.follower_id', 'u.first_name', 'u.last_name', 'u.role', 'u.email')
      .select('uf.follower_id as user_id', 'u.first_name', 'u.last_name', 'u.role', 'u.email')
      .countDistinct({ mutual_followers: 'reverse.follower_id' })
      .orderBy('mutual_followers', 'desc')
      .limit(limit);

    const rows = await query;
    return rows.map((row) => mapUserFromRow(row));
  }
}
