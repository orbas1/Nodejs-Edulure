import db from '../config/database.js';

function parseJson(value, fallback) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (_error) {
    return fallback;
  }
}

function mapRecord(record) {
  if (!record) return null;
  return {
    id: record.id,
    threadId: record.thread_id,
    userId: record.user_id,
    role: record.role,
    notificationsEnabled: Boolean(record.notifications_enabled),
    isMuted: Boolean(record.is_muted),
    muteUntil: record.mute_until,
    lastReadAt: record.last_read_at,
    lastReadMessageId: record.last_read_message_id ?? null,
    metadata: parseJson(record.metadata, {}),
    createdAt: record.created_at,
    updatedAt: record.updated_at
  };
}

export default class DirectMessageParticipantModel {
  static async create(participant, connection = db) {
    const payload = {
      thread_id: participant.threadId,
      user_id: participant.userId,
      role: participant.role ?? 'member',
      notifications_enabled: participant.notificationsEnabled ?? true,
      is_muted: participant.isMuted ?? false,
      mute_until: participant.muteUntil ?? null,
      metadata: JSON.stringify(participant.metadata ?? {})
    };
    const [id] = await connection('direct_message_participants').insert(payload);
    const row = await connection('direct_message_participants').where({ id }).first();
    return mapRecord(row);
  }

  static async listForThread(threadId, connection = db) {
    const rows = await connection('direct_message_participants')
      .where({ thread_id: threadId })
      .orderBy('created_at', 'asc');
    return rows.map((row) => mapRecord(row));
  }

  static async findParticipant(threadId, userId, connection = db) {
    const row = await connection('direct_message_participants')
      .where({ thread_id: threadId, user_id: userId })
      .first();
    return mapRecord(row);
  }

  static async updateLastRead(threadId, userId, { timestamp, messageId }, connection = db) {
    await connection('direct_message_participants')
      .where({ thread_id: threadId, user_id: userId })
      .update({
        last_read_at: timestamp ?? connection.fn.now(),
        last_read_message_id: messageId ?? null,
        updated_at: connection.fn.now()
      });
    return this.findParticipant(threadId, userId, connection);
  }
}
