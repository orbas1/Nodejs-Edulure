import { describe, it, expect } from 'vitest';

import SchemaDiffService from '../src/services/schema/SchemaDiffService.js';

describe('SchemaDiffService', () => {
  it('detects missing tables and column drift', () => {
    const snapshot = {
      tables: {
        alpha: {
          columns: {
            id: { type: 'int', nullable: false },
            name: { type: 'varchar(64)', nullable: false, defaultValue: null }
          },
          indexes: {
            PRIMARY: { columns: ['id'], unique: true },
            alpha_name_index: { columns: ['name'], unique: false }
          }
        }
      },
      enums: {
        'alpha.status': ['active', 'archived']
      },
      views: {
        vw_alpha: { definition: 'select * from alpha' }
      }
    };

    const actual = {
      tables: {
        beta: {
          columns: {
            id: { type: 'int', nullable: false }
          },
          indexes: {
            PRIMARY: { columns: ['id'], unique: true }
          }
        },
        alpha: {
          columns: {
            id: { type: 'int', nullable: false },
            name: { type: 'varchar(128)', nullable: true }
          },
          indexes: {
            PRIMARY: { columns: ['id'], unique: true }
          }
        }
      },
      enums: {
        'alpha.status': ['active', 'disabled', 'archived']
      },
      views: {
        vw_alpha: { definition: 'SELECT * FROM alpha WHERE deleted_at IS NULL' }
      }
    };

    const diff = new SchemaDiffService({ snapshot, actual }).diff();

    expect(diff.missingTables).toEqual([]);
    expect(diff.extraTables).toContain('beta');
    expect(diff.columnDrift).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ table: 'alpha', column: 'name', issue: 'type-mismatch' }),
        expect.objectContaining({ table: 'alpha', column: 'name', issue: 'nullability-mismatch' })
      ])
    );
    expect(diff.indexDrift).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ table: 'alpha', index: 'alpha_name_index', issue: 'missing-index' })
      ])
    );
    expect(diff.enumDrift).toEqual([
      expect.objectContaining({ enum: 'alpha.status' })
    ]);
    expect(diff.viewDrift).toEqual([
      expect.objectContaining({ view: 'vw_alpha', issue: 'definition-mismatch' })
    ]);
  });
});
