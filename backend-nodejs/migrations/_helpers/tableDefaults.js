const MYSQL_REGEX = /mysql/i;

export function applyTableDefaults(table) {
  const client = table?.client?.config?.client ?? '';
  if (!MYSQL_REGEX.test(client)) {
    return;
  }

  if (typeof table.engine === 'function') {
    table.engine('InnoDB');
  }

  if (typeof table.charset === 'function') {
    table.charset('utf8mb4');
  }

  if (typeof table.collate === 'function') {
    table.collate('utf8mb4_unicode_ci');
  }
}

export function updatedAtDefault(knex) {
  const client = knex?.client?.config?.client ?? '';
  return MYSQL_REGEX.test(client)
    ? knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
    : knex.fn.now();
}
