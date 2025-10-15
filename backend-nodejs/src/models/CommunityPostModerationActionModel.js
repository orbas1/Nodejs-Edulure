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

function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    caseId: row.caseId,
    actorId: row.actorId ?? undefined,
    action: row.action,
    notes: row.notes ?? undefined,
    metadata: parseJson(row.metadata, {}),
    createdAt: row.createdAt
  };
}

export default class CommunityPostModerationActionModel {
  static async record(action, connection = db) {
    const payload = {
      case_id: action.caseId,
      actor_id: action.actorId ?? null,
      action: action.action,
      notes: action.notes ?? null,
      metadata: JSON.stringify(action.metadata ?? {})
    };

    const [id] = await connection('community_post_moderation_actions').insert(payload);
    const row = await connection('community_post_moderation_actions')
      .select({
        id: 'id',
        caseId: 'case_id',
        actorId: 'actor_id',
        action: 'action',
        notes: 'notes',
        metadata: 'metadata',
        createdAt: 'created_at'
      })
      .where({ id })
      .first();
    return mapRow(row);
  }

  static async listForCase(caseId, connection = db) {
    const rows = await connection('community_post_moderation_actions')
      .select({
        id: 'id',
        caseId: 'case_id',
        actorId: 'actor_id',
        action: 'action',
        notes: 'notes',
        metadata: 'metadata',
        createdAt: 'created_at'
      })
      .where({ case_id: caseId })
      .orderBy('created_at', 'asc');
    return rows.map((row) => mapRow(row));
  }
}
