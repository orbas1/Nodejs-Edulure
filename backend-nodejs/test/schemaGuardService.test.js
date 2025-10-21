import { describe, expect, it } from 'vitest';

import { diffSchemas, summariseDiffs } from '../src/services/schemaGuardService.js';

describe('schemaGuardService', () => {
  const baseline = {
    database: 'app',
    tables: {
      users: {
        columns: {
          id: { dataType: 'int', isNullable: false, columnDefault: null, columnType: 'int(11)', extra: 'auto_increment' },
          email: { dataType: 'varchar', isNullable: false, columnDefault: null, columnType: 'varchar(255)', collation: 'utf8mb4_unicode_ci' }
        },
        indexes: [
          { name: 'PRIMARY', columns: ['id'], unique: true, type: 'BTREE', isPrimary: true },
          { name: 'users_email_unique', columns: ['email'], unique: true, type: 'BTREE', isPrimary: false }
        ]
      }
    }
  };

  it('detects missing tables and column mismatches', () => {
    const actual = {
      database: 'app',
      tables: {
        users: {
          columns: {
            id: { dataType: 'int', isNullable: false, columnDefault: null, columnType: 'int(11)', extra: 'auto_increment' },
            email: { dataType: 'varchar', isNullable: true, columnDefault: null, columnType: 'varchar(255)', collation: 'utf8mb4_unicode_ci' },
            created_at: { dataType: 'timestamp', isNullable: false, columnDefault: 'CURRENT_TIMESTAMP', columnType: 'timestamp', extra: null }
          },
          indexes: [
            { name: 'PRIMARY', columns: ['id'], unique: true, type: 'BTREE', isPrimary: true }
          ]
        },
        audit_logs: {
          columns: { id: { dataType: 'int', isNullable: false, columnType: 'int(11)', columnDefault: null } },
          indexes: []
        }
      }
    };

    const diffs = diffSchemas(baseline, actual);
    expect(diffs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ level: 'column', type: 'mismatch', column: 'email' }),
        expect.objectContaining({ level: 'column', type: 'unexpected', column: 'created_at' }),
        expect.objectContaining({ level: 'index', type: 'missing', index: 'users_email_unique' }),
        expect.objectContaining({ level: 'table', type: 'unexpected', table: 'audit_logs' })
      ])
    );

    const summary = summariseDiffs(diffs);
    expect(summary).toMatch(/TABLE: audit_logs – Table "audit_logs" not defined in baseline./);
  });

  it('returns success summary when there are no differences', () => {
    const diffs = diffSchemas(baseline, baseline);
    expect(diffs).toHaveLength(0);
    expect(summariseDiffs(diffs)).toBe('Schema matches baseline definition.');
  });
});
