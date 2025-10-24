import { randomUUID } from 'node:crypto';

import db from '../config/database.js';
import { CREATION_PROJECT_STATUSES, CREATION_PROJECT_TYPES } from '../constants/creationStudio.js';

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

const PROJECT_TYPE_SET = new Set(CREATION_PROJECT_TYPES);
const PROJECT_STATUS_SET = new Set(CREATION_PROJECT_STATUSES);

function ensureValidType(type) {
  if (!PROJECT_TYPE_SET.has(type)) {
    throw new Error('Invalid creation project type');
  }
}

function ensureValidStatus(status) {
  if (!PROJECT_STATUS_SET.has(status)) {
    throw new Error('Invalid creation project status');
  }
}

function ensureOwnerId(ownerId) {
  if (!Number.isInteger(Number(ownerId))) {
    throw new Error('Invalid owner id for creation project');
  }
}

function ensureTitle(title) {
  if (!title || String(title).trim().length === 0) {
    throw new Error('Creation project title is required');
  }
}

function normaliseObject(value, fallback = {}) {
  if (value === null || value === undefined) {
    return structuredClone(fallback);
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? parsed
        : structuredClone(fallback);
    } catch (_error) {
      return structuredClone(fallback);
    }
  }
  if (typeof value === 'object' && !Array.isArray(value)) {
    return value;
  }
  return structuredClone(fallback);
}

function normaliseArray(value, fallback = []) {
  if (value === null || value === undefined) {
    return structuredClone(fallback);
  }
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : structuredClone(fallback);
    } catch (_error) {
      return structuredClone(fallback);
    }
  }
  return structuredClone(fallback);
}

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
  ensureOwnerId(project.ownerId);
  ensureTitle(project.title);
  ensureValidType(project.type);
  const status = project.status ?? 'draft';
  ensureValidStatus(status);
  const metadata = normaliseObject(project.metadata);
  const contentOutline = normaliseArray(project.contentOutline);
  const complianceNotes = normaliseArray(project.complianceNotes);
  const analyticsTargets = normaliseObject(project.analyticsTargets);
  const publishingChannels = normaliseArray(project.publishingChannels);

  return {
    public_id: project.publicId ?? randomUUID(),
    owner_id: project.ownerId,
    type: project.type,
    status,
    title: project.title,
    summary: project.summary ?? null,
    metadata: JSON.stringify(metadata),
    content_outline: JSON.stringify(contentOutline),
    compliance_notes: JSON.stringify(complianceNotes),
    analytics_targets: JSON.stringify(analyticsTargets),
    publishing_channels: JSON.stringify(publishingChannels),
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
    if (updates.title !== undefined) {
      ensureTitle(updates.title);
      payload.title = updates.title;
    }
    if (updates.summary !== undefined) payload.summary = updates.summary;
    if (updates.status !== undefined) {
      ensureValidStatus(updates.status);
      payload.status = updates.status;
    }
    if (updates.type !== undefined) {
      ensureValidType(updates.type);
      payload.type = updates.type;
    }
    if (updates.metadata !== undefined) {
      payload.metadata = JSON.stringify(normaliseObject(updates.metadata));
    }
    if (updates.contentOutline !== undefined) {
      payload.content_outline = JSON.stringify(normaliseArray(updates.contentOutline));
    }
    if (updates.complianceNotes !== undefined) {
      payload.compliance_notes = JSON.stringify(normaliseArray(updates.complianceNotes));
    }
    if (updates.analyticsTargets !== undefined) {
      payload.analytics_targets = JSON.stringify(normaliseObject(updates.analyticsTargets));
    }
    if (updates.publishingChannels !== undefined) {
      payload.publishing_channels = JSON.stringify(normaliseArray(updates.publishingChannels));
    }
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
      const statuses = (Array.isArray(status) ? status : [status]).filter((value) =>
        PROJECT_STATUS_SET.has(value)
      );
      if (statuses.length) {
        query.whereIn('status', statuses);
      }
    }

    if (type && type.length) {
      const types = (Array.isArray(type) ? type : [type]).filter((value) => PROJECT_TYPE_SET.has(value));
      if (types.length) {
        query.whereIn('type', types);
      }
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
      const statuses = (Array.isArray(status) ? status : [status]).filter((value) =>
        PROJECT_STATUS_SET.has(value)
      );
      if (statuses.length) {
        query.whereIn('status', statuses);
      }
    }

    if (type && type.length) {
      const types = (Array.isArray(type) ? type : [type]).filter((value) => PROJECT_TYPE_SET.has(value));
      if (types.length) {
        query.whereIn('type', types);
      }
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
    const normalisedSnapshot = snapshot && typeof snapshot === 'object' ? snapshot : {};
    const normalisedSummary = normaliseObject(changeSummary ?? {});
    await connection('creation_project_versions').insert({
      project_id: projectId,
      version_number: versionNumber,
      snapshot: JSON.stringify(normalisedSnapshot),
      change_summary: JSON.stringify(normalisedSummary),
      created_by: createdBy
    });
  }

  static async latestVersion(projectId, connection = db) {
    const row = await connection('creation_project_versions')
      .select([
        'version_number as versionNumber',
        'snapshot',
        'change_summary as changeSummary',
        'created_by as createdBy',
        'created_at as createdAt'
      ])
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

