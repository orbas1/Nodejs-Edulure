import db from '../config/database.js';
import QaManualChecklistItemModel from './QaManualChecklistItemModel.js';

const TABLE = 'qa_manual_checklists';

const BASE_COLUMNS = [
  'id',
  'slug',
  'title',
  'version',
  'status',
  'owner_team as ownerTeam',
  'description',
  'updated_by as updatedBy',
  'metadata',
  'created_at as createdAt',
  'updated_at as updatedAt'
];

function parseJson(value, fallback) {
  if (!value) {
    return fallback;
  }

  if (typeof value === 'object') {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch (_error) {
    return fallback;
  }
}

function deserialize(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    version: row.version,
    status: row.status,
    ownerTeam: row.ownerTeam,
    description: row.description ?? null,
    updatedBy: row.updatedBy ?? null,
    metadata: parseJson(row.metadata, {}),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

export default class QaManualChecklistModel {
  static deserialize = deserialize;

  static async list(filters = {}, connection = db) {
    const query = connection(TABLE).select(BASE_COLUMNS);

    if (filters.status) {
      query.where('status', filters.status);
    }

    const rows = await query.orderBy('title', 'asc');
    const items = rows.map(deserialize);

    if (filters.includeItems) {
      const results = [];
      for (const checklist of items) {
        const childItems = await QaManualChecklistItemModel.listByChecklistId(checklist.id, connection);
        results.push({ ...checklist, items: childItems });
      }
      return results;
    }

    return items;
  }

  static async findBySlug(slug, { includeItems = true } = {}, connection = db) {
    if (!slug) {
      return null;
    }

    const row = await connection(TABLE).select(BASE_COLUMNS).where({ slug }).first();
    if (!row) {
      return null;
    }

    const checklist = deserialize(row);
    if (!includeItems) {
      return checklist;
    }

    const items = await QaManualChecklistItemModel.listByChecklistId(checklist.id, connection);
    return { ...checklist, items };
  }
}
