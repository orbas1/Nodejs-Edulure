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
    totalHits: Number(row.total_hits ?? 0),
    displayedHits: Number(row.displayed_hits ?? 0),
    processingTimeMs: Number(row.processing_time_ms ?? 0),
    isZeroResult: Boolean(row.is_zero_result),
    clickCount: Number(row.click_count ?? 0),
    conversionCount: Number(row.conversion_count ?? 0),
    metadata: parseJson(row.metadata, {}),
    createdAt: row.created_at
  };
}

export default class ExplorerSearchEventEntityModel {
  static async createMany(eventId, entities, connection = db) {
    if (!entities?.length) {
      return [];
    }
    const payloads = entities.map((entity) => ({
      event_id: eventId,
      entity_type: entity.entityType,
      total_hits: Number(entity.totalHits ?? 0),
      displayed_hits: Number(entity.displayedHits ?? 0),
      processing_time_ms: Number(entity.processingTimeMs ?? 0),
      is_zero_result: Boolean(entity.isZeroResult),
      click_count: Number(entity.clickCount ?? 0),
      conversion_count: Number(entity.conversionCount ?? 0),
      metadata: JSON.stringify(entity.metadata ?? {})
    }));
    await connection('explorer_search_event_entities').insert(payloads);
    return this.listByEventId(eventId, connection);
  }

  static async listByEventId(eventId, connection = db) {
    const rows = await connection('explorer_search_event_entities').where({ event_id: eventId });
    return rows.map(toDomain);
  }

  static async incrementClicks(eventId, entityType, amount = 1, connection = db) {
    await connection('explorer_search_event_entities')
      .where({ event_id: eventId, entity_type: entityType })
      .increment('click_count', amount);
  }

  static async incrementConversions(eventId, entityType, amount = 1, connection = db) {
    await connection('explorer_search_event_entities')
      .where({ event_id: eventId, entity_type: entityType })
      .increment('conversion_count', amount);
  }

  static async findByEventAndEntity(eventId, entityType, connection = db) {
    const row = await connection('explorer_search_event_entities')
      .where({ event_id: eventId, entity_type: entityType })
      .first();
    return toDomain(row);
  }
}
