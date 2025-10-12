import db from '../config/database.js';

function parseJson(value, fallback = {}) {
  if (value === null || value === undefined) {
    return fallback;
  }
  if (typeof value === 'object') {
    return value;
  }
  try {
    return JSON.parse(value);
  } catch (_error) {
    return fallback;
  }
}

function toDomain(row) {
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    eventId: row.event_id,
    entityType: row.entity_type,
    resultId: row.result_id,
    interactionType: row.interaction_type,
    position: row.position ?? null,
    metadata: parseJson(row.metadata, {}),
    createdAt: row.created_at
  };
}

export default class ExplorerSearchInteractionModel {
  static async recordInteraction(payload, connection = db) {
    const insertPayload = {
      event_id: payload.eventId,
      entity_type: payload.entityType,
      result_id: payload.resultId,
      interaction_type: payload.interactionType,
      position: payload.position ?? null,
      metadata: JSON.stringify(payload.metadata ?? {})
    };
    const [id] = await connection('explorer_search_event_interactions').insert(insertPayload);
    return this.findById(id, connection);
  }

  static async findById(id, connection = db) {
    const row = await connection('explorer_search_event_interactions').where({ id }).first();
    return toDomain(row);
  }

  static async countByEvent(eventId, connection = db) {
    const rows = await connection('explorer_search_event_interactions')
      .select({
        entityType: 'entity_type',
        interactionType: 'interaction_type',
        count: connection.raw('COUNT(*)::bigint')
      })
      .where({ event_id: eventId })
      .groupBy('entity_type', 'interaction_type');

    return rows.map((row) => ({
      entityType: row.entityType,
      interactionType: row.interactionType,
      count: Number(row.count ?? 0)
    }));
  }
}
