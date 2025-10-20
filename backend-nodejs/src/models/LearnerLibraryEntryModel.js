import db from '../config/database.js';

const TABLE = 'learner_library_entries';

function parseJson(value, fallback = []) {
  if (value === null || value === undefined) {
    return fallback;
  }
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value === 'object') {
    return value;
  }
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(fallback)) {
      return Array.isArray(parsed) ? parsed : fallback;
    }
    return parsed ?? fallback;
  } catch (_error) {
    return fallback;
  }
}

function serialiseJson(value, fallback = []) {
  if (value === null || value === undefined) {
    return JSON.stringify(fallback);
  }
  if (typeof value === 'string') {
    return value;
  }
  return JSON.stringify(value);
}

function deserialize(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    assetId: row.asset_id ?? null,
    title: row.title,
    format: row.format,
    progress: row.progress != null ? Number(row.progress) : 0,
    lastOpened: row.last_opened,
    url: row.url ?? null,
    summary: row.summary ?? null,
    author: row.author ?? null,
    coverUrl: row.cover_url ?? null,
    tags: parseJson(row.tags, []),
    highlights: parseJson(row.highlights, []),
    audioUrl: row.audio_url ?? null,
    previewUrl: row.preview_url ?? null,
    metadata: parseJson(row.metadata, {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export default class LearnerLibraryEntryModel {
  static deserialize(row) {
    return deserialize(row);
  }

  static async listByUserId(userId, connection = db) {
    if (!userId) return [];
    const rows = await connection(TABLE)
      .select([
        'id',
        'user_id',
        'asset_id',
        'title',
        'format',
        'progress',
        'last_opened',
        'url',
        'summary',
        'author',
        'cover_url',
        'tags',
        'highlights',
        'audio_url',
        'preview_url',
        'metadata',
        'created_at',
        'updated_at'
      ])
      .where({ user_id: userId })
      .orderBy('updated_at', 'desc');
    return rows.map(deserialize);
  }

  static async findByIdForUser(userId, entryId, connection = db) {
    if (!userId || !entryId) return null;
    const row = await connection(TABLE)
      .select([
        'id',
        'user_id',
        'asset_id',
        'title',
        'format',
        'progress',
        'last_opened',
        'url',
        'summary',
        'author',
        'cover_url',
        'tags',
        'highlights',
        'audio_url',
        'preview_url',
        'metadata',
        'created_at',
        'updated_at'
      ])
      .where({ id: entryId, user_id: userId })
      .first();
    return deserialize(row);
  }

  static async create(entry, connection = db) {
    const payload = {
      user_id: entry.userId,
      asset_id: entry.assetId ?? null,
      title: entry.title,
      format: entry.format ?? 'E-book',
      progress: entry.progress ?? 0,
      last_opened: entry.lastOpened ?? null,
      url: entry.url ?? null,
      summary: entry.summary ?? null,
      author: entry.author ?? null,
      cover_url: entry.coverUrl ?? null,
      tags: serialiseJson(entry.tags, []),
      highlights: serialiseJson(entry.highlights, []),
      audio_url: entry.audioUrl ?? null,
      preview_url: entry.previewUrl ?? null,
      metadata: serialiseJson(entry.metadata, {})
    };
    const [id] = await connection(TABLE).insert(payload);
    return this.findByIdForUser(entry.userId, id, connection);
  }

  static async updateByIdForUser(userId, entryId, updates, connection = db) {
    if (!userId || !entryId) return null;
    const payload = {};
    if (updates.title !== undefined) payload.title = updates.title;
    if (updates.format !== undefined) payload.format = updates.format;
    if (updates.progress !== undefined) payload.progress = updates.progress;
    if (updates.lastOpened !== undefined) payload.last_opened = updates.lastOpened;
    if (updates.url !== undefined) payload.url = updates.url;
    if (updates.summary !== undefined) payload.summary = updates.summary;
    if (updates.author !== undefined) payload.author = updates.author;
    if (updates.coverUrl !== undefined) payload.cover_url = updates.coverUrl;
    if (updates.tags !== undefined) payload.tags = serialiseJson(updates.tags, []);
    if (updates.highlights !== undefined) payload.highlights = serialiseJson(updates.highlights, []);
    if (updates.audioUrl !== undefined) payload.audio_url = updates.audioUrl;
    if (updates.previewUrl !== undefined) payload.preview_url = updates.previewUrl;
    if (updates.metadata !== undefined) payload.metadata = serialiseJson(updates.metadata, {});
    if (updates.assetId !== undefined) payload.asset_id = updates.assetId;

    if (Object.keys(payload).length === 0) {
      return this.findByIdForUser(userId, entryId, connection);
    }

    await connection(TABLE).where({ id: entryId, user_id: userId }).update(payload);
    return this.findByIdForUser(userId, entryId, connection);
  }

  static async deleteByIdForUser(userId, entryId, connection = db) {
    if (!userId || !entryId) return 0;
    return connection(TABLE).where({ id: entryId, user_id: userId }).del();
  }
}
