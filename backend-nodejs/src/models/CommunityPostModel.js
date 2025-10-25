import db from '../config/database.js';
import { normaliseReactionSummary as normaliseReactionSummaryAggregate, withReactionTotals } from '../services/ReactionAggregationService.js';

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
  'cp.moderation_state as moderationState',
  'cp.moderation_metadata as moderationMetadata',
  'cp.last_moderated_at as lastModeratedAt',
  'cp.scheduled_at as scheduledAt',
  'cp.published_at as publishedAt',
  'cp.comment_count as commentCount',
  'cp.reaction_summary as reactionSummary',
  'cp.metadata',
  'cp.media_asset_id as mediaAssetId',
  'cp.pinned_at as pinnedAt',
  'cp.preview_metadata as previewMetadata',
  'cp.created_at as createdAt',
  'cp.updated_at as updatedAt',
  'cp.deleted_at as deletedAt'
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

const ASSET_COLUMNS = [
  'ca.id as assetId',
  'ca.public_id as assetPublicId',
  'ca.mime_type as assetMimeType',
  'ca.metadata as assetMetadata'
];

function parseJson(value, fallback) {
  if (!value) return structuredClone(fallback);
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(fallback) && !Array.isArray(parsed)) {
        return structuredClone(fallback);
      }
      if (typeof parsed === 'object' && parsed !== null) {
        return Array.isArray(parsed)
          ? parsed
          : { ...fallback, ...parsed };
      }
      return structuredClone(fallback);
    } catch (_error) {
      return structuredClone(fallback);
    }
  }
  if (typeof value === 'object' && value !== null) {
    if (Array.isArray(fallback)) {
      return Array.isArray(value) ? value : structuredClone(fallback);
    }
    return { ...fallback, ...value };
  }
  return structuredClone(fallback);
}

function normaliseTags(tags) {
  if (!tags) {
    return [];
  }
  if (Array.isArray(tags)) {
    return tags.map((tag) => String(tag)).filter(Boolean);
  }
  if (typeof tags === 'string') {
    try {
      const parsed = JSON.parse(tags);
      return Array.isArray(parsed) ? parsed.map((tag) => String(tag)).filter(Boolean) : [];
    } catch (_error) {
      return [];
    }
  }
  return [];
}

function encodeCursor(payload) {
  try {
    return Buffer.from(JSON.stringify(payload)).toString('base64url');
  } catch (_error) {
    return null;
  }
}

function buildPaginationMetadata({ page, perPage, total, items }) {
  const safePerPage = Math.max(1, Number(perPage) || 1);
  const pageCount = total ? Math.ceil(total / safePerPage) : 0;
  const hasNext = pageCount ? page < pageCount : false;
  const hasPrevious = pageCount ? page > 1 : false;
  const lastItem = items[items.length - 1];
  const firstItem = items[0];
  const nextCursor = hasNext && lastItem
    ? encodeCursor({ page: page + 1, anchor: lastItem.publishedAt ?? lastItem.createdAt ?? lastItem.id })
    : null;
  const previousCursor = hasPrevious && firstItem
    ? encodeCursor({ page: page - 1, anchor: firstItem.publishedAt ?? firstItem.createdAt ?? firstItem.id })
    : null;

  return {
    page,
    perPage: safePerPage,
    total,
    pageCount,
    hasNext,
    hasPrevious,
    nextPage: hasNext ? page + 1 : null,
    previousPage: hasPrevious ? page - 1 : null,
    cursors: {
      next: nextCursor,
      previous: previousCursor
    }
  };
}

function toDomain(record) {
  if (!record) return null;
  return {
    id: record.id,
    communityId: record.communityId,
    channelId: record.channelId ?? null,
    authorId: record.authorId,
    postType: record.postType,
    title: record.title ?? null,
    body: record.body,
    tags: normaliseTags(record.tags),
    visibility: record.visibility,
    status: record.status,
    moderationState: record.moderationState,
    moderationMetadata: parseJson(record.moderationMetadata, {}),
    lastModeratedAt: record.lastModeratedAt ?? null,
    scheduledAt: record.scheduledAt ?? null,
    publishedAt: record.publishedAt ?? null,
    commentCount: Number(record.commentCount ?? 0),
    reactionSummary: normaliseReactionSummaryAggregate(parseJson(record.reactionSummary, {})),
    metadata: parseJson(record.metadata, {}),
    mediaAssetId: record.mediaAssetId ?? null,
    previewMetadata: parseJson(record.previewMetadata, {}),
    pinnedAt: record.pinnedAt ?? null,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    deletedAt: record.deletedAt ?? null,
    authorName: record.authorName ?? null,
    authorRole: record.authorRole ?? null,
    channelName: record.channelName ?? null,
    channelSlug: record.channelSlug ?? null,
    channelType: record.channelType ?? null,
    communityName: record.communityName ?? null,
    communitySlug: record.communitySlug ?? null,
    mediaAsset: record.assetId
      ? {
          id: record.assetId,
          publicId: record.assetPublicId ?? null,
          mimeType: record.assetMimeType ?? null,
          metadata: parseJson(record.assetMetadata, {})
        }
      : null
  };
}

