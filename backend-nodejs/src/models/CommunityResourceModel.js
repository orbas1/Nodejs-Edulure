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

export default class CommunityResourceModel {
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
      tags: JSON.stringify(resource.tags ?? []),
      metadata: JSON.stringify(resource.metadata ?? {}),
      visibility: resource.visibility ?? 'members',
      status: resource.status ?? 'draft',
      published_at: resource.publishedAt ?? null
    };

    const [id] = await connection('community_resources').insert(payload);
    return this.findById(id, connection);
  }

  static async findById(id, connection = db) {
    return connection('community_resources as cr')
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
  }

  static async listForCommunity(communityId, filters = {}, connection = db) {
    const { limit = 10, offset = 0, resourceType } = filters;

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
      items,
      total: Number(totalRow?.count ?? 0)
    };
  }

  static async update(resourceId, updates, connection = db) {
    const payload = {};

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
      payload.tags = JSON.stringify(updates.tags ?? []);
    }
    if (updates.metadata !== undefined) {
      payload.metadata = JSON.stringify(updates.metadata ?? {});
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

    if (Object.keys(payload).length === 0) {
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
