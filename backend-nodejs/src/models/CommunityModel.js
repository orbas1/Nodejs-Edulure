import db from '../config/database.js';

const COMMUNITY_COLUMNS = [
  'c.id',
  'c.name',
  'c.slug',
  'c.description',
  'c.cover_image_url as coverImageUrl',
  'c.visibility',
  'c.owner_id as ownerId',
  'c.created_at as createdAt',
  'c.updated_at as updatedAt'
];

export default class CommunityModel {
  static async listByUser(userId) {
    return db('community_members as cm')
      .innerJoin('communities as c', 'cm.community_id', 'c.id')
      .select([...COMMUNITY_COLUMNS, 'cm.role as memberRole', 'cm.status as memberStatus'])
      .where('cm.user_id', userId)
      .andWhere('cm.status', 'active')
      .andWhereNull('c.deleted_at')
      .orderBy('c.created_at', 'desc');
  }

  static async create(community, connection = db) {
    const payload = {
      name: community.name,
      slug: community.slug,
      description: community.description ?? null,
      cover_image_url: community.coverImageUrl ?? null,
      owner_id: community.ownerId,
      visibility: community.visibility ?? 'public',
      metadata: JSON.stringify(community.metadata ?? {})
    };
    const [id] = await connection('communities').insert(payload);
    return connection('communities as c')
      .select(COMMUNITY_COLUMNS)
      .where('c.id', id)
      .first();
  }

  static async findBySlug(slug, connection = db) {
    return connection('communities').where({ slug }).andWhereNull('deleted_at').first();
  }
}
