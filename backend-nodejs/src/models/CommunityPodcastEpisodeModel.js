import db from '../config/database.js';

function parseJson(value, fallback = {}) {
  if (!value) return { ...fallback };
  if (typeof value === 'object') return { ...fallback, ...value };
  try {
    const parsed = JSON.parse(value);
    return typeof parsed === 'object' && parsed !== null ? { ...fallback, ...parsed } : { ...fallback };
  } catch (_error) {
    return { ...fallback };
  }
}

function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    communityId: row.community_id,
    createdBy: row.created_by ?? null,
    title: row.title,
    host: row.host,
    stage: row.stage,
    releaseOn: row.release_on ?? null,
    durationMinutes: Number(row.duration_minutes ?? 0),
    summary: row.summary ?? null,
    audioUrl: row.audio_url ?? null,
    coverArtUrl: row.cover_art_url ?? null,
    metadata: parseJson(row.metadata, {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export default class CommunityPodcastEpisodeModel {
  static table(connection = db) {
    return connection('community_podcast_episodes');
  }

  static async listForCommunity(communityId, filters = {}, connection = db) {
    const { stage, search, limit = 100, offset = 0, order = 'desc' } = filters;
    const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 500);
    const safeOffset = Math.max(Number(offset) || 0, 0);
    const direction = order === 'asc' ? 'asc' : 'desc';

    const scopedQuery = this.table(connection)
      .where({ community_id: communityId })
      .modify((qb) => {
        if (Array.isArray(stage) && stage.length) {
          qb.whereIn('stage', stage);
        } else if (typeof stage === 'string' && stage) {
          qb.where('stage', stage);
        }
        if (search) {
          const like = `%${search.toLowerCase()}%`;
          qb.andWhere((inner) => {
            inner
              .whereRaw('LOWER(title) LIKE ?', [like])
              .orWhereRaw('LOWER(host) LIKE ?', [like])
              .orWhereRaw('LOWER(summary) LIKE ?', [like]);
          });
        }
      });

    const [rows, totalResult] = await Promise.all([
      scopedQuery
        .clone()
        .orderBy('release_on', direction)
        .limit(safeLimit)
        .offset(safeOffset),
      scopedQuery
        .clone()
        .clearSelect()
        .clearOrder()
        .count({ total: '*' })
        .first()
    ]);

    const total = Number(totalResult?.total ?? rows.length ?? 0);

    return {
      items: rows.map(mapRow),
      total,
      limit: safeLimit,
      offset: safeOffset
    };
  }

  static async findById(id, connection = db) {
    const row = await this.table(connection).where({ id }).first();
    return mapRow(row);
  }

  static async create(episode, connection = db) {
    const payload = {
      community_id: episode.communityId,
      created_by: episode.createdBy ?? null,
      title: episode.title,
      host: episode.host,
      stage: episode.stage ?? 'planning',
      release_on: episode.releaseOn ?? null,
      duration_minutes: episode.durationMinutes ?? 0,
      summary: episode.summary ?? null,
      audio_url: episode.audioUrl ?? null,
      cover_art_url: episode.coverArtUrl ?? null,
      metadata: JSON.stringify(episode.metadata ?? {})
    };

    const [id] = await this.table(connection).insert(payload);
    return this.findById(id, connection);
  }

  static async update(id, updates = {}, connection = db) {
    const payload = { updated_at: connection.fn.now() };

    if (updates.title !== undefined) payload.title = updates.title;
    if (updates.host !== undefined) payload.host = updates.host;
    if (updates.stage !== undefined) payload.stage = updates.stage;
    if (updates.releaseOn !== undefined) payload.release_on = updates.releaseOn;
    if (updates.durationMinutes !== undefined) payload.duration_minutes = updates.durationMinutes;
    if (updates.summary !== undefined) payload.summary = updates.summary;
    if (updates.audioUrl !== undefined) payload.audio_url = updates.audioUrl;
    if (updates.coverArtUrl !== undefined) payload.cover_art_url = updates.coverArtUrl;
    if (updates.metadata !== undefined) payload.metadata = JSON.stringify(updates.metadata ?? {});

    await this.table(connection).where({ id }).update(payload);
    return this.findById(id, connection);
  }

  static async delete(id, connection = db) {
    await this.table(connection).where({ id }).del();
  }
}
