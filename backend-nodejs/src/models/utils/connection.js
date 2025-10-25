import db from '../../config/database.js';

function isQueryable(connection) {
  if (!connection) {
    return false;
  }

  if (typeof connection === 'function') {
    return true;
  }

  if (typeof connection === 'object') {
    return typeof connection.table === 'function' || typeof connection.from === 'function';
  }

  return false;
}

export function resolveConnection(connection) {
  if (isQueryable(connection)) {
    return connection;
  }

  return db;
}

export function getTable(connection, tableName) {
  const client = resolveConnection(connection);

  if (typeof client === 'function') {
    return client(tableName);
  }

  if (client && typeof client.table === 'function') {
    return client.table(tableName);
  }

  if (client && typeof client.from === 'function') {
    return client.from(tableName);
  }

  return db(tableName);
}

export function getNowValue(connection) {
  const client = resolveConnection(connection);

  if (client?.fn?.now) {
    return client.fn.now();
  }

  return db.fn.now();
}

export function isMissingTableError(error) {
  if (!error) {
    return false;
  }

  const message = typeof error.message === 'string' ? error.message.toLowerCase() : '';

  if (error.code === 'SQLITE_ERROR' && message.includes('no such table')) {
    return true;
  }

  if (error.code === 'ER_NO_SUCH_TABLE' || error.errno === 1146) {
    return true;
  }

  return message.includes("doesn't exist") || message.includes('does not exist');
}

export default resolveConnection;
