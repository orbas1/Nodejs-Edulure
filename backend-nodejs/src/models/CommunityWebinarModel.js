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
    topic: row.topic,
    host: row.host,
    startAt: row.start_at,
    status: row.status,
    registrantCount: Number(row.registrant_count ?? 0),
    watchUrl: row.watch_url ?? null,
    description: row.description ?? null,
    metadata: parseJson(row.metadata, {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export default class CommunityWebinarModel {
  static table(connection = db) {
    return connection('community_webinars');
  }

  static async listForCommunity(communityId, filters = {}, connection = db) {
    const { status, search, limit = 100, offset = 0, order = 'desc' } = filters;
    const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 500);
    const safeOffset = Math.max(Number(offset) || 0, 0);
    const direction = order === 'asc' ? 'asc' : 'desc';

    const scopedQuery = this.table(connection)
      .where({ community_id: communityId })
      .modify((qb) => {
        if (Array.isArray(status) && status.length) {
          qb.whereIn('status', status);
        } else if (typeof status === 'string' && status) {
          qb.where('status', status);
        }
        if (search) {
          const like = `%${search.toLowerCase()}%`;
          qb.andWhere((inner) => {
            inner.whereRaw('LOWER(topic) LIKE ?', [like]).orWhereRaw('LOWER(host) LIKE ?', [like]);
          });
        }
      });

    const [rows, totalResult] = await Promise.all([
      scopedQuery
        .clone()
        .orderBy('start_at', direction)
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

  static async create(webinar, connection = db) {
    const payload = {
      community_id: webinar.communityId,
      created_by: webinar.createdBy ?? null,
      topic: webinar.topic,
      host: webinar.host,
      start_at: webinar.startAt,
      status: webinar.status ?? 'draft',
      registrant_count: webinar.registrantCount ?? 0,
      watch_url: webinar.watchUrl ?? null,
      description: webinar.description ?? null,
      metadata: JSON.stringify(webinar.metadata ?? {})
    };

    const [id] = await this.table(connection).insert(payload);
    return this.findById(id, connection);
  }

  static async update(id, updates = {}, connection = db) {
    const payload = { updated_at: connection.fn.now() };

    if (updates.topic !== undefined) payload.topic = updates.topic;
    if (updates.host !== undefined) payload.host = updates.host;
    if (updates.startAt !== undefined) payload.start_at = updates.startAt;
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.registrantCount !== undefined) payload.registrant_count = updates.registrantCount;
    if (updates.watchUrl !== undefined) payload.watch_url = updates.watchUrl;
    if (updates.description !== undefined) payload.description = updates.description;
    if (updates.metadata !== undefined) payload.metadata = JSON.stringify(updates.metadata ?? {});

    await this.table(connection).where({ id }).update(payload);
    return this.findById(id, connection);
  }

  static async delete(id, connection = db) {
    await this.table(connection).where({ id }).del();
  }
}
