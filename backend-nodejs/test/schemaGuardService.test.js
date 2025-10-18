import { describe, it, expect } from 'vitest';

import { diffSchemas, summariseDiffs } from '../src/services/schemaGuardService.js';

const baselineSchema = {
  database: 'edulure',
  tables: {
    users: {
      columns: {
        id: { dataType: 'int', columnType: 'int unsigned', isNullable: false, extra: 'auto_increment' },
        email: { dataType: 'varchar', columnType: 'varchar(255)', isNullable: false, columnDefault: null }
      },
      indexes: [
        { name: 'PRIMARY', columns: ['id'], unique: true },
        { name: 'users_email_unique', columns: ['email'], unique: true }
      ]
    },
    feature_flags: {
      columns: {
        id: { dataType: 'int', columnType: 'int unsigned', isNullable: false, extra: 'auto_increment' },
        key: { dataType: 'varchar', columnType: 'varchar(128)', isNullable: false }
      },
      indexes: [
        { name: 'PRIMARY', columns: ['id'], unique: true },
        { name: 'feature_flags_key_unique', columns: ['key'], unique: true }
      ]
    }
  }
};

describe('schemaGuardService.diffSchemas', () => {
  it('returns an empty array when the schema matches the baseline', () => {
    const actual = JSON.parse(JSON.stringify(baselineSchema));
    expect(diffSchemas(baselineSchema, actual)).toEqual([]);
  });

  it('flags missing tables', () => {
    const actual = { database: 'edulure', tables: { users: baselineSchema.tables.users } };
    const differences = diffSchemas(baselineSchema, actual);
    expect(differences).toHaveLength(1);
    expect(differences[0]).toMatchObject({ level: 'table', type: 'missing', table: 'feature_flags' });
  });

  it('flags column mismatches when types change', () => {
    const actual = JSON.parse(JSON.stringify(baselineSchema));
    actual.tables.users.columns.email.columnType = 'varchar(191)';
    const differences = diffSchemas(baselineSchema, actual);
    expect(differences).toHaveLength(1);
    expect(differences[0]).toMatchObject({ level: 'column', type: 'mismatch', column: 'email', key: 'columnType' });
  });

  it('flags missing indexes', () => {
    const actual = JSON.parse(JSON.stringify(baselineSchema));
    actual.tables.users.indexes.pop();
    const differences = diffSchemas(baselineSchema, actual);
    expect(differences).toHaveLength(1);
    expect(differences[0]).toMatchObject({ level: 'index', type: 'missing', table: 'users' });
  });
});

describe('schemaGuardService.summariseDiffs', () => {
  it('summarises differences into human-readable text', () => {
    const summary = summariseDiffs([
      { level: 'table', table: 'payments', message: 'Table "payments" is missing from actual schema.' },
      { level: 'column', table: 'users', column: 'email', message: 'Column mismatch.' }
    ]);
    expect(summary).toContain('TABLE: payments');
    expect(summary).toContain('COLUMN: users.email');
  });
});