function clamp(value, { min = 1, max = 100, defaultValue = 10 } = {}) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return defaultValue;
  }
  return Math.min(Math.max(Math.trunc(numeric), min), max);
}

export default class CommunityPostModel {
  static toDomain(record) {
    return toDomain(record);
  }

  static buildPaginationMetadata(payload) {
    return buildPaginationMetadata(payload);
  }

  static sanitisePagination({ page = 1, perPage = 10 } = {}) {
    return {
      page: clamp(page, { min: 1, max: 1000, defaultValue: 1 }),
      perPage: clamp(perPage, { min: 1, max: 100, defaultValue: 10 })
    };
  }

  static async create(post, connection = db) {
    const payload = {
      community_id: post.communityId,
      channel_id: post.channelId ?? null,
      author_id: post.authorId,
      post_type: post.postType ?? 'update',
      title: post.title ?? null,
      body: post.body,
      tags: JSON.stringify(normaliseTags(post.tags)),
      visibility: post.visibility ?? 'members',
      status: post.status ?? 'draft',
      moderation_state: post.moderationState ?? 'clean',
      moderation_metadata: JSON.stringify(parseJson(post.moderationMetadata, {})),
      scheduled_at: post.scheduledAt ?? null,
      published_at: post.publishedAt ?? null,
      comment_count: post.commentCount ?? 0,
      reaction_summary: JSON.stringify(normaliseReactionSummaryAggregate(parseJson(post.reactionSummary, {}))),
      metadata: JSON.stringify(parseJson(post.metadata, {})),
      media_asset_id: post.mediaAssetId ?? null,
      pinned_at: post.pinnedAt ?? null,
      preview_metadata: JSON.stringify(parseJson(post.previewMetadata, {}))
    };

    const [id] = await connection('community_posts').insert(payload);
    return this.findById(id, connection);
  }

  static async findById(id, connection = db) {
    const row = await connection('community_posts as cp')
      .leftJoin('community_channels as cc', 'cp.channel_id', 'cc.id')
      .leftJoin('communities as c', 'cp.community_id', 'c.id')
      .leftJoin('users as u', 'cp.author_id', 'u.id')
      .leftJoin('content_assets as ca', 'cp.media_asset_id', 'ca.id')
      .select([
        ...POST_COLUMNS,
        ...AUTHOR_COLUMNS,
        ...CHANNEL_COLUMNS,
        ...ASSET_COLUMNS,
        'c.name as communityName',
        'c.slug as communitySlug'
      ])
      .where('cp.id', id)
      .first();
    return toDomain(row);
  }

  static async updateModerationState(id, changes, connection = db) {
    const payload = {
      updated_at: connection.fn.now()
    };

    if (changes.state) {
      payload.moderation_state = changes.state;
    }

    if (changes.metadata !== undefined) {
      payload.moderation_metadata = JSON.stringify(changes.metadata ?? {});
    }

    if (changes.status) {
      payload.status = changes.status;
    }

    payload.last_moderated_at = changes.lastModeratedAt ?? connection.fn.now();

    await connection('community_posts').where({ id }).update(payload);
    return this.findById(id, connection);
  }

  static async updateById(id, updates = {}, connection = db) {
    const payload = { updated_at: connection.fn.now() };

    if (updates.title !== undefined) {
      payload.title = updates.title ?? null;
    }
    if (updates.body !== undefined) {
      payload.body = updates.body;
    }
    if (updates.tags !== undefined) {
      payload.tags = JSON.stringify(Array.isArray(updates.tags) ? updates.tags : []);
    }
    if (updates.visibility !== undefined) {
      payload.visibility = updates.visibility;
    }
    if (updates.status !== undefined) {
      payload.status = updates.status;
    }
    if (updates.scheduledAt !== undefined) {
      payload.scheduled_at = updates.scheduledAt ?? null;
    }
    if (updates.publishedAt !== undefined) {
      payload.published_at = updates.publishedAt ?? null;
    }
    if (updates.metadata !== undefined) {
      payload.metadata = JSON.stringify(updates.metadata ?? {});
    }
    if (updates.mediaAssetId !== undefined) {
      payload.media_asset_id = updates.mediaAssetId ?? null;
    }
    if (updates.pinnedAt !== undefined) {
      payload.pinned_at = updates.pinnedAt ?? null;
    }
    if (updates.previewMetadata !== undefined) {
      payload.preview_metadata = JSON.stringify(updates.previewMetadata ?? {});
    }
    if (updates.channelId !== undefined) {
      payload.channel_id = updates.channelId ?? null;
    }

    if (Object.keys(payload).length === 1) {
      return this.findById(id, connection);
    }

    await connection('community_posts').where({ id }).update(payload);
    return this.findById(id, connection);
  }

