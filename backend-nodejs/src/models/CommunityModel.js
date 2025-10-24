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
  'c.updated_at as updatedAt',
  'c.deleted_at as deletedAt'
];

function parseJson(value, fallback = {}) {
  if (value === null || value === undefined) {
    return structuredClone(fallback);
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (typeof parsed === 'object' && parsed !== null) {
        return { ...fallback, ...parsed };
      }
      return structuredClone(fallback);
    } catch (_error) {
      return structuredClone(fallback);
    }
  }
  if (typeof value === 'object' && value !== null) {
    return { ...fallback, ...value };
  }
  return structuredClone(fallback);
}

function deserialize(record) {
  if (!record) return null;
  return {
    id: record.id,
    name: record.name,
    slug: record.slug,
    description: record.description ?? null,
    coverImageUrl: record.coverImageUrl ?? null,
    visibility: record.visibility,
    ownerId: record.ownerId,
    metadata: parseJson(record.metadata, {}),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    deletedAt: record.deletedAt ?? null
  };
}

export default class CommunityModel {
  static async listByUser(userId) {
    const rows = await db('community_members as cm')
      .innerJoin('communities as c', 'cm.community_id', 'c.id')
      .select([...COMMUNITY_COLUMNS, 'cm.role as memberRole', 'cm.status as memberStatus'])
      .where('cm.user_id', userId)
      .andWhere('cm.status', 'active')
      .andWhereNull('c.deleted_at')
      .orderBy('c.created_at', 'desc');

    return rows.map((row) => ({ ...deserialize(row), memberRole: row.memberRole, memberStatus: row.memberStatus }));
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
    return this.findById(id, connection);
  }

  static async findBySlug(slug, connection = db) {
    const row = await connection('communities as c')
      .select(COMMUNITY_COLUMNS)
      .where('c.slug', slug)
      .andWhereNull('c.deleted_at')
      .first();
    return deserialize(row);
  }

  static async findById(id, connection = db) {
    const row = await connection('communities as c').select(COMMUNITY_COLUMNS).where('c.id', id).first();
    return deserialize(row);
  }

  static async listByUserWithStats(userId, connection = db) {
    const rows = await connection('community_members as cm')
      .innerJoin('communities as c', 'cm.community_id', 'c.id')
      .select([
        ...COMMUNITY_COLUMNS,
        'cm.role as memberRole',
        'cm.status as memberStatus',
        connection.raw(
          "(SELECT COUNT(*) FROM community_members WHERE community_id = c.id AND status = 'active') as memberCount"
        ),
        connection.raw("(SELECT COUNT(*) FROM community_channels WHERE community_id = c.id) as channelCount"),
        connection.raw(
          "(SELECT COUNT(*) FROM community_resources WHERE community_id = c.id AND status = 'published') as resourceCount"
        ),
        connection.raw(
          "(SELECT COUNT(*) FROM community_posts WHERE community_id = c.id AND status = 'published' AND deleted_at IS NULL) as postCount"
        ),
        connection.raw(
          "(SELECT COUNT(*) FROM community_events WHERE community_id = c.id AND status IN ('scheduled', 'live', 'completed')) as eventCount"
        ),
        connection.raw(
          "GREATEST(IFNULL((SELECT MAX(published_at) FROM community_posts WHERE community_id = c.id AND status = 'published'), '1970-01-01'), IFNULL((SELECT MAX(published_at) FROM community_resources WHERE community_id = c.id AND status = 'published'), '1970-01-01'), IFNULL((SELECT MAX(start_at) FROM community_events WHERE community_id = c.id AND status IN ('scheduled', 'live', 'completed')), '1970-01-01'), c.updated_at) as lastActivityAt"
        )
      ])
      .where('cm.user_id', userId)
      .andWhere('cm.status', 'active')
      .andWhereNull('c.deleted_at')
      .orderBy('lastActivityAt', 'desc');

    return rows.map((row) => ({
      ...deserialize(row),
      memberRole: row.memberRole,
      memberStatus: row.memberStatus,
      memberCount: Number(row.memberCount ?? 0),
      channelCount: Number(row.channelCount ?? 0),
      resourceCount: Number(row.resourceCount ?? 0),
      postCount: Number(row.postCount ?? 0),
      eventCount: Number(row.eventCount ?? 0),
      lastActivityAt: row.lastActivityAt
    }));
  }

