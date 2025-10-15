import { randomUUID } from 'node:crypto';

import db from '../config/database.js';

const TABLE = 'creation_projects';

const BASE_COLUMNS = [
  'id',
  'public_id as publicId',
  'owner_id as ownerId',
  'type',
  'status',
  'title',
  'summary',
  'metadata',
  'content_outline as contentOutline',
  'compliance_notes as complianceNotes',
  'analytics_targets as analyticsTargets',
  'publishing_channels as publishingChannels',
  'review_requested_at as reviewRequestedAt',
  'approved_at as approvedAt',
  'published_at as publishedAt',
  'archived_at as archivedAt',
  'created_at as createdAt',
  'updated_at as updatedAt'
];

function parseJsonField(value, fallback) {
  if (!value) return structuredClone(fallback);
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
    } catch (_error) {
      return structuredClone(fallback);
    }
    return structuredClone(fallback);
  }
  if (Array.isArray(fallback)) {
    return Array.isArray(value) ? value : structuredClone(fallback);
  }
  return { ...fallback, ...(value ?? {}) };
}

function serialise(project) {
  return {
    public_id: project.publicId ?? randomUUID(),
    owner_id: project.ownerId,
    type: project.type,
    status: project.status ?? 'draft',
    title: project.title,
    summary: project.summary ?? null,
    metadata: JSON.stringify(project.metadata ?? {}),
    content_outline: JSON.stringify(project.contentOutline ?? []),
    compliance_notes: JSON.stringify(project.complianceNotes ?? []),
    analytics_targets: JSON.stringify(project.analyticsTargets ?? {}),
    publishing_channels: JSON.stringify(project.publishingChannels ?? []),
    review_requested_at: project.reviewRequestedAt ?? null,
    approved_at: project.approvedAt ?? null,
    published_at: project.publishedAt ?? null,
    archived_at: project.archivedAt ?? null
  };
}

export default class CreationProjectModel {
  static async create(project, connection = db) {
    const payload = serialise(project);
    const [id] = await connection(TABLE).insert(payload);
    return this.findById(id, connection);
  }

  static async findById(id, connection = db) {
    const row = await connection(TABLE).select(BASE_COLUMNS).where({ id }).first();
    return row ? this.deserialize(row) : null;
  }

  static async findByPublicId(publicId, connection = db) {
    const row = await connection(TABLE).select(BASE_COLUMNS).where({ public_id: publicId }).first();
    return row ? this.deserialize(row) : null;
  }

  static async updateById(id, updates, connection = db) {
    const payload = {};
    if (updates.title !== undefined) payload.title = updates.title;
    if (updates.summary !== undefined) payload.summary = updates.summary;
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.type !== undefined) payload.type = updates.type;
    if (updates.metadata !== undefined) payload.metadata = JSON.stringify(updates.metadata);
    if (updates.contentOutline !== undefined) payload.content_outline = JSON.stringify(updates.contentOutline);
    if (updates.complianceNotes !== undefined) payload.compliance_notes = JSON.stringify(updates.complianceNotes);
    if (updates.analyticsTargets !== undefined) payload.analytics_targets = JSON.stringify(updates.analyticsTargets);
    if (updates.publishingChannels !== undefined) payload.publishing_channels = JSON.stringify(updates.publishingChannels);
    if (updates.reviewRequestedAt !== undefined) payload.review_requested_at = updates.reviewRequestedAt;
    if (updates.approvedAt !== undefined) payload.approved_at = updates.approvedAt;
    if (updates.publishedAt !== undefined) payload.published_at = updates.publishedAt;
    if (updates.archivedAt !== undefined) payload.archived_at = updates.archivedAt;

    if (Object.keys(payload).length === 0) {
      return this.findById(id, connection);
    }

    await connection(TABLE)
      .where({ id })
      .update({ ...payload, updated_at: connection.fn.now() });
    return this.findById(id, connection);
  }

  static async list(
    {
      ownerId,
      search,
      status,
      type,
      includeArchived = false,
      projectIds,
      limit = 20,
      offset = 0,
      orderBy = 'updated_at',
      orderDirection = 'desc'
    } = {},
    connection = db
  ) {
    const query = connection(TABLE).select(BASE_COLUMNS);

    if (ownerId) {
      query.where('owner_id', ownerId);
    }

    if (projectIds && projectIds.length) {
      query.whereIn('id', projectIds);
    }

    if (!includeArchived) {
      query.whereNot('status', 'archived');
    }

    if (status && status.length) {
      const statuses = Array.isArray(status) ? status : [status];
      query.whereIn('status', statuses);
    }

    if (type && type.length) {
      const types = Array.isArray(type) ? type : [type];
      query.whereIn('type', types);
    }

    if (search) {
      query.andWhere((qb) => {
        qb.whereILike('title', `%${search}%`).orWhereILike('summary', `%${search}%`);
      });
    }

    const rows = await query.orderBy(orderBy, orderDirection).limit(limit).offset(offset);
    return rows.map((row) => this.deserialize(row));
  }

  static async count({ ownerId, status, type, includeArchived = false, search, projectIds } = {}, connection = db) {
    const query = connection(TABLE).count({ total: '*' });

    if (ownerId) {
      query.where('owner_id', ownerId);
    }

    if (projectIds && projectIds.length) {
      query.whereIn('id', projectIds);
    }

    if (!includeArchived) {
      query.whereNot('status', 'archived');
    }

    if (status && status.length) {
      const statuses = Array.isArray(status) ? status : [status];
      query.whereIn('status', statuses);
    }

    if (type && type.length) {
      const types = Array.isArray(type) ? type : [type];
      query.whereIn('type', types);
    }

    if (search) {
      query.andWhere((qb) => {
        qb.whereILike('title', `%${search}%`).orWhereILike('summary', `%${search}%`);
      });
    }

    const [{ total }] = await query;
    return Number(total ?? 0);
  }

  static async insertVersion({ projectId, versionNumber, snapshot, changeSummary, createdBy }, connection = db) {
    await connection('creation_project_versions').insert({
      project_id: projectId,
      version_number: versionNumber,
      snapshot: JSON.stringify(snapshot ?? {}),
      change_summary: JSON.stringify(changeSummary ?? {}),
      created_by: createdBy
    });
  }

  static async latestVersion(projectId, connection = db) {
    const row = await connection('creation_project_versions')
      .select(['version_number as versionNumber', 'snapshot', 'change_summary as changeSummary', 'created_at as createdAt'])
      .where({ project_id: projectId })
      .orderBy('version_number', 'desc')
      .first();
    if (!row) return null;
    return {
      ...row,
      snapshot: parseJsonField(row.snapshot, {}),
      changeSummary: parseJsonField(row.changeSummary, {})
    };
  }

  static async deserializeWithVersion(record, connection = db) {
    const project = this.deserialize(record);
    project.latestVersion = await this.latestVersion(project.id, connection);
    return project;
  }

  static deserialize(record) {
    return {
      ...record,
      metadata: parseJsonField(record.metadata, {}),
      contentOutline: parseJsonField(record.contentOutline, []),
      complianceNotes: parseJsonField(record.complianceNotes, []),
      analyticsTargets: parseJsonField(record.analyticsTargets, {}),
      publishingChannels: parseJsonField(record.publishingChannels, [])
    };
  }
}

