import db from '../config/database.js';

const TABLE = 'course_module_versions';

const BASE_COLUMNS = [
  'id',
  'module_id as moduleId',
  'course_id as courseId',
  'version',
  'change_type as changeType',
  'change_reason as changeReason',
  'changed_by as changedBy',
  'captured_at as capturedAt',
  'snapshot',
  'diff',
  'created_at as createdAt',
  'updated_at as updatedAt'
];

function parseJson(value, fallback) {
  if (!value) {
    return structuredClone(fallback);
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
      return structuredClone(fallback);
    } catch (_error) {
      return structuredClone(fallback);
    }
  }
  if (typeof value === 'object') {
    return { ...fallback, ...value };
  }
  return structuredClone(fallback);
}

function toDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function buildSnapshot(moduleRecord) {
  if (!moduleRecord) {
    return {};
  }

  const metadataRaw =
    moduleRecord.metadata ?? moduleRecord.metadataJson ?? moduleRecord.metadata_json ?? null;
  let metadata;
  if (typeof metadataRaw === 'string') {
    try {
      metadata = JSON.parse(metadataRaw);
    } catch (_error) {
      metadata = {};
    }
  } else if (metadataRaw && typeof metadataRaw === 'object') {
    metadata = metadataRaw;
  } else {
    metadata = {};
  }

  return {
    moduleId: moduleRecord.id ?? moduleRecord.module_id ?? moduleRecord.moduleId ?? null,
    courseId: moduleRecord.course_id ?? moduleRecord.courseId ?? null,
    title: moduleRecord.title ?? null,
    slug: moduleRecord.slug ?? null,
    position: moduleRecord.position ?? null,
    releaseOffsetDays:
      moduleRecord.release_offset_days ?? moduleRecord.releaseOffsetDays ?? null,
    metadata,
    updatedAt: moduleRecord.updated_at ?? moduleRecord.updatedAt ?? null
  };
}

function computeDiff(previousSnapshot = {}, nextSnapshot = {}) {
  const keys = new Set([...Object.keys(previousSnapshot), ...Object.keys(nextSnapshot)]);
  const diff = {};
  for (const key of keys) {
    const before = previousSnapshot[key];
    const after = nextSnapshot[key];
    const beforeJson = JSON.stringify(before);
    const afterJson = JSON.stringify(after);
    if (beforeJson !== afterJson) {
      diff[key] = { before, after };
    }
  }
  return diff;
}

export default class CourseModuleVersionModel {
  static deserialize(record) {
    if (!record) {
      return null;
    }

    return {
      ...record,
      snapshot: parseJson(record.snapshot, {}),
      diff: parseJson(record.diff, {}),
      capturedAt: toDate(record.capturedAt),
      createdAt: toDate(record.createdAt),
      updatedAt: toDate(record.updatedAt)
    };
  }

  static async listByModuleId(moduleId, connection = db) {
    if (!moduleId) {
      return [];
    }

    const rows = await connection(TABLE)
      .select(BASE_COLUMNS)
      .where({ module_id: moduleId })
      .orderBy('version', 'desc');

    return rows.map((row) => this.deserialize(row));
  }

  static async recordSnapshot(moduleRecord, options = {}, connection = db) {
    if (!moduleRecord) {
      return null;
    }

    const snapshot = buildSnapshot(moduleRecord);
    const result = await connection(TABLE)
      .where({ module_id: snapshot.moduleId })
      .max({ maxVersion: 'version' })
      .first();

    const currentVersion = Number(result?.maxVersion ?? 0);
    const nextVersion = currentVersion + 1;

    let previousSnapshot = {};
    if (currentVersion > 0) {
      const latest = await connection(TABLE)
        .select('snapshot')
        .where({ module_id: snapshot.moduleId, version: currentVersion })
        .first();
      previousSnapshot = parseJson(latest?.snapshot, {});
    }

    const diff = computeDiff(previousSnapshot, snapshot);

    const payload = {
      module_id: snapshot.moduleId,
      course_id: snapshot.courseId,
      version: nextVersion,
      change_type: options.changeType ?? 'update',
      change_reason: options.changeReason ?? null,
      changed_by: options.changedBy ?? null,
      captured_at: connection.fn.now(),
      snapshot: JSON.stringify(snapshot),
      diff: JSON.stringify(diff)
    };

    const [id] = await connection(TABLE).insert(payload);
    const created = await connection(TABLE).select(BASE_COLUMNS).where({ id }).first();
    return this.deserialize(created);
  }
}
