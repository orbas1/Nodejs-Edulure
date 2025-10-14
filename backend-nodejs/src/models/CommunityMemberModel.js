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

function mapRecord(record) {
  if (!record) return null;
  return {
    id: record.id,
    communityId: record.community_id,
    userId: record.user_id,
    role: record.role,
    status: record.status,
    joinedAt: record.joined_at,
    updatedAt: record.updated_at,
    leftAt: record.left_at,
    metadata: parseJson(record.metadata, {})
  };
}

export default class CommunityMemberModel {
  static async create(member, connection = db) {
    const payload = {
      community_id: member.communityId,
      user_id: member.userId,
      role: member.role ?? 'member',
      status: member.status ?? 'active',
      joined_at: member.joinedAt ?? connection.fn.now(),
      metadata: JSON.stringify(member.metadata ?? {})
    };
    const [id] = await connection('community_members').insert(payload);
    const record = await connection('community_members').where({ id }).first();
    return mapRecord(record);
  }

  static async findMembership(communityId, userId, connection = db) {
    const record = await connection('community_members as cm')
      .where('cm.community_id', communityId)
      .andWhere('cm.user_id', userId)
      .first();
    return mapRecord(record);
  }

  static async ensureMembership(communityId, userId, defaults = {}, connection = db) {
    const existing = await this.findMembership(communityId, userId, connection);
    if (existing) {
      return existing;
    }
    return this.create(
      {
        communityId,
        userId,
        role: defaults.role ?? 'member',
        status: defaults.status ?? 'active',
        metadata: defaults.metadata ?? {}
      },
      connection
    );
  }

  static async updateRole(communityId, userId, role, connection = db) {
    await connection('community_members')
      .where({ community_id: communityId, user_id: userId })
      .update({ role, updated_at: connection.fn.now() });
    return this.findMembership(communityId, userId, connection);
  }

  static async updateStatus(communityId, userId, status, connection = db) {
    await connection('community_members')
      .where({ community_id: communityId, user_id: userId })
      .update({ status, updated_at: connection.fn.now() });
    return this.findMembership(communityId, userId, connection);
  }

  static async updateMetadata(communityId, userId, metadata, connection = db) {
    await connection('community_members')
      .where({ community_id: communityId, user_id: userId })
      .update({ metadata: JSON.stringify(metadata ?? {}), updated_at: connection.fn.now() });
    return this.findMembership(communityId, userId, connection);
  }

  static async listByCommunity(communityId, { status, role } = {}, connection = db) {
    const query = connection('community_members').where({ community_id: communityId });
    if (status) {
      query.andWhere({ status });
    }
    if (role) {
      query.andWhere({ role });
    }
    const rows = await query.orderBy('joined_at', 'asc');
    return rows.map((row) => mapRecord(row));
  }
}
