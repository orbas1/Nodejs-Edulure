import { describe, it, expect, vi } from 'vitest';

vi.mock('knex', () => ({
  default: () => ({
    client: { config: { client: 'mysql2' } }
  })
}));

vi.mock('../src/config/env.js', () => ({
  env: { monetization: { reconciliation: {} }, database: {} }
}));

vi.mock('../src/config/logger.js', () => ({
  default: { child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }) }
}));

import { applyTenantMetadataScope, tenantExpressionsForClient } from '../src/database/utils/tenantMetadataScope.js';

describe('tenant metadata scope utilities', () => {
  it('builds mysql-compatible expressions with fallback paths', () => {
    const expressions = tenantExpressionsForClient('mysql2');

    expect(expressions.equalsClause).toContain("JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.tenantId'))");
    expect(expressions.equalsClause).toContain('LOWER(');
    expect(expressions.defaultTenantClause).toContain('COALESCE(');
    expect(expressions.defaultTenantClause).toContain("JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.tenant'))");
  });

  it('appends default tenant clause when normalized tenant is global', () => {
    const whereRaw = vi.fn().mockReturnThis();
    const orWhereRaw = vi.fn().mockReturnThis();
    const queryBuilder = {
      andWhere: vi.fn().mockImplementation((callback) => {
        callback({ whereRaw, orWhereRaw });
        return queryBuilder;
      })
    };

    const connection = { client: { config: { client: 'pg' } } };

    applyTenantMetadataScope(queryBuilder, 'GLOBAL', connection);

    expect(queryBuilder.andWhere).toHaveBeenCalledTimes(1);
    expect(whereRaw).toHaveBeenCalledWith(expect.stringContaining("metadata->>'tenantId'"), ['global']);
    expect(orWhereRaw).toHaveBeenCalledWith(expect.stringContaining('COALESCE'));
  });

  it('scopes non-global tenants without default clause', () => {
    const whereRaw = vi.fn().mockReturnThis();
    const orWhereRaw = vi.fn().mockReturnThis();
    const queryBuilder = {
      andWhere: vi.fn().mockImplementation((callback) => {
        callback({ whereRaw, orWhereRaw });
        return queryBuilder;
      })
    };

    const connection = { client: { config: { client: 'sqlite3' } } };

    applyTenantMetadataScope(queryBuilder, 'Tenant-A', connection);

    expect(whereRaw).toHaveBeenCalledWith(expect.stringContaining("json_extract(metadata, '$.tenantId')"), ['tenant-a']);
    expect(orWhereRaw).not.toHaveBeenCalled();
  });
});

