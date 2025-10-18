import db from '../config/database.js';
import DomainEventDispatchModel from './DomainEventDispatchModel.js';

function normaliseDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseJson(value) {
  if (!value) {
    return {};
  }

  if (typeof value === 'object') {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch (_error) {
    return {};
  }
}

function mapRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    eventType: row.event_type,
    payload: parseJson(row.payload),
    performedBy: row.performed_by ?? null,
    createdAt: normaliseDate(row.created_at)
  };
}

function resolveConnectionAndOptions(connectionOrOptions, maybeOptions) {
  let connection = db;
  let options = maybeOptions ?? {};

  if (
    connectionOrOptions &&
    (typeof connectionOrOptions === 'function' || typeof connectionOrOptions?.raw === 'function')
  ) {
    connection = connectionOrOptions;
    options = maybeOptions ?? {};
  } else if (connectionOrOptions && typeof connectionOrOptions === 'object') {
    options = connectionOrOptions;
  }

  return { connection, options };
}

export default class DomainEventModel {
  static table(connection = db) {
    return connection('domain_events');
  }

  static async record(event, connectionOrOptions = db, maybeOptions = {}) {
    if (!event?.entityType || !event?.entityId || !event?.eventType) {
      throw new Error('DomainEventModel.record requires entityType, entityId, and eventType');
    }

    const { connection, options } = resolveConnectionAndOptions(connectionOrOptions, maybeOptions);

    const payload = {
      entity_type: String(event.entityType),
      entity_id: String(event.entityId),
      event_type: String(event.eventType),
      payload: event.payload ? JSON.stringify(event.payload) : null,
      performed_by: event.performedBy ?? null
    };

    const [id] = await this.table(connection).insert(payload);
    const row = await this.table(connection).where({ id }).first();
    const mapped = mapRow(row);

    if (options.enqueueDispatch !== false) {
      await DomainEventDispatchModel.enqueue(
        mapped,
        {
          priority: options.priority,
          availableAt: options.availableAt,
          metadata: options.dispatchMetadata,
          status: options.dispatchStatus
        },
        connection
      );
    }

    return mapped;
  }

  static async findById(id, connection = db) {
    if (!id) {
      return null;
    }

    const row = await this.table(connection).where({ id }).first();
    return mapRow(row);
  }

  static mapRow = mapRow;
}
