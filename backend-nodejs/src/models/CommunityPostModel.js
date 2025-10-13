import db from '../config/database.js';

const POST_COLUMNS = [
  'cp.id',
  'cp.community_id as communityId',
  'cp.channel_id as channelId',
  'cp.author_id as authorId',
  'cp.post_type as postType',
  'cp.title',
  'cp.body',
  'cp.tags',
  'cp.visibility',
  'cp.status',
  'cp.scheduled_at as scheduledAt',
  'cp.published_at as publishedAt',
  'cp.comment_count as commentCount',
  'cp.reaction_summary as reactionSummary',
  'cp.metadata',
  'cp.created_at as createdAt',
  'cp.updated_at as updatedAt'
];

const AUTHOR_COLUMNS = [
  'u.id as authorId',
  db.raw("CONCAT(u.first_name, ' ', COALESCE(u.last_name, '')) as authorName"),
  'u.role as authorRole'
];

const CHANNEL_COLUMNS = [
  'cc.id as channelId',
  'cc.name as channelName',
  'cc.slug as channelSlug',
  'cc.channel_type as channelType'
];

export default class CommunityPostModel {
  static async create(post, connection = db) {
    const payload = {
      community_id: post.communityId,
      channel_id: post.channelId ?? null,
      author_id: post.authorId,
      post_type: post.postType ?? 'update',
      title: post.title ?? null,
      body: post.body,
      tags: JSON.stringify(post.tags ?? []),
      visibility: post.visibility ?? 'members',
      status: post.status ?? 'draft',
      scheduled_at: post.scheduledAt ?? null,
      published_at: post.publishedAt ?? null,
      comment_count: post.commentCount ?? 0,
      reaction_summary: JSON.stringify(post.reactionSummary ?? {}),
      metadata: JSON.stringify(post.metadata ?? {})
    };

    const [id] = await connection('community_posts').insert(payload);
    return this.findById(id, connection);
  }

  static async findById(id, connection = db) {
    return connection('community_posts as cp')
      .leftJoin('community_channels as cc', 'cp.channel_id', 'cc.id')
      .leftJoin('communities as c', 'cp.community_id', 'c.id')
      .leftJoin('users as u', 'cp.author_id', 'u.id')
      .select([
        ...POST_COLUMNS,
        ...AUTHOR_COLUMNS,
        ...CHANNEL_COLUMNS,
        'c.name as communityName',
        'c.slug as communitySlug'
      ])
      .where('cp.id', id)
      .first();
  }

  static async paginateForCommunity(communityId, filters = {}, connection = db) {
    const { page = 1, perPage = 10, channelId, postType, visibility, query } = filters;

    const baseQuery = connection('community_posts as cp')
      .leftJoin('community_channels as cc', 'cp.channel_id', 'cc.id')
      .leftJoin('users as u', 'cp.author_id', 'u.id')
      .select([...POST_COLUMNS, ...AUTHOR_COLUMNS, ...CHANNEL_COLUMNS])
      .where('cp.community_id', communityId)
      .andWhere('cp.status', 'published')
      .andWhereNull('cp.deleted_at');

    if (channelId) {
      baseQuery.andWhere('cp.channel_id', channelId);
    }

    if (postType) {
      baseQuery.andWhere('cp.post_type', postType);
    }

    if (visibility) {
      baseQuery.andWhere('cp.visibility', visibility);
    }

    if (query) {
      const searchTerm = `%${query.toLowerCase()}%`;
      baseQuery.andWhere(function applySearch() {
        this.whereRaw('LOWER(cp.title) LIKE ?', [searchTerm])
          .orWhereRaw('LOWER(cp.body) LIKE ?', [searchTerm])
          .orWhereRaw('LOWER(cp.tags) LIKE ?', [searchTerm]);
      });
    }

    const totalRow = await baseQuery
      .clone()
      .clearSelect()
      .clearOrder()
      .count({ count: '*' })
      .first();

    const items = await baseQuery
      .orderBy('cp.published_at', 'desc')
      .orderBy('cp.created_at', 'desc')
      .limit(perPage)
      .offset((page - 1) * perPage);

    const total = Number(totalRow?.count ?? 0);

    return {
      items,
      pagination: {
        page,
        perPage,
        total,
        pageCount: total ? Math.ceil(total / perPage) : 0
      }
    };
  }

  static async paginateForUser(userId, filters = {}, connection = db) {
    const { page = 1, perPage = 10, postType, query } = filters;

    const baseQuery = connection('community_posts as cp')
      .innerJoin('community_members as cm', function joinMembers() {
        this.on('cm.community_id', '=', 'cp.community_id').andOn('cm.user_id', '=', connection.raw('?', [userId]));
      })
      .leftJoin('communities as c', 'cp.community_id', 'c.id')
      .leftJoin('community_channels as cc', 'cp.channel_id', 'cc.id')
      .leftJoin('users as u', 'cp.author_id', 'u.id')
      .select([
        ...POST_COLUMNS,
        ...AUTHOR_COLUMNS,
        ...CHANNEL_COLUMNS,
        'c.id as communityId',
        'c.name as communityName',
        'c.slug as communitySlug'
      ])
      .where('cm.status', 'active')
      .andWhere('cp.status', 'published')
      .andWhereNull('cp.deleted_at');

    if (postType) {
      baseQuery.andWhere('cp.post_type', postType);
    }

    if (query) {
      const searchTerm = `%${query.toLowerCase()}%`;
      baseQuery.andWhere(function applySearch() {
        this.whereRaw('LOWER(cp.title) LIKE ?', [searchTerm])
          .orWhereRaw('LOWER(cp.body) LIKE ?', [searchTerm])
          .orWhereRaw('LOWER(cp.tags) LIKE ?', [searchTerm]);
      });
    }

    const totalRow = await baseQuery
      .clone()
      .clearSelect()
      .clearOrder()
      .count({ count: '*' })
      .first();

    const items = await baseQuery
      .orderBy('cp.published_at', 'desc')
      .orderBy('cp.created_at', 'desc')
      .limit(perPage)
      .offset((page - 1) * perPage);

    const total = Number(totalRow?.count ?? 0);

    return {
      items,
      pagination: {
        page,
        perPage,
        total,
        pageCount: total ? Math.ceil(total / perPage) : 0
      }
    };
  }
}
