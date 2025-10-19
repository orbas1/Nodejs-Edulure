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

  static async countRecentByCommunity(communityIds, { since } = {}, connection = db) {
    if (!communityIds?.length) {
      return new Map();
    }

    const query = connection('community_message_moderation_actions as action')
      .innerJoin('community_messages as message', 'action.message_id', 'message.id')
      .whereIn('message.community_id', communityIds)
      .groupBy('message.community_id')
      .select('message.community_id as communityId')
      .count({ total: '*' });

    if (since) {
      const boundary = since instanceof Date ? since.toISOString() : since;
      query.andWhere('action.created_at', '>=', boundary);
    }

    const rows = await query;
    const counts = new Map();
    rows.forEach((row) => {
      counts.set(Number(row.communityId), Number(row.total ?? row.count ?? 0));
    });
    return counts;
  }
}
