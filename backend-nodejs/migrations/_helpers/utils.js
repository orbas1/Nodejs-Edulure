export function jsonDefault(knex, value) {
  const serialized = typeof value === 'string' ? value : JSON.stringify(value);
  const raw = knex.raw('(CAST(? AS JSON))', [serialized]);
  const wrapper = () => raw.toQuery();
  Object.assign(wrapper, raw, {
    isRawInstance: true,
    toSQL: (...args) => raw.toSQL(...args),
    toQuery: (...args) => raw.toQuery(...args)
  });
  return wrapper;
}

export function isPostgres(knex) {
  const client = knex?.client;
  const dialect = client?.config?.client ?? client?.dialect ?? '';
  return typeof dialect === 'string' && dialect.toLowerCase().includes('pg');
}
