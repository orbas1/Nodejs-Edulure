import db from '../config/database.js';

const COMMUNITY_COLUMNS = [
  'c.id',
  'c.name',
  'c.slug',
  'c.description',
  'c.cover_image_url as coverImageUrl',
  'c.visibility',
  'c.owner_id as ownerId',
  'c.metadata',
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
    return connection('communities as c')
      .select(COMMUNITY_COLUMNS)
      .where('c.slug', slug)
      .andWhereNull('c.deleted_at')
      .first();
  }

  static async findById(id, connection = db) {
    return connection('communities as c').select(COMMUNITY_COLUMNS).where('c.id', id).first();
  }

  static async listByUserWithStats(userId, connection = db) {
    return connection('community_members as cm')
      .innerJoin('communities as c', 'cm.community_id', 'c.id')
      .select([
        ...COMMUNITY_COLUMNS,
        'cm.role as memberRole',
        'cm.status as memberStatus',
        connection.raw(
          "(SELECT COUNT(*) FROM community_members WHERE community_id = c.id AND status = 'active') as memberCount"
        ),
        connection.raw(
          "(SELECT COUNT(*) FROM community_channels WHERE community_id = c.id) as channelCount"
        ),
        connection.raw(
          "(SELECT COUNT(*) FROM community_resources WHERE community_id = c.id AND status = 'published') as resourceCount"
        ),
        connection.raw(
          "(SELECT COUNT(*) FROM community_posts WHERE community_id = c.id AND status = 'published' AND deleted_at IS NULL) as postCount"
        ),
        connection.raw(
          "GREATEST(IFNULL((SELECT MAX(published_at) FROM community_posts WHERE community_id = c.id AND status = 'published'), '1970-01-01'), IFNULL((SELECT MAX(published_at) FROM community_resources WHERE community_id = c.id AND status = 'published'), '1970-01-01'), c.updated_at) as lastActivityAt"
        )
      ])
      .where('cm.user_id', userId)
      .andWhere('cm.status', 'active')
      .andWhereNull('c.deleted_at')
      .orderBy('lastActivityAt', 'desc');
  }

  static async getStats(communityId, connection = db) {
    return connection('communities as c')
      .select({
        memberCount: connection.raw(
          "(SELECT COUNT(*) FROM community_members WHERE community_id = c.id AND status = 'active')"
        ),
        resourceCount: connection.raw(
          "(SELECT COUNT(*) FROM community_resources WHERE community_id = c.id AND status = 'published')"
        ),
        postCount: connection.raw(
          "(SELECT COUNT(*) FROM community_posts WHERE community_id = c.id AND status = 'published' AND deleted_at IS NULL)"
        ),
        channelCount: connection.raw(
          "(SELECT COUNT(*) FROM community_channels WHERE community_id = c.id)"
        ),
        lastActivityAt: connection.raw(
          "GREATEST(IFNULL((SELECT MAX(published_at) FROM community_posts WHERE community_id = c.id AND status = 'published'), '1970-01-01'), IFNULL((SELECT MAX(published_at) FROM community_resources WHERE community_id = c.id AND status = 'published'), '1970-01-01'), c.updated_at)"
        )
      })
      .where('c.id', communityId)
      .first();
  }

  static async updateMetadata(id, metadata, connection = db) {
    await connection('communities')
      .where({ id })
      .update({
        metadata: JSON.stringify(metadata ?? {}),
        updated_at: connection.fn.now()
      });

    return this.findById(id, connection);
  }
}
