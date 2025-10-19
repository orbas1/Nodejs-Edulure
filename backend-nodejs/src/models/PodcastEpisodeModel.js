import slugify from 'slugify';

import db from '../config/database.js';

const TABLE = 'podcast_episodes';

const BASE_COLUMNS = [
  'pe.id',
  'pe.show_id as showId',
  'pe.title',
  'pe.slug',
  'pe.summary',
  'pe.description',
  'pe.audio_url as audioUrl',
  'pe.video_url as videoUrl',
  'pe.duration_seconds as durationSeconds',
  'pe.season_number as seasonNumber',
  'pe.episode_number as episodeNumber',
  'pe.status',
  'pe.publish_at as publishAt',
  'pe.metadata',
  'pe.created_at as createdAt',
  'pe.updated_at as updatedAt',
  'ps.title as showTitle'
];

function toDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseJson(value, fallback) {
  if (value === null || value === undefined) {
    return structuredClone(fallback);
  }
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
  if (Array.isArray(fallback)) {
    return Array.isArray(value) ? value : structuredClone(fallback);
  }
  if (typeof value === 'object' && value !== null) {
    return { ...fallback, ...value };
  }
  return structuredClone(fallback);
}

function serialiseJson(value, fallback) {
  if (value === null || value === undefined) {
    return JSON.stringify(fallback);
  }
  if (typeof value === 'string') {
    return value;
  }
  return JSON.stringify(value);
}

function normaliseSlug(value, fallback) {
  const base = value || fallback;
  if (!base) {
    return null;
  }
  return slugify(base, { lower: true, strict: true });
}

function deserialize(record) {
  if (!record) return null;
  return {
    id: record.id,
    showId: record.showId,
    showTitle: record.showTitle ?? null,
    title: record.title,
    slug: record.slug,
    summary: record.summary ?? null,
    description: record.description ?? null,
    audioUrl: record.audioUrl ?? null,
    videoUrl: record.videoUrl ?? null,
    durationSeconds: Number(record.durationSeconds ?? 0),
    seasonNumber: Number(record.seasonNumber ?? 1),
    episodeNumber: Number(record.episodeNumber ?? 1),
    status: record.status,
    publishAt: toDate(record.publishAt),
    metadata: parseJson(record.metadata, {}),
    createdAt: toDate(record.createdAt),
    updatedAt: toDate(record.updatedAt)
  };
}

export default class PodcastEpisodeModel {
  static async listByShow(showId, { status, search, limit = 100, offset = 0 } = {}, connection = db) {
    const query = connection(`${TABLE} as pe`)
      .leftJoin('podcast_shows as ps', 'pe.show_id', 'ps.id')
      .select(BASE_COLUMNS)
      .where('pe.show_id', showId)
      .orderBy([{ column: 'pe.season_number', order: 'desc' }, { column: 'pe.episode_number', order: 'desc' }]);

    if (status) {
      query.andWhere('pe.status', status);
    }

    if (search) {
      query.where((builder) => {
        builder
          .whereILike('pe.title', `%${search}%`)
          .orWhereILike('pe.slug', `%${search}%`)
          .orWhereILike('pe.summary', `%${search}%`);
      });
    }

    const rows = await query.limit(limit).offset(offset);
    return rows.map((row) => deserialize(row));
  }

  static async countByShow(showId, { status, search } = {}, connection = db) {
    const query = connection(TABLE).where({ show_id: showId });
    if (status) {
      query.andWhere('status', status);
    }
    if (search) {
      query.where((builder) => {
        builder
          .whereILike('title', `%${search}%`)
          .orWhereILike('slug', `%${search}%`)
          .orWhereILike('summary', `%${search}%`);
      });
    }
    const result = await query.count({ total: '*' }).first();
    return Number(result?.total ?? 0);
  }

  static async findById(id, connection = db) {
    const row = await connection(`${TABLE} as pe`)
      .leftJoin('podcast_shows as ps', 'pe.show_id', 'ps.id')
      .select(BASE_COLUMNS)
      .where('pe.id', id)
      .first();
    return deserialize(row);
  }

  static async create(episode, connection = db) {
    const payload = {
      show_id: episode.showId,
      title: episode.title,
      slug: normaliseSlug(episode.slug, episode.title),
      summary: episode.summary ?? null,
      description: episode.description ?? null,
      audio_url: episode.audioUrl ?? null,
      video_url: episode.videoUrl ?? null,
      duration_seconds: episode.durationSeconds ?? 0,
      season_number: episode.seasonNumber ?? 1,
      episode_number: episode.episodeNumber ?? 1,
      status: episode.status ?? 'draft',
      publish_at: episode.publishAt ?? null,
      metadata: serialiseJson(episode.metadata ?? {}, {})
    };

    const [id] = await connection(TABLE).insert(payload);
    return this.findById(id, connection);
  }

  static async updateById(id, updates, connection = db) {
    const payload = {};
    if (updates.showId !== undefined) payload.show_id = updates.showId;
    if (updates.title !== undefined) payload.title = updates.title;
    if (updates.slug !== undefined) payload.slug = normaliseSlug(updates.slug, updates.title);
    if (updates.summary !== undefined) payload.summary = updates.summary ?? null;
    if (updates.description !== undefined) payload.description = updates.description ?? null;
    if (updates.audioUrl !== undefined) payload.audio_url = updates.audioUrl ?? null;
    if (updates.videoUrl !== undefined) payload.video_url = updates.videoUrl ?? null;
    if (updates.durationSeconds !== undefined) payload.duration_seconds = updates.durationSeconds ?? 0;
    if (updates.seasonNumber !== undefined) payload.season_number = updates.seasonNumber ?? 1;
    if (updates.episodeNumber !== undefined) payload.episode_number = updates.episodeNumber ?? 1;
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.publishAt !== undefined) payload.publish_at = updates.publishAt ?? null;
    if (updates.metadata !== undefined) payload.metadata = serialiseJson(updates.metadata ?? {}, {});

    if (Object.keys(payload).length === 0) {
      return this.findById(id, connection);
    }

    await connection(TABLE)
      .where({ id })
      .update({ ...payload, updated_at: connection.fn.now() });

    return this.findById(id, connection);
  }

  static async deleteById(id, connection = db) {
    await connection(TABLE).where({ id }).del();
  }
}
