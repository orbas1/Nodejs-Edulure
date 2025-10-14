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
    messageId: record.message_id,
    actorId: record.actor_id,
    actionType: record.action_type,
    reason: record.reason ?? null,
    metadata: parseJson(record.metadata, {}),
    createdAt: record.created_at
  };
}

export default class CommunityMessageModerationModel {
  static async record(action, connection = db) {
    const payload = {
      message_id: action.messageId,
      actor_id: action.actorId,
      action_type: action.actionType,
      reason: action.reason ?? null,
      metadata: JSON.stringify(action.metadata ?? {})
    };
    const [id] = await connection('community_message_moderation_actions').insert(payload);
    const row = await connection('community_message_moderation_actions').where({ id }).first();
    return mapRecord(row);
  }

  static async listForMessage(messageId, connection = db) {
    const rows = await connection('community_message_moderation_actions')
      .where({ message_id: messageId })
      .orderBy('created_at', 'desc');
    return rows.map((row) => mapRecord(row));
  }
}
