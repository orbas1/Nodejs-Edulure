import db from '../config/database.js';

export default class CommunityMemberModel {
  static async create(member, connection = db) {
    const payload = {
      community_id: member.communityId,
      user_id: member.userId,
      role: member.role ?? 'member',
      status: member.status ?? 'active'
    };
    const [id] = await connection('community_members').insert(payload);
    return connection('community_members').where({ id }).first();
  }

  static async findMembership(communityId, userId, connection = db) {
    return connection('community_members as cm')
      .where('cm.community_id', communityId)
      .andWhere('cm.user_id', userId)
      .first();
  }
}
