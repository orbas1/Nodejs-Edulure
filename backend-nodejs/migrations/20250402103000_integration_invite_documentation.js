const COLUMN_NAME = 'documentation_url';

export async function up(knex) {
  const hasTable = await knex.schema.hasTable('integration_api_key_invites');
  if (!hasTable) {
    return;
  }

  const hasColumn = await knex.schema.hasColumn('integration_api_key_invites', COLUMN_NAME);
  if (!hasColumn) {
    await knex.schema.table('integration_api_key_invites', (table) => {
      table.string(COLUMN_NAME, 512).nullable();
    });
  }
}

export async function down(knex) {
  const hasTable = await knex.schema.hasTable('integration_api_key_invites');
  if (!hasTable) {
    return;
  }

  const hasColumn = await knex.schema.hasColumn('integration_api_key_invites', COLUMN_NAME);
  if (hasColumn) {
    await knex.schema.table('integration_api_key_invites', (table) => {
      table.dropColumn(COLUMN_NAME);
    });
  }
}
