import db from '../config/database.js';

const RESOURCE_COLUMNS = [
  'cr.id',
  'cr.community_id as communityId',
  'cr.created_by as createdBy',
  'cr.title',
  'cr.description',
  'cr.resource_type as resourceType',
  'cr.asset_id as assetId',
  'cr.link_url as linkUrl',
  'cr.classroom_reference as classroomReference',
  'cr.tags',
  'cr.metadata',
  'cr.visibility',
  'cr.status',
  'cr.published_at as publishedAt',
  'cr.created_at as createdAt',
  'cr.updated_at as updatedAt',
  'cr.deleted_at as deletedAt'
];

function parseJson(value, fallback) {
  if (!value) return structuredClone(fallback);
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
  if (typeof value === 'object' && value !== null) {
    if (Array.isArray(fallback)) {
      return Array.isArray(value) ? value : structuredClone(fallback);
    }
    return { ...fallback, ...value };
  }
  return structuredClone(fallback);
}

function normaliseTags(tags) {
  if (!tags) return [];
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

function toDomain(record) {
  if (!record) return null;
  return {
    id: record.id,
    communityId: record.communityId,
    createdBy: record.createdBy,
    title: record.title,
    description: record.description ?? null,
    resourceType: record.resourceType,
    assetId: record.assetId ?? null,
    linkUrl: record.linkUrl ?? null,
    classroomReference: record.classroomReference ?? null,
    tags: normaliseTags(record.tags),
    metadata: parseJson(record.metadata, {}),
    visibility: record.visibility,
    status: record.status,
    publishedAt: record.publishedAt ?? null,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    deletedAt: record.deletedAt ?? null,
    createdByName: record.createdByName ?? null,
    createdByRole: record.createdByRole ?? null,
    assetPublicId: record.assetPublicId ?? null,
    assetFilename: record.assetFilename ?? null
  };
}

function clampLimit(limit, defaultValue, maxValue) {
  const numeric = Number(limit);
  if (!Number.isFinite(numeric)) {
    return defaultValue;
  }
  return Math.min(Math.max(Math.trunc(numeric), 1), maxValue);
}

export default class CommunityResourceModel {
  static toDomain(record) {
    return toDomain(record);
  }

  static sanitiseListOptions({ limit = 10, offset = 0 } = {}) {
    const safeLimit = clampLimit(limit, 10, 100);
    const safeOffset = Math.max(Number.isFinite(Number(offset)) ? Math.trunc(Number(offset)) : 0, 0);
    return { limit: safeLimit, offset: safeOffset };
  }

  static async create(resource, connection = db) {
    const payload = {
      community_id: resource.communityId,
      created_by: resource.createdBy,
      title: resource.title,
      description: resource.description ?? null,
      resource_type: resource.resourceType ?? 'content_asset',
      asset_id: resource.assetId ?? null,
      link_url: resource.linkUrl ?? null,
      classroom_reference: resource.classroomReference ?? null,
      tags: JSON.stringify(normaliseTags(resource.tags)),
      metadata: JSON.stringify(parseJson(resource.metadata, {})),
      visibility: resource.visibility ?? 'members',
      status: resource.status ?? 'draft',
      published_at: resource.publishedAt ?? null
    };

    const [id] = await connection('community_resources').insert(payload);
    return this.findById(id, connection);
  }

  static async findById(id, connection = db) {
    const row = await connection('community_resources as cr')
      .leftJoin('users as u', 'cr.created_by', 'u.id')
      .leftJoin('content_assets as ca', 'cr.asset_id', 'ca.id')
      .select([
        ...RESOURCE_COLUMNS,
        db.raw("CONCAT(u.first_name, ' ', COALESCE(u.last_name, '')) as createdByName"),
        'u.role as createdByRole',
        'ca.public_id as assetPublicId',
        'ca.original_filename as assetFilename'
      ])
      .where('cr.id', id)
      .first();
    return toDomain(row);
  }

  static async listForCommunity(communityId, filters = {}, connection = db) {
    const { resourceType } = filters;
    const { limit, offset } = this.sanitiseListOptions(filters);

    const query = connection('community_resources as cr')
      .leftJoin('users as u', 'cr.created_by', 'u.id')
      .leftJoin('content_assets as ca', 'cr.asset_id', 'ca.id')
      .select([
        ...RESOURCE_COLUMNS,
        db.raw("CONCAT(u.first_name, ' ', COALESCE(u.last_name, '')) as createdByName"),
        'u.role as createdByRole',
        'ca.public_id as assetPublicId',
        'ca.original_filename as assetFilename'
      ])
      .where('cr.community_id', communityId)
      .andWhere('cr.status', 'published')
      .andWhereNull('cr.deleted_at')
      .orderBy('cr.published_at', 'desc')
      .orderBy('cr.created_at', 'desc');

    if (resourceType) {
      query.andWhere('cr.resource_type', resourceType);
    }

    const items = await query.limit(limit).offset(offset);

    const totalRow = await connection('community_resources as cr')
      .where('cr.community_id', communityId)
      .andWhere('cr.status', 'published')
      .andWhereNull('cr.deleted_at')
      .modify((builder) => {
        if (resourceType) {
          builder.andWhere('cr.resource_type', resourceType);
        }
      })
      .count({ count: '*' })
      .first();

    return {
      items: items.map((item) => toDomain(item)),
      total: Number(totalRow?.count ?? 0)
    };
  }

  static async update(resourceId, updates, connection = db) {
    const payload = { updated_at: connection.fn.now?.() ?? db.fn.now() };

    if (updates.title !== undefined) {
      payload.title = updates.title;
    }
    if (updates.description !== undefined) {
      payload.description = updates.description ?? null;
    }
    if (updates.resourceType !== undefined) {
      payload.resource_type = updates.resourceType;
    }
    if (updates.assetId !== undefined) {
      payload.asset_id = updates.assetId ?? null;
    }
    if (updates.linkUrl !== undefined) {
      payload.link_url = updates.linkUrl ?? null;
    }
    if (updates.classroomReference !== undefined) {
      payload.classroom_reference = updates.classroomReference ?? null;
    }
    if (updates.tags !== undefined) {
      payload.tags = JSON.stringify(normaliseTags(updates.tags));
    }
    if (updates.metadata !== undefined) {
      payload.metadata = JSON.stringify(parseJson(updates.metadata, {}));
    }
    if (updates.visibility !== undefined) {
      payload.visibility = updates.visibility;
    }
    if (updates.status !== undefined) {
      payload.status = updates.status;
    }
    if (updates.publishedAt !== undefined) {
      payload.published_at = updates.publishedAt;
    }

    if (Object.keys(payload).length === 1) {
      return this.findById(resourceId, connection);
    }

    await connection('community_resources').where('id', resourceId).update(payload);
    return this.findById(resourceId, connection);
  }

  static async markDeleted(resourceId, connection = db) {
    const now = connection?.fn?.now ? connection.fn.now() : db.fn.now();
    await connection('community_resources')
      .where('id', resourceId)
      .update({ deleted_at: now, status: 'archived' });
    return this.findById(resourceId, connection);
  }
}
