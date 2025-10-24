const INDEX_NAME = 'integration_api_key_invites_provider_env_alias_status_idx';

export async function up(knex) {
  const hasTable = await knex.schema.hasTable('integration_api_key_invites');
  if (!hasTable) {
    return;
  }

  const hasIndex = await knex.schema.hasIndex('integration_api_key_invites', INDEX_NAME);
  if (!hasIndex) {
    await knex.schema.table('integration_api_key_invites', (table) => {
      table.index(['provider', 'environment', 'alias', 'status', 'expires_at'], INDEX_NAME);
    });
  }
}

export async function down(knex) {
  const hasTable = await knex.schema.hasTable('integration_api_key_invites');
  if (!hasTable) {
    return;
  }

  const hasIndex = await knex.schema.hasIndex('integration_api_key_invites', INDEX_NAME);
  if (hasIndex) {
    await knex.schema.table('integration_api_key_invites', (table) => {
      table.dropIndex(['provider', 'environment', 'alias', 'status', 'expires_at'], INDEX_NAME);
    });
  }
}
