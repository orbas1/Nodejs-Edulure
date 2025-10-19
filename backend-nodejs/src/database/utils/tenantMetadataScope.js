import db from '../../config/database.js';

function resolveDbClientName(connection = db) {
  const client = connection?.client?.config?.client ?? connection?.client?.driverName ?? '';
  return String(client).toLowerCase();
}

function jsonAccessorForClient(clientName, path) {
  if (clientName.includes('pg')) {
    return `(metadata->>'${path}')`;
  }

  if (clientName.includes('sqlite')) {
    return `json_extract(metadata, '$.${path}')`;
  }

  return `JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.${path}'))`;
}

export function tenantExpressionsForClient(clientName) {
  const normalizedClient = String(clientName || '').toLowerCase();
  const accessors = ['tenantId', 'tenant', 'tenant_id'].map((path) => jsonAccessorForClient(normalizedClient, path));

  const sanitized = accessors.map((expression) => `NULLIF(${expression}, '')`);
  const coalesced = `COALESCE(${sanitized.join(', ')})`;
  const lowered = `LOWER(${coalesced})`;

  return {
    equalsClause: `${lowered} = ?`,
    defaultTenantClause: `${coalesced} IS NULL`
  };
}

export function applyTenantMetadataScope(queryBuilder, tenantId, connection = db) {
  const normalizedTenant = String(tenantId || 'global').trim().toLowerCase() || 'global';
  const clientName = resolveDbClientName(connection);
  const expressions = tenantExpressionsForClient(clientName);

  queryBuilder.andWhere(function scope(scopeBuilder) {
    scopeBuilder.whereRaw(expressions.equalsClause, [normalizedTenant]);

    if (normalizedTenant === 'global') {
      scopeBuilder.orWhereRaw(expressions.defaultTenantClause);
    }
  });
}

export { resolveDbClientName, jsonAccessorForClient };

