import slugify from 'slugify';

import db from '../config/database.js';

const TABLE = 'podcast_shows';

const BASE_COLUMNS = [
  'ps.id',
  'ps.community_id as communityId',
  'ps.owner_id as ownerId',
  'ps.title',
  'ps.slug',
  'ps.subtitle',
  'ps.description',
  'ps.cover_image_url as coverImageUrl',
  'ps.category',
  'ps.status',
  'ps.is_public as isPublic',
  'ps.distribution_channels as distributionChannels',
  'ps.metadata',
  'ps.launch_at as launchAt',
  'ps.created_at as createdAt',
  'ps.updated_at as updatedAt',
  'c.name as communityName',
  'u.email as ownerEmail',
  db.raw("CONCAT(u.first_name, ' ', u.last_name) as ownerName")
];

function toDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseJson(value, fallback) {
  if (value === null || value === undefined) {
    return structuredClone(fallback);
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(fallback)) {
        return Array.isArray(parsed) ? parsed : structuredClone(fallback);
      }
      if (typeof parsed === 'object' && parsed !== null) {
        return { ...fallback, ...parsed };
      }
      return structuredClone(fallback);
    } catch (_error) {
      return structuredClone(fallback);
    }
  }
  if (Array.isArray(fallback)) {
    return Array.isArray(value) ? value : structuredClone(fallback);
  }
  if (typeof value === 'object' && value !== null) {
    return { ...fallback, ...value };
  }
  return structuredClone(fallback);
}

function serialiseJson(value, fallback) {
  if (value === null || value === undefined) {
    return JSON.stringify(fallback);
  }
  if (typeof value === 'string') {
    return value;
  }
  return JSON.stringify(value);
}

function normaliseSlug(value, fallback) {
  const base = value || fallback;
  if (!base) {
    return null;
  }
  return slugify(base, { lower: true, strict: true });
}

function deserialize(record) {
  if (!record) return null;
  return {
    id: record.id,
    communityId: record.communityId ?? null,
    communityName: record.communityName ?? null,
    ownerId: record.ownerId ?? null,
    ownerEmail: record.ownerEmail ?? null,
    ownerName: record.ownerName?.trim() || null,
    title: record.title,
    slug: record.slug,
    subtitle: record.subtitle ?? null,
    description: record.description ?? null,
    coverImageUrl: record.coverImageUrl ?? null,
    category: record.category ?? null,
    status: record.status,
    isPublic: Boolean(record.isPublic),
    distributionChannels: record.distributionChannels ?? null,
    metadata: parseJson(record.metadata, {}),
    launchAt: toDate(record.launchAt),
    createdAt: toDate(record.createdAt),
    updatedAt: toDate(record.updatedAt)
  };
}

export default class PodcastShowModel {
  static async listAll({ search, status, limit = 50, offset = 0 } = {}, connection = db) {
    const query = connection(`${TABLE} as ps`)
      .leftJoin('communities as c', 'ps.community_id', 'c.id')
      .leftJoin('users as u', 'ps.owner_id', 'u.id')
      .select(BASE_COLUMNS)
      .orderBy('ps.updated_at', 'desc');

    if (search) {
      query.where((builder) => {
        builder
          .whereILike('ps.title', `%${search}%`)
          .orWhereILike('ps.slug', `%${search}%`)
          .orWhereILike('ps.description', `%${search}%`);
      });
    }

    if (status) {
      query.andWhere('ps.status', status);
    }

    const rows = await query.limit(limit).offset(offset);
    return rows.map((row) => deserialize(row));
  }

  static async countAll({ search, status } = {}, connection = db) {
    const query = connection(TABLE);
    if (search) {
      query.where((builder) => {
        builder
          .whereILike('title', `%${search}%`)
          .orWhereILike('slug', `%${search}%`)
          .orWhereILike('description', `%${search}%`);
      });
    }
    if (status) {
      query.andWhere('status', status);
    }
    const result = await query.count({ total: '*' }).first();
    return Number(result?.total ?? 0);
  }

  static async findById(id, connection = db) {
    const row = await connection(`${TABLE} as ps`)
      .leftJoin('communities as c', 'ps.community_id', 'c.id')
      .leftJoin('users as u', 'ps.owner_id', 'u.id')
      .select(BASE_COLUMNS)
      .where('ps.id', id)
      .first();
    return deserialize(row);
  }

  static async create(show, connection = db) {
    const payload = {
      community_id: show.communityId ?? null,
      owner_id: show.ownerId ?? null,
      title: show.title,
      slug: normaliseSlug(show.slug, show.title),
      subtitle: show.subtitle ?? null,
      description: show.description ?? null,
      cover_image_url: show.coverImageUrl ?? null,
      category: show.category ?? null,
      status: show.status ?? 'draft',
      is_public: show.isPublic ?? false,
      distribution_channels: Array.isArray(show.distributionChannels)
        ? show.distributionChannels.join(', ')
        : show.distributionChannels ?? null,
      metadata: serialiseJson(show.metadata ?? {}, {}),
      launch_at: show.launchAt ?? null
    };

    const [id] = await connection(TABLE).insert(payload);
    return this.findById(id, connection);
  }

  static async updateById(id, updates, connection = db) {
    const payload = {};
    if (updates.communityId !== undefined) {
      payload.community_id = updates.communityId ?? null;
    }
    if (updates.ownerId !== undefined) {
      payload.owner_id = updates.ownerId ?? null;
    }
    if (updates.title !== undefined) {
      payload.title = updates.title;
    }
    if (updates.slug !== undefined) {
      payload.slug = normaliseSlug(updates.slug, updates.title);
    }
    if (updates.subtitle !== undefined) {
      payload.subtitle = updates.subtitle ?? null;
    }
    if (updates.description !== undefined) {
      payload.description = updates.description ?? null;
    }
    if (updates.coverImageUrl !== undefined) {
      payload.cover_image_url = updates.coverImageUrl ?? null;
    }
    if (updates.category !== undefined) {
      payload.category = updates.category ?? null;
    }
    if (updates.status !== undefined) {
      payload.status = updates.status;
    }
    if (updates.isPublic !== undefined) {
      payload.is_public = updates.isPublic;
    }
    if (updates.distributionChannels !== undefined) {
      payload.distribution_channels = Array.isArray(updates.distributionChannels)
        ? updates.distributionChannels.join(', ')
        : updates.distributionChannels ?? null;
    }
    if (updates.metadata !== undefined) {
      payload.metadata = serialiseJson(updates.metadata ?? {}, {});
    }
    if (updates.launchAt !== undefined) {
      payload.launch_at = updates.launchAt ?? null;
    }

    if (Object.keys(payload).length === 0) {
      return this.findById(id, connection);
    }

    await connection(TABLE)
      .where({ id })
      .update({ ...payload, updated_at: connection.fn.now() });

    return this.findById(id, connection);
  }

  static async deleteById(id, connection = db) {
    await connection('podcast_episodes').where({ show_id: id }).del();
    await connection(TABLE).where({ id }).del();
  }
}
