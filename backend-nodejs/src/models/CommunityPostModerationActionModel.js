import db from '../config/database.js';

const ACTION_COLUMNS = {
  id: 'id',
  caseId: 'case_id',
  actorId: 'actor_id',
  action: 'action',
  notes: 'notes',
  metadata: 'metadata',
  createdAt: 'created_at'
};

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

function selectBase(connection = db) {
  return connection('community_post_moderation_actions').select({ ...ACTION_COLUMNS });
}

function serialiseMetadata(metadata) {
  if (metadata === undefined || metadata === null) {
    return JSON.stringify({});
  }
  if (typeof metadata === 'string') {
    return metadata;
  }
  return JSON.stringify(metadata);
}

export default class CommunityPostModerationActionModel {
  static async record(action, connection = db) {
    const payload = {
      case_id: action.caseId,
      actor_id: action.actorId ?? null,
      action: action.action,
      notes: action.notes ?? null,
      metadata: serialiseMetadata(action.metadata ?? {})
    };

    const [id] = await connection('community_post_moderation_actions').insert(payload);
    return this.findById(id, connection);
  }

  static async findById(id, connection = db) {
    const row = await selectBase(connection).where({ id }).first();
    return mapRow(row);
  }

  static async listForCase(caseId, connection = db) {
    const rows = await selectBase(connection).where({ case_id: caseId }).orderBy('created_at', 'asc');
    return rows.map((row) => mapRow(row));
  }

  static async updateMetadata(actionId, metadata, connection = db) {
    await connection('community_post_moderation_actions')
      .where({ id: actionId })
      .update({ metadata: serialiseMetadata(metadata ?? {}) });
    return this.findById(actionId, connection);
  }

  static async markUndone(actionId, info = {}, connection = db) {
    const current = await this.findById(actionId, connection);
    if (!current) {
      return null;
    }

    const nextMetadata = {
      ...current.metadata,
      undo: {
        ...(current.metadata?.undo ?? {}),
        undoneAt: info.undoneAt ?? new Date().toISOString(),
        undoneBy: info.undoneBy ?? null,
        reason: info.reason ?? 'reverted'
      }
    };

    return this.updateMetadata(actionId, nextMetadata, connection);
  }
}
