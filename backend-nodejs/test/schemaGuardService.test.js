import { beforeEach, describe, expect, it, vi } from 'vitest';

const fsMock = vi.hoisted(() => {
  return {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    mkdir: vi.fn()
  };
});

vi.mock('fs/promises', () => ({
  default: fsMock,
  ...fsMock
}));

import path from 'path';

import {
  normalizeColumnRow,
  normalizeIndexRow,
  diffSchemas,
  summariseDiffs,
  validateBaselineStructure,
  loadBaseline,
  writeBaseline
} from '../src/services/schemaGuardService.js';

describe('schemaGuardService helpers', () => {
  beforeEach(() => {
    fsMock.readFile.mockReset();
    fsMock.writeFile.mockReset();
    fsMock.mkdir.mockReset();
  });

  it('normalises column rows from information schema', () => {
    const row = {
      COLUMN_NAME: 'id',
      ORDINAL_POSITION: '1',
      DATA_TYPE: 'bigint',
      COLUMN_TYPE: 'bigint(20)',
      IS_NULLABLE: 'NO',
      COLUMN_DEFAULT: null,
      CHARACTER_SET_NAME: null,
      COLLATION_NAME: null,
      NUMERIC_PRECISION: '20',
      NUMERIC_SCALE: null,
      EXTRA: 'auto_increment'
    };

    expect(normalizeColumnRow(row)).toEqual({
      name: 'id',
      ordinalPosition: 1,
      dataType: 'bigint',
      columnType: 'bigint(20)',
      isNullable: false,
      columnDefault: null,
      characterSet: null,
      collation: null,
      numericPrecision: 20,
      numericScale: null,
      extra: 'auto_increment'
    });
  });

  it('normalises index rows with metadata', () => {
    const row = {
      INDEX_NAME: 'PRIMARY',
      COLUMN_NAME: 'id',
      SEQ_IN_INDEX: '1',
      NON_UNIQUE: 0,
      INDEX_TYPE: 'BTREE'
    };

    expect(normalizeIndexRow(row)).toEqual({
      name: 'PRIMARY',
      columns: 'id',
      seqInIndex: 1,
      unique: true,
      type: 'BTREE',
      isPrimary: true
    });
  });

  it('diffs schemas and reports missing and mismatched resources', () => {
    const baseline = {
      tables: {
        learners: {
          columns: {
            id: { dataType: 'int', columnType: 'int', isNullable: false },
            email: { dataType: 'varchar', columnType: 'varchar(255)', isNullable: false }
          },
          indexes: [{ name: 'PRIMARY', columns: ['id'], unique: true, type: 'BTREE', isPrimary: true }]
        }
      }
    };

    const actual = {
      tables: {
        learners: {
          columns: {
            id: { dataType: 'int', columnType: 'int', isNullable: false },
            email: { dataType: 'varchar', columnType: 'varchar(128)', isNullable: true },
            nickname: { dataType: 'varchar', columnType: 'varchar(64)', isNullable: true }
          },
          indexes: [{ name: 'PRIMARY', columns: ['id'], unique: true, type: 'HASH', isPrimary: true }]
        },
        orphan: {
          columns: {}
        }
      }
    };

    const differences = diffSchemas(baseline, actual);

    expect(differences).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ level: 'column', type: 'mismatch', column: 'email', key: 'columnType' }),
        expect.objectContaining({ level: 'column', type: 'unexpected', column: 'nickname' }),
        expect.objectContaining({ level: 'index', type: 'mismatch', index: 'PRIMARY' })
      ])
    );
    expect(differences.some((diff) => diff.table === 'orphan' && diff.type === 'unexpected')).toBe(true);
  });

  it('summarises differences into a human readable string', () => {
    const summary = summariseDiffs([
      { level: 'table', table: 'payments', message: 'missing' },
      { level: 'column', table: 'learners', column: 'email', message: 'type mismatch' }
    ]);

    expect(summary).toContain('TABLE: payments');
    expect(summary).toContain('COLUMN: learners.email');
  });

  it('validates baseline structures and rejects malformed payloads', () => {
    expect(() => validateBaselineStructure({ database: 'db', tables: { users: {} } })).not.toThrow();
    expect(() => validateBaselineStructure({})).toThrow(/database/);
    expect(() => validateBaselineStructure({ database: 'db', tables: [] })).toThrow(/tables/);
  });

  it('loads baselines from disk with validation', async () => {
    const baseline = { database: 'db', tables: { users: { columns: {} } } };
    fsMock.readFile.mockResolvedValue(JSON.stringify(baseline));

    const loaded = await loadBaseline('./baseline.json');
    expect(fsMock.readFile).toHaveBeenCalledWith(path.resolve('./baseline.json'), 'utf8');
    expect(loaded).toEqual({ database: 'db', tables: { users: { columns: {} } } });
  });

  it('throws descriptive errors for missing or invalid baseline files', async () => {
    fsMock.readFile.mockRejectedValueOnce(Object.assign(new Error('missing'), { code: 'ENOENT' }));

    await expect(loadBaseline('./missing.json')).rejects.toThrow(/not found/);

    fsMock.readFile.mockResolvedValueOnce('not-json');
    await expect(loadBaseline('./broken.json')).rejects.toThrow(/not valid JSON/);
  });

  it('writes validated baselines to disk', async () => {
    const schema = { database: 'db', tables: { users: { columns: {} } } };

    await writeBaseline('./baseline.json', schema);

    expect(fsMock.mkdir).toHaveBeenCalledWith(path.resolve('.'), { recursive: true });
    expect(fsMock.writeFile).toHaveBeenCalledWith(
      path.resolve('./baseline.json'),
      expect.stringContaining('"database": "db"')
    );
  });
});
