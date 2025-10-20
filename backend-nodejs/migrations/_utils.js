export function jsonDefault(knex, value) {
  const serialized = typeof value === 'string' ? value : JSON.stringify(value);
  return knex.raw('CAST(? AS JSON)', [serialized]);
}

export function isPostgres(knex) {
  const client = knex?.client;
  const dialect = client?.config?.client ?? client?.dialect ?? '';
  return typeof dialect === 'string' && dialect.toLowerCase().includes('pg');
}
