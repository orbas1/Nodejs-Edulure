import db from '../config/database.js';

function parseJson(value, fallback) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
}

function mapRecord(record) {
  if (!record) return null;
  return {
    id: record.id,
    subject: record.subject ?? null,
    isGroup: Boolean(record.is_group),
    metadata: parseJson(record.metadata, {}),
    lastMessageAt: record.last_message_at,
    lastMessagePreview: record.last_message_preview ?? null,
    createdAt: record.created_at,
    updatedAt: record.updated_at
  };
}

export default class DirectMessageThreadModel {
  static async create(thread, connection = db) {
    const payload = {
      subject: thread.subject ?? null,
      is_group: Boolean(thread.isGroup),
      metadata: JSON.stringify(thread.metadata ?? {}),
      last_message_at: thread.lastMessageAt ?? null,
      last_message_preview: thread.lastMessagePreview ?? null
    };
    const [id] = await connection('direct_message_threads').insert(payload);
    const row = await connection('direct_message_threads').where({ id }).first();
    return mapRecord(row);
  }

  static async findById(id, connection = db) {
    const row = await connection('direct_message_threads').where({ id }).first();
    return mapRecord(row);
  }

  static async updateThreadMetadata(id, updates, connection = db) {
    const payload = { updated_at: connection.fn.now() };
    if (Object.prototype.hasOwnProperty.call(updates, 'subject')) {
      payload.subject = updates.subject;
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'metadata')) {
      payload.metadata = JSON.stringify(updates.metadata ?? {});
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'lastMessageAt')) {
      payload.last_message_at = updates.lastMessageAt;
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'lastMessagePreview')) {
      payload.last_message_preview = updates.lastMessagePreview;
    }

    await connection('direct_message_threads').where({ id }).update(payload);
    return this.findById(id, connection);
  }

  static async listForUser(userId, { limit = 20, offset = 0 } = {}, connection = db) {
    const rows = await connection('direct_message_threads as dmt')
      .leftJoin('direct_message_participants as dmp', 'dmt.id', 'dmp.thread_id')
      .where('dmp.user_id', userId)
      .orderBy('dmt.last_message_at', 'desc')
      .limit(limit)
      .offset(offset)
      .select([
        'dmt.id',
        'dmt.subject',
        'dmt.is_group',
        'dmt.metadata',
        'dmt.last_message_at',
        'dmt.last_message_preview',
        'dmt.created_at',
        'dmt.updated_at'
      ]);

    return rows.map((row) => mapRecord(row));
  }

  static async findThreadMatchingParticipants(participantIds, connection = db) {
    if (!participantIds?.length) return null;
    const uniqueIds = [...new Set(participantIds)].sort();

    const subquery = connection('direct_message_participants')
      .select('thread_id')
      .whereIn('user_id', uniqueIds)
      .groupBy('thread_id')
      .havingRaw('COUNT(*) = ?', [uniqueIds.length]);

    const candidate = await connection('direct_message_threads as dmt')
      .select('dmt.id')
      .whereIn('dmt.id', subquery)
      .andWhereNotExists(function () {
        this.select('*')
          .from('direct_message_participants as others')
          .whereRaw('others.thread_id = dmt.id')
          .andWhereNotIn('others.user_id', uniqueIds);
      })
      .first();

    if (!candidate) {
      return null;
    }

    return this.findById(candidate.id, connection);
  }
}
