import knex from 'knex';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  TABLES as SECURITY_TABLES,
  applySecurityDomainSchema,
  rollbackSecurityDomainSchema
} from '../src/database/domains/security.js';

function createTestDb() {
  return knex({
    client: 'sqlite3',
    connection: { filename: ':memory:' },
    useNullAsDefault: true
  });
}

describe('applySecurityDomainSchema', () => {
  let db;

  beforeEach(async () => {
    db = createTestDb();
    await db.raw('PRAGMA foreign_keys = ON');
  });

  afterEach(async () => {
    if (db) {
      await db.destroy();
    }
  });

  it('creates tables that enforce uniqueness and foreign keys', async () => {
    await applySecurityDomainSchema(db);

    for (const tableName of Object.values(SECURITY_TABLES)) {
      expect(await db.schema.hasTable(tableName)).toBe(true);
    }

    const riskColumns = await db(SECURITY_TABLES.RISK_REGISTER).columnInfo();
    expect(riskColumns).toHaveProperty('risk_uuid');
    expect(riskColumns).toHaveProperty('mitigation_plan');

    const [riskId] = await db(SECURITY_TABLES.RISK_REGISTER).insert({
      risk_uuid: 'risk-001',
      title: 'Failover gap',
      description: 'Primary database does not have automated failover.'
    });

    await db(SECURITY_TABLES.RISK_REVIEWS).insert({
      review_uuid: 'review-001',
      risk_id: riskId,
      reviewer_name: 'Alex',
      reviewer_email: 'alex@example.com'
    });

    await expect(
      db(SECURITY_TABLES.RISK_REGISTER).insert({
        risk_uuid: 'risk-001',
        title: 'Duplicate',
        description: 'Should be rejected.'
      })
    ).rejects.toThrow();

    const reviews = await db(SECURITY_TABLES.RISK_REVIEWS);
    expect(reviews).toHaveLength(1);
  });

  it('rolls back all tables in reverse order', async () => {
    await applySecurityDomainSchema(db);
    await rollbackSecurityDomainSchema(db);

    for (const tableName of Object.values(SECURITY_TABLES)) {
      expect(await db.schema.hasTable(tableName)).toBe(false);
    }
  });
});
