import knex from 'knex';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  TABLES as COMPLIANCE_TABLES,
  applyComplianceDomainSchema,
  rollbackComplianceDomainSchema
} from '../src/database/domains/compliance.js';

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

async function listIndexes(connection, tableName) {
  const result = await connection.raw(`PRAGMA index_list('${tableName}')`);
  const rows = Array.isArray(result)
    ? result
    : Array.isArray(result?.[0])
      ? result[0]
      : Array.isArray(result?.rows)
        ? result.rows
        : [];
  return rows.map((row) => row.name);
}

describe('applyComplianceDomainSchema', () => {
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

  it('creates the compliance governance tables with indexes and seed data', async () => {
    await applyComplianceDomainSchema(db);

    for (const tableName of Object.values(COMPLIANCE_TABLES)) {
      expect(await db.schema.hasTable(tableName)).toBe(true);
    }

    expect(await db.schema.hasTable('data_partition_policies')).toBe(true);

    const auditColumns = await db(COMPLIANCE_TABLES.AUDIT_EVENTS).columnInfo();
    expect(auditColumns).toHaveProperty('event_uuid');
    expect(auditColumns).toHaveProperty('metadata');

    const consentColumns = await db(COMPLIANCE_TABLES.CONSENT_RECORDS).columnInfo();
    expect(consentColumns).toHaveProperty('consent_uuid');
    expect(consentColumns).toHaveProperty('channel');

    const incidentIndexes = await listIndexes(db, COMPLIANCE_TABLES.SECURITY_INCIDENTS);
    expect(incidentIndexes).toContain('security_incidents_status_idx');

    const policies = await db('data_partition_policies');
    expect(policies.length).toBeGreaterThan(0);
  });

  it('is idempotent and rolls back cleanly', async () => {
    await applyComplianceDomainSchema(db);
    await applyComplianceDomainSchema(db);

    await rollbackComplianceDomainSchema(db);

    for (const tableName of Object.values(COMPLIANCE_TABLES)) {
      expect(await db.schema.hasTable(tableName)).toBe(false);
    }
    expect(await db.schema.hasTable('data_partition_policies')).toBe(false);
  });
});
