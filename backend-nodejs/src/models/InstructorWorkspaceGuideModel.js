import db from '../config/database.js';

const TABLE = 'instructor_workspace_guides';

function parseJson(value, fallback) {
  if (!value && value !== 0) {
    return structuredClone(fallback);
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
    } catch (_error) {
      return structuredClone(fallback);
    }
  }

  if (Array.isArray(fallback)) {
    return Array.isArray(value) ? value : structuredClone(fallback);
  }

  if (typeof value === 'object') {
    return { ...fallback, ...value };
  }

  return structuredClone(fallback);
}

function normaliseProjectTypes(value) {
  if (!value) {
    return ['all'];
  }

  const list = Array.isArray(value) ? value : [value];
  const normalised = new Set();
  for (const entry of list) {
    const token = String(entry).trim().toLowerCase();
    if (!token) continue;
    normalised.add(token);
  }
  if (normalised.size === 0) {
    normalised.add('all');
  }
  return Array.from(normalised);
}

export default class InstructorWorkspaceGuideModel {
  static deserialize(row) {
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      summary: row.summary ?? null,
      body: row.body,
      projectTypes: normaliseProjectTypes(parseJson(row.project_types, [])),
      tone: row.tone ?? 'info',
      recommendations: parseJson(row.recommendations, []),
      metadata: parseJson(row.metadata, {}),
      isActive: Boolean(row.is_active ?? row.isActive ?? true),
      publishedAt: row.published_at ?? row.publishedAt ?? null,
      retiredAt: row.retired_at ?? row.retiredAt ?? null,
      createdAt: row.created_at ?? row.createdAt ?? null,
      updatedAt: row.updated_at ?? row.updatedAt ?? null
    };
  }

  static async listActiveForProjectType(projectType, { limit = 8 } = {}, connection = db) {
    const normalisedType = String(projectType ?? 'all').trim().toLowerCase();
    const query = connection(TABLE)
      .where({ is_active: 1 })
      .orderBy([{ column: 'tone', order: 'asc' }, { column: 'updated_at', order: 'desc' }, { column: 'id', order: 'desc' }])
      .limit(Math.max(1, Math.min(limit, 20)));

    if (normalisedType !== 'all') {
      query.andWhere((builder) => {
        builder
          .whereRaw('JSON_CONTAINS(project_types, ?)', [JSON.stringify(normalisedType)])
          .orWhereRaw('JSON_CONTAINS(project_types, ?)', [JSON.stringify('all')]);
      });
    }

    const rows = await query;
    return rows.map((row) => this.deserialize(row));
  }
}
