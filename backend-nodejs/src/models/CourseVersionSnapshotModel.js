import db from '../config/database.js';

const TABLE = 'course_version_snapshots';

const BASE_COLUMNS = [
  'id',
  'course_id as courseId',
  'version',
  'actor_id as actorId',
  'change_summary as changeSummary',
  'changes',
  'snapshot',
  'recorded_at as recordedAt',
  'created_at as createdAt',
  'updated_at as updatedAt'
];

const TRACKED_FIELDS = [
  'title',
  'summary',
  'description',
  'level',
  'category',
  'skills',
  'tags',
  'languages',
  'deliveryFormat',
  'priceCurrency',
  'priceAmount',
  'status',
  'isPublished',
  'releaseAt',
  'clusterKey',
  'metadata'
];

function toIso(value) {
  if (!value) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function stableStringify(value) {
  if (value === null || value === undefined) {
    return 'null';
  }
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(',')}]`;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'object') {
    const entries = Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`);
    return `{${entries.join(',')}}`;
  }
  if (typeof value === 'number' && !Number.isFinite(value)) {
    return 'null';
  }
  return JSON.stringify(value);
}

function valuesEqual(previous, next) {
  return stableStringify(previous) === stableStringify(next);
}

function parseJson(raw, fallback) {
  if (!raw) {
    return fallback;
  }
  if (typeof raw === 'object') {
    return raw;
  }
  if (typeof raw !== 'string') {
    return fallback;
  }
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return parsed;
    }
  } catch (_error) {
    return fallback;
  }
  return fallback;
}

function normaliseCourseSnapshot(course) {
  if (!course) {
    return null;
  }
  return {
    id: course.id ?? null,
    publicId: course.publicId ?? null,
    instructorId: course.instructorId ?? null,
    title: course.title ?? null,
    summary: course.summary ?? null,
    description: course.description ?? null,
    level: course.level ?? null,
    category: course.category ?? null,
    skills: Array.isArray(course.skills) ? [...course.skills] : [],
    tags: Array.isArray(course.tags) ? [...course.tags] : [],
    languages: Array.isArray(course.languages) ? [...course.languages] : [],
    deliveryFormat: course.deliveryFormat ?? null,
    thumbnailUrl: course.thumbnailUrl ?? null,
    heroImageUrl: course.heroImageUrl ?? null,
    trailerUrl: course.trailerUrl ?? null,
    promoVideoUrl: course.promoVideoUrl ?? null,
    syllabusUrl: course.syllabusUrl ?? null,
    priceCurrency: course.priceCurrency ?? null,
    priceAmount: course.priceAmount ?? null,
    status: course.status ?? null,
    isPublished: typeof course.isPublished === 'boolean' ? course.isPublished : Boolean(course.isPublished),
    releaseAt: toIso(course.releaseAt ?? null),
    clusterKey: course.clusterKey ?? null,
    metadata: course.metadata && typeof course.metadata === 'object' ? course.metadata : {},
    updatedAt: toIso(course.updatedAt ?? null)
  };
}

function computeChanges(previous, next) {
  if (!next) {
    return [];
  }
  const changes = [];
  TRACKED_FIELDS.forEach((field) => {
    const prevValue = previous ? previous[field] ?? null : null;
    const nextValue = next[field] ?? null;
    if (!valuesEqual(prevValue, nextValue)) {
      changes.push({ field, previous: prevValue, next: nextValue });
    }
  });
  return changes;
}

function summariseChanges(changes) {
  if (!changes.length) {
    return 'No material field updates';
  }
  const fields = changes.map((change) => change.field);
  if (fields.length <= 3) {
    return `Updated ${fields.join(', ')}`;
  }
  const headline = fields.slice(0, 3).join(', ');
  return `Updated ${fields.length} fields (${headline}, …)`;
}

function buildSnapshotRow(row) {
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    courseId: row.courseId,
    version: row.version,
    actorId: row.actorId ?? null,
    changeSummary: row.changeSummary ?? 'No material field updates',
    changes: computeChangesForRow(row.changes),
    snapshot: normaliseSnapshot(row.snapshot),
    recordedAt: toIso(row.recordedAt ?? null),
    createdAt: toIso(row.createdAt ?? null),
    updatedAt: toIso(row.updatedAt ?? null)
  };
}

function computeChangesForRow(rawChanges) {
  const parsed = parseJson(rawChanges, []);
  if (!Array.isArray(parsed)) {
    return [];
  }
  return parsed.map((change) => ({
    field: change.field,
    previous: change.previous ?? null,
    next: change.next ?? null
  }));
}

function normaliseSnapshot(rawSnapshot) {
  const parsed = parseJson(rawSnapshot, {});
  if (!parsed || typeof parsed !== 'object') {
    return {};
  }
  return {
    previous: parsed.previous ?? null,
    next: parsed.next ?? null
  };
}

async function nextVersionNumber(courseId, connection) {
  const result = await connection(TABLE)
    .where({ course_id: courseId })
    .max('version as maxVersion')
    .first();
  const current = Number(result?.maxVersion ?? 0);
  return Number.isNaN(current) ? 1 : current + 1;
}

export default class CourseVersionSnapshotModel {
  static async recordChange({ courseId, previous, next, actorId = null, changeSummary, force = false }, connection = db) {
    if (!courseId || !next) {
      return null;
    }

    const previousSnapshot = normaliseCourseSnapshot(previous);
    const nextSnapshot = normaliseCourseSnapshot(next);
    const changes = computeChanges(previousSnapshot, nextSnapshot);

    if (!force && changes.length === 0) {
      return null;
    }

    const summary = changeSummary ?? summariseChanges(changes);
    const version = await nextVersionNumber(courseId, connection);

    const payload = {
      course_id: courseId,
      version,
      actor_id: actorId ?? null,
      change_summary: summary,
      changes: JSON.stringify(changes),
      snapshot: JSON.stringify({ previous: previousSnapshot, next: nextSnapshot }),
      recorded_at: connection.fn.now(),
      created_at: connection.fn.now(),
      updated_at: connection.fn.now()
    };

    const insertResult = await connection(TABLE).insert(payload, ['id']);
    const id = insertResult?.[0]?.id ?? insertResult?.id ?? insertResult;
    if (!id) {
      return null;
    }
    return this.findById(id, connection);
  }

  static async recordInitial(course, connection = db, { actorId = null } = {}) {
    if (!course?.id) {
      return null;
    }
    return this.recordChange({ courseId: course.id, previous: null, next: course, actorId, changeSummary: 'Initial snapshot', force: true }, connection);
  }

  static async findById(id, connection = db) {
    const row = await connection(TABLE).select(BASE_COLUMNS).where({ id }).first();
    return buildSnapshotRow(row);
  }

  static async listByCourse(courseId, { limit = 20, offset = 0 } = {}, connection = db) {
    const rows = await connection(TABLE)
      .select(BASE_COLUMNS)
      .where({ course_id: courseId })
      .orderBy('version', 'desc')
      .limit(limit)
      .offset(offset);
    return rows.map((row) => buildSnapshotRow(row));
  }
}
