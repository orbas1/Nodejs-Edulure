const MYSQL_CLIENTS = new Set(['mysql', 'mysql2', 'mariadb']);
const POSTGRES_CLIENTS = new Set(['pg', 'postgres']);
const SQLITE_CLIENTS = new Set(['sqlite3']);

function resolveKnexInstance(knexOrBuilder) {
  if (!knexOrBuilder) {
    throw new Error('cast helpers require a knex instance or query builder');
  }

  if (typeof knexOrBuilder.client === 'object' && knexOrBuilder.client !== null) {
    return knexOrBuilder;
  }

  if (knexOrBuilder._context?.client) {
    return knexOrBuilder._context.client;
  }

  throw new Error('Unable to resolve knex client from provided instance');
}

function resolveClientName(knexOrBuilder) {
  const instance = resolveKnexInstance(knexOrBuilder);
  const { client } = instance;

  const clientName =
    client?.config?.client ?? client?.dialect ?? client?.driverName ?? client?.constructor?.name ?? '';

  if (!clientName) {
    throw new Error('Unable to determine SQL client for numeric casting');
  }

  return clientName.toLowerCase();
}

function wrapExpression(expression, cast) {
  if (!expression || typeof expression !== 'string') {
    throw new TypeError('Expression for numeric casting must be a non-empty string');
  }

  return `${cast.open}${expression}${cast.close}`;
}

export function castAsBigInt(knexOrBuilder, expression, bindings = []) {
  const instance = resolveKnexInstance(knexOrBuilder);
  const clientName = resolveClientName(instance);

  let cast;
  if (POSTGRES_CLIENTS.has(clientName)) {
    cast = { open: '', close: '::bigint' };
  } else if (SQLITE_CLIENTS.has(clientName)) {
    cast = { open: 'CAST(', close: ' AS INTEGER)' };
  } else if (MYSQL_CLIENTS.has(clientName)) {
    cast = { open: 'CAST(', close: ' AS SIGNED)' };
  } else {
    cast = { open: 'CAST(', close: ' AS BIGINT)' };
  }

  const statement = wrapExpression(expression, cast);
  return instance.raw(statement, bindings);
}

export function sumAsBigInt(knexOrBuilder, column) {
  if (!column || typeof column !== 'string') {
    throw new TypeError('Column for sumAsBigInt must be a non-empty string');
  }

  return castAsBigInt(knexOrBuilder, `SUM(${column})`);
}

export function countAsBigInt(knexOrBuilder, expression = '*') {
  if (!expression || typeof expression !== 'string') {
    throw new TypeError('Expression for countAsBigInt must be a non-empty string');
  }

  return castAsBigInt(knexOrBuilder, `COUNT(${expression})`);
}

