const JSON_CAPABLE_CLIENTS = new Set([
  'pg',
  'postgres',
  'postgresql',
  'cockroachdb',
  'mysql',
  'mysql2',
  'mssql',
  'oracledb'
]);

const ensureIndex = async (knex, tableName, indexName, columns) => {
  try {
    await knex.schema.alterTable(tableName, (table) => {
      table.index(columns, indexName);
    });
  } catch (error) {
    const message = error?.message?.toLowerCase?.() ?? '';
    if (!message.includes('exists')) {
      throw error;
    }
  }
};

const dropIndexIfExists = async (knex, tableName, indexName) => {
  try {
    await knex.schema.alterTable(tableName, (table) => {
      table.dropIndex([], indexName);
    });
  } catch (error) {
    const message = error?.message?.toLowerCase?.() ?? '';
    if (!(message.includes('does not exist') || message.includes('unknown') || message.includes('no such index'))) {
      throw error;
    }
  }
};

export async function up(knex) {
  const hasSessionsTable = await knex.schema.hasTable('user_sessions');
  if (!hasSessionsTable) {
    return;
  }

  const hasClientColumn = await knex.schema.hasColumn('user_sessions', 'client');
  if (!hasClientColumn) {
    await knex.schema.alterTable('user_sessions', (table) => {
      table.string('client', 64).notNullable().defaultTo('web');
    });
  }

  const hasMetadataColumn = await knex.schema.hasColumn('user_sessions', 'client_metadata');
  if (!hasMetadataColumn) {
    await knex.schema.alterTable('user_sessions', (table) => {
      if (JSON_CAPABLE_CLIENTS.has(knex.client.config.client)) {
        table.json('client_metadata').nullable();
      } else {
        table.text('client_metadata').nullable();
      }
    });
  }

  await knex('user_sessions')
    .update({
      client: knex.raw("coalesce(nullif(trim(client), ''), 'web')"),
      client_metadata: knex.raw("coalesce(client_metadata, '{}')")
    })
    .catch(() => undefined);

  await ensureIndex(knex, 'user_sessions', 'idx_user_sessions_client', ['client']);
}

export async function down(knex) {
  const hasSessionsTable = await knex.schema.hasTable('user_sessions');
  if (!hasSessionsTable) {
    return;
  }

  await dropIndexIfExists(knex, 'user_sessions', 'idx_user_sessions_client');

  const hasMetadataColumn = await knex.schema.hasColumn('user_sessions', 'client_metadata');
  if (hasMetadataColumn) {
    await knex.schema.alterTable('user_sessions', (table) => {
      table.dropColumn('client_metadata');
    });
  }

  const hasClientColumn = await knex.schema.hasColumn('user_sessions', 'client');
  if (hasClientColumn) {
    await knex.schema.alterTable('user_sessions', (table) => {
      table.dropColumn('client');
    });
  }
}
