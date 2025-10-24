const TABLE_NAME = 'integration_api_key_invites';
const COLUMN_NAME = 'documentation_url';
const INDEX_NAME = 'integration_api_key_invites_documentation_url_idx';

export async function up(knex) {
  const hasTable = await knex.schema.hasTable(TABLE_NAME);
  if (!hasTable) {
    return;
  }

  const hasColumn = await knex.schema.hasColumn(TABLE_NAME, COLUMN_NAME);
  if (!hasColumn) {
    await knex.schema.table(TABLE_NAME, (table) => {
      table.string(COLUMN_NAME, 2048).nullable();
      table.index([COLUMN_NAME], INDEX_NAME);
    });
  }
}

export async function down(knex) {
  const hasTable = await knex.schema.hasTable(TABLE_NAME);
  if (!hasTable) {
    return;
  }

  const hasColumn = await knex.schema.hasColumn(TABLE_NAME, COLUMN_NAME);
  if (hasColumn) {
    await knex.schema.table(TABLE_NAME, (table) => {
      table.dropIndex([COLUMN_NAME], INDEX_NAME);
      table.dropColumn(COLUMN_NAME);
    });
  }
}
