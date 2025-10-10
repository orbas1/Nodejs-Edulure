import db from '../config/database.js';

export default class DomainEventModel {
  static async record(event, connection = db) {
    const payload = {
      entity_type: event.entityType,
      entity_id: String(event.entityId),
      event_type: event.eventType,
      payload: event.payload ? JSON.stringify(event.payload) : null,
      performed_by: event.performedBy ?? null
    };
    const [id] = await connection('domain_events').insert(payload);
    return connection('domain_events').where({ id }).first();
  }
}