  static async archive(id, { metadata } = {}, connection = db) {
    const payload = {
      status: 'archived',
      deleted_at: connection.fn.now(),
      updated_at: connection.fn.now()
    };

    if (metadata !== undefined) {
      payload.metadata = JSON.stringify(metadata ?? {});
    }

    await connection('community_posts').where({ id }).update(payload);
    return this.findById(id, connection);
  }

  static async updateReactionSummary(id, summary = {}, connection = db) {
    const reactions = withReactionTotals(summary);
    const payload = {
      reaction_summary: JSON.stringify(reactions),
      updated_at: connection.fn.now()
    };

    await connection('community_posts').where({ id }).update(payload);
    return this.findById(id, connection);
  }

  static async listPinnedMedia(communityId, { limit = 5 } = {}, connection = db) {
    if (!communityId) {
      return [];
    }

    const resolvedLimit = Math.min(Math.max(Number(limit) || 5, 1), 20);
    const rows = await connection('community_posts as cp')
      .leftJoin('content_assets as ca', 'cp.media_asset_id', 'ca.id')
      .select([
        'cp.id',
        'cp.media_asset_id as mediaAssetId',
        'cp.preview_metadata as previewMetadata',
        'ca.public_id as assetPublicId',
        'ca.mime_type as assetMimeType',
        'ca.metadata as assetMetadata'
      ])
      .where('cp.community_id', communityId)
      .andWhere('cp.status', 'published')
      .andWhereNull('cp.deleted_at')
      .andWhereNotNull('cp.pinned_at')
      .orderBy('cp.pinned_at', 'desc')
      .limit(resolvedLimit);

    return rows.map((row) => ({
      id: row.id,
      mediaAssetId: row.mediaAssetId ?? null,
      previewMetadata: parseJson(row.previewMetadata, {}),
      asset: row.assetPublicId
        ? {
            publicId: row.assetPublicId,
            mimeType: row.assetMimeType ?? null,
            metadata: parseJson(row.assetMetadata, {})
          }
        : null
    }));
  }

  static async paginateForCommunity(communityId, filters = {}, connection = db) {
    const { channelId, postType, visibility, query } = filters;
    const { page, perPage } = this.sanitisePagination(filters);

    const baseQuery = connection('community_posts as cp')
      .leftJoin('community_channels as cc', 'cp.channel_id', 'cc.id')
      .leftJoin('users as u', 'cp.author_id', 'u.id')
      .leftJoin('content_assets as ca', 'cp.media_asset_id', 'ca.id')
      .select([...POST_COLUMNS, ...AUTHOR_COLUMNS, ...CHANNEL_COLUMNS, ...ASSET_COLUMNS])
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

    const rows = await baseQuery
      .orderByRaw('CASE WHEN cp.pinned_at IS NULL THEN 1 ELSE 0 END ASC')
      .orderBy('cp.pinned_at', 'desc')
      .orderBy('cp.published_at', 'desc')
      .orderBy('cp.created_at', 'desc')
      .limit(perPage)
      .offset((page - 1) * perPage);

    const total = Number(totalRow?.count ?? 0);
    const items = rows.map((item) => toDomain(item));

    return {
      items,
      pagination: buildPaginationMetadata({ page, perPage, total, items })
    };
  }

  static async paginateForUser(userId, filters = {}, connection = db) {
    const { postType, query } = filters;
    const { page, perPage } = this.sanitisePagination(filters);

    const baseQuery = connection('community_posts as cp')
      .innerJoin('community_members as cm', function joinMembers() {
        this.on('cm.community_id', '=', 'cp.community_id').andOn('cm.user_id', '=', connection.raw('?', [userId]));
      })
      .leftJoin('communities as c', 'cp.community_id', 'c.id')
      .leftJoin('community_channels as cc', 'cp.channel_id', 'cc.id')
      .leftJoin('users as u', 'cp.author_id', 'u.id')
      .leftJoin('content_assets as ca', 'cp.media_asset_id', 'ca.id')
      .select([
        ...POST_COLUMNS,
        ...AUTHOR_COLUMNS,
        ...CHANNEL_COLUMNS,
        'c.id as communityId',
        'c.name as communityName',
        'c.slug as communitySlug',
        'cm.role as viewerRole',
        ...ASSET_COLUMNS
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

    const rows = await baseQuery
      .orderByRaw('CASE WHEN cp.pinned_at IS NULL THEN 1 ELSE 0 END ASC')
      .orderBy('cp.pinned_at', 'desc')
      .orderBy('cp.published_at', 'desc')
      .orderBy('cp.created_at', 'desc')
      .limit(perPage)
      .offset((page - 1) * perPage);

    const total = Number(totalRow?.count ?? 0);
    const items = rows.map((item) => toDomain(item));

    return {
      items,
      pagination: buildPaginationMetadata({ page, perPage, total, items })
    };
  }
}
