import db from '../../config/database.js';

function resolveClient(connection) {
  const source = connection ?? db;
  const client = source?.client;
  if (!client) {
    return '';
  }
  const name = client.config?.client ?? client.driverName ?? '';
  return String(name).toLowerCase();
}

function normalisePayload(value) {
  if (!value || (typeof value === 'object' && Object.keys(value).length === 0 && !Array.isArray(value))) {
    return null;
  }
  return JSON.stringify(value);
}

export function jsonMergePatch(connection, column, value) {
  const payload = normalisePayload(value);
  if (payload === null) {
    return null;
  }

  const client = resolveClient(connection);
  if (client.includes('pg')) {
    return connection.raw(`COALESCE(${column}::jsonb, '{}'::jsonb) || ?::jsonb`, [payload]);
  }

  if (client.includes('mysql') || client.includes('mariadb')) {
    return connection.raw(`JSON_MERGE_PATCH(IFNULL(${column}, JSON_OBJECT()), CAST(? AS JSON))`, [payload]);
  }

  if (typeof connection.raw === 'function') {
    return connection.raw('?', [payload]);
  }

  return payload;
}

export default jsonMergePatch;
