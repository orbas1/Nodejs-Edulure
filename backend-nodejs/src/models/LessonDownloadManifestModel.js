import db from '../config/database.js';

const TABLE = 'lesson_download_manifests';

const BASE_COLUMNS = [
  'manifest.id',
  'manifest.public_id as publicId',
  'manifest.course_id as courseId',
  'manifest.module_id as moduleId',
  'manifest.version',
  'manifest.status',
  'manifest.bundle_url as bundleUrl',
  'manifest.checksum_sha256 as checksumSha256',
  'manifest.size_bytes as sizeBytes',
  'manifest.metadata',
  'manifest.published_at as publishedAt',
  'manifest.created_at as createdAt',
  'manifest.updated_at as updatedAt',
  'module.slug as moduleSlug',
  'module.title as moduleTitle',
  'module.position as modulePosition'
];

function parseJson(value) {
  if (!value) {
    return {};
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (_error) {
      return {};
    }
  }
  if (typeof value === 'object' && value !== null) {
    return { ...value };
  }
  return {};
}

function toDate(value) {
  if (!value) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normaliseSize(value) {
  if (value === null || value === undefined) {
    return 0;
  }
  const num = typeof value === 'string' ? Number(value) : value;
  return Number.isFinite(num) ? Number(num) : 0;
}

function deserialize(row) {
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    publicId: row.publicId,
    courseId: row.courseId,
    moduleId: row.moduleId,
    moduleSlug: row.moduleSlug ?? null,
    moduleTitle: row.moduleTitle ?? null,
    modulePosition: row.modulePosition ?? null,
    version: row.version,
    status: row.status,
    bundleUrl: row.bundleUrl ?? null,
    checksumSha256: row.checksumSha256 ?? null,
    sizeBytes: normaliseSize(row.sizeBytes),
    metadata: parseJson(row.metadata),
    publishedAt: toDate(row.publishedAt),
    createdAt: toDate(row.createdAt),
    updatedAt: toDate(row.updatedAt)
  };
}

export default class LessonDownloadManifestModel {
  static async listByCourseId(courseId, connection = db) {
    if (!courseId) {
      return [];
    }
    const rows = await connection(`${TABLE} as manifest`)
      .select(BASE_COLUMNS)
      .leftJoin('course_modules as module', 'module.id', 'manifest.module_id')
      .where('manifest.course_id', courseId)
      .orderBy('module.position', 'asc')
      .orderBy('manifest.version', 'desc');
    return rows.map(deserialize).filter(Boolean);
  }

  static async findByModule(courseId, moduleId, connection = db) {
    if (!courseId || !moduleId) {
      return null;
    }
    const row = await connection(`${TABLE} as manifest`)
      .select(BASE_COLUMNS)
      .leftJoin('course_modules as module', 'module.id', 'manifest.module_id')
      .where('manifest.course_id', courseId)
      .andWhere('manifest.module_id', moduleId)
      .orderBy('manifest.version', 'desc')
      .first();
    return deserialize(row);
  }

  static async findByPublicId(publicId, connection = db) {
    if (!publicId) {
      return null;
    }
    const row = await connection(`${TABLE} as manifest`)
      .select(BASE_COLUMNS)
      .leftJoin('course_modules as module', 'module.id', 'manifest.module_id')
      .where('manifest.public_id', publicId)
      .first();
    return deserialize(row);
  }

  static async findById(id, connection = db) {
    if (!id) {
      return null;
    }
    const row = await connection(`${TABLE} as manifest`)
      .select(BASE_COLUMNS)
      .leftJoin('course_modules as module', 'module.id', 'manifest.module_id')
      .where('manifest.id', id)
      .first();
    return deserialize(row);
  }

  static async create(manifest, connection = db) {
    const payload = {
      public_id: manifest.publicId ?? null,
      course_id: manifest.courseId,
      module_id: manifest.moduleId,
      version: manifest.version ?? 1,
      status: manifest.status ?? 'published',
      bundle_url: manifest.bundleUrl ?? null,
      checksum_sha256: manifest.checksumSha256 ?? null,
      size_bytes: normaliseSize(manifest.sizeBytes ?? 0),
      published_at: manifest.publishedAt ?? null,
      metadata: JSON.stringify(manifest.metadata ?? {})
    };
    if (!payload.public_id) {
      delete payload.public_id;
    }
    const [id] = await connection(TABLE).insert(payload);
    return this.findById(id, connection);
  }

  static async updateById(id, updates, connection = db) {
    if (!id || !updates) {
      return this.findById(id, connection);
    }
    const payload = {};
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.bundleUrl !== undefined) payload.bundle_url = updates.bundleUrl ?? null;
    if (updates.checksumSha256 !== undefined) payload.checksum_sha256 = updates.checksumSha256 ?? null;
    if (updates.sizeBytes !== undefined) payload.size_bytes = normaliseSize(updates.sizeBytes);
    if (updates.publishedAt !== undefined) payload.published_at = updates.publishedAt ?? null;
    if (updates.metadata !== undefined) payload.metadata = JSON.stringify(updates.metadata ?? {});
    if (updates.version !== undefined) payload.version = updates.version;

    if (Object.keys(payload).length === 0) {
      return this.findById(id, connection);
    }

    await connection(TABLE).where({ id }).update(payload);
    return this.findById(id, connection);
  }
}
