import knex from 'knex';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  TABLES as TELEMETRY_TABLES,
  applyTelemetryDomainSchema,
  generateTelemetryDedupeHash,
  rollbackTelemetryDomainSchema
} from '../src/database/domains/telemetry.js';

function createTestDb() {
  return knex({
    client: 'sqlite3',
    connection: { filename: ':memory:' },
    useNullAsDefault: true
  });
}

async function ensureUsersTable(connection) {
  const exists = await connection.schema.hasTable('users');
  if (!exists) {
    await connection.schema.createTable('users', (table) => {
      table.increments('id').primary();
      table.string('email');
    });
  }
}

describe('telemetry domain schema', () => {
  let db;

  beforeEach(async () => {
    db = createTestDb();
    await db.raw('PRAGMA foreign_keys = ON');
    await ensureUsersTable(db);
  });

  afterEach(async () => {
    if (db) {
      await db.destroy();
    }
  });

  it('creates consent, event, batch, freshness, and lineage tables', async () => {
    await applyTelemetryDomainSchema(db);

    for (const tableName of Object.values(TELEMETRY_TABLES)) {
      expect(await db.schema.hasTable(tableName)).toBe(true);
    }

    const eventColumns = await db(TELEMETRY_TABLES.EVENTS).columnInfo();
    expect(eventColumns).toHaveProperty('event_uuid');
    expect(eventColumns).toHaveProperty('dedupe_hash');
    expect(eventColumns).toHaveProperty('ingestion_status');

    const occurredAt = new Date().toISOString();
    const dedupeHash = generateTelemetryDedupeHash({
      eventName: 'course.viewed',
      eventVersion: 'v1',
      occurredAt,
      userId: null,
      sessionId: null,
      correlationId: null,
      payload: {}
    });

    const [eventId] = await db(TELEMETRY_TABLES.EVENTS).insert({
      event_uuid: 'evt-001',
      event_name: 'course.viewed',
      event_version: 'v1',
      event_source: 'web',
      consent_scope: 'analytics',
      occurred_at: occurredAt,
      dedupe_hash: dedupeHash
    });

    await db(TELEMETRY_TABLES.EVENT_BATCHES).insert({
      batch_uuid: 'batch-001',
      status: 'exported'
    });

    expect(eventId).toBeGreaterThan(0);
  });

  it('generates stable dedupe hashes and supports rollback', async () => {
    const left = generateTelemetryDedupeHash({
      eventName: 'course.viewed',
      eventVersion: 'v1',
      occurredAt: '2024-01-01T00:00:00Z',
      userId: 42,
      sessionId: 'abc',
      correlationId: 'xyz',
      payload: { ref: 'foo' }
    });
    const right = generateTelemetryDedupeHash({
      eventName: 'course.viewed',
      eventVersion: 'v1',
      occurredAt: '2024-01-01T00:00:00Z',
      userId: 42,
      sessionId: 'abc',
      correlationId: 'xyz',
      payload: { ref: 'foo' }
    });

    expect(left).toEqual(right);

    const different = generateTelemetryDedupeHash({
      eventName: 'course.completed',
      eventVersion: 'v1',
      occurredAt: '2024-01-01T00:00:00Z',
      userId: 42,
      sessionId: 'abc',
      correlationId: 'xyz',
      payload: { ref: 'foo' }
    });
    expect(different).not.toEqual(left);

    const dbInstance = createTestDb();
    await applyTelemetryDomainSchema(dbInstance);
    await rollbackTelemetryDomainSchema(dbInstance);

    for (const tableName of Object.values(TELEMETRY_TABLES)) {
      expect(await dbInstance.schema.hasTable(tableName)).toBe(false);
    }

    await dbInstance.destroy();
  });
});