  static async getStats(communityId, connection = db) {
    const row = await connection('communities as c')
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
        channelCount: connection.raw("(SELECT COUNT(*) FROM community_channels WHERE community_id = c.id)"),
        eventCount: connection.raw(
          "(SELECT COUNT(*) FROM community_events WHERE community_id = c.id AND status IN ('scheduled', 'live', 'completed'))"
        ),
        lastActivityAt: connection.raw(
          "GREATEST(IFNULL((SELECT MAX(published_at) FROM community_posts WHERE community_id = c.id AND status = 'published'), '1970-01-01'), IFNULL((SELECT MAX(published_at) FROM community_resources WHERE community_id = c.id AND status = 'published'), '1970-01-01'), IFNULL((SELECT MAX(start_at) FROM community_events WHERE community_id = c.id AND status IN ('scheduled', 'live', 'completed')), '1970-01-01'), c.updated_at)"
        )
      })
      .where('c.id', communityId)
      .first();

    return row
      ? {
          memberCount: Number(row.memberCount ?? 0),
          resourceCount: Number(row.resourceCount ?? 0),
          postCount: Number(row.postCount ?? 0),
          channelCount: Number(row.channelCount ?? 0),
          eventCount: Number(row.eventCount ?? 0),
          lastActivityAt: row.lastActivityAt
        }
      : null;
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

  static async updateById(id, updates = {}, connection = db) {
    const payload = { updated_at: connection.fn.now() };

    if (updates.name !== undefined) {
      payload.name = updates.name;
    }
    if (updates.slug !== undefined) {
      payload.slug = updates.slug ?? null;
    }
    if (updates.description !== undefined) {
      payload.description = updates.description ?? null;
    }
    if (updates.coverImageUrl !== undefined) {
      payload.cover_image_url = updates.coverImageUrl ?? null;
    }
    if (updates.visibility !== undefined) {
      payload.visibility = updates.visibility;
    }
    if (updates.ownerId !== undefined) {
      payload.owner_id = updates.ownerId;
    }
    if (updates.metadata !== undefined) {
      payload.metadata = JSON.stringify(updates.metadata ?? {});
    }

    if (Object.keys(payload).length === 1) {
      // No meaningful updates, return existing record
      return this.findById(id, connection);
    }

    await connection('communities').where({ id }).update(payload);
    return this.findById(id, connection);
  }

  static async listAll({ search, visibility, limit = 50, offset = 0 } = {}, connection = db) {
    const query = connection('communities as c')
      .select([
        ...COMMUNITY_COLUMNS,
        'u.email as ownerEmail',
        connection.raw("CONCAT(u.first_name, ' ', u.last_name) as ownerName")
      ])
      .leftJoin('users as u', 'c.owner_id', 'u.id')
      .whereNull('c.deleted_at')
      .orderBy('c.updated_at', 'desc');

    if (visibility) {
      query.andWhere('c.visibility', visibility);
    }

    if (search) {
      query.andWhere((builder) => {
        builder
          .whereILike('c.name', `%${search}%`)
          .orWhereILike('c.slug', `%${search}%`)
          .orWhereILike('c.description', `%${search}%`);
      });
    }

    const rows = await query.limit(limit).offset(offset);
    return rows.map((row) => ({
      ...deserialize(row),
      ownerEmail: row.ownerEmail ?? null,
      ownerName: row.ownerName?.trim() || null
    }));
  }

  static async countAll({ search, visibility } = {}, connection = db) {
    const query = connection('communities as c').whereNull('c.deleted_at');

    if (visibility) {
      query.andWhere('c.visibility', visibility);
    }

    if (search) {
      query.andWhere((builder) => {
        builder
          .whereILike('c.name', `%${search}%`)
          .orWhereILike('c.slug', `%${search}%`)
          .orWhereILike('c.description', `%${search}%`);
      });
    }

    const result = await query.count({ total: '*' }).first();
    return Number(result?.total ?? 0);
  }

  static async softDeleteById(id, connection = db) {
    await connection('communities')
      .where({ id })
      .update({ deleted_at: connection.fn.now(), updated_at: connection.fn.now() });
  }
}
