const INDEX_NAME = 'integration_api_key_invites_provider_env_alias_status_idx';

export async function up(knex) {
  const hasTable = await knex.schema.hasTable('integration_api_key_invites');
  if (!hasTable) {
    return;
  }

  try {
    await knex.schema.table('integration_api_key_invites', (table) => {
      table.index(['provider', 'environment', 'alias', 'status', 'expires_at'], INDEX_NAME);
    });
  } catch (error) {
    const message = String(error?.message ?? '').toLowerCase();
    const code = String(error?.code ?? '').toLowerCase();
    if (
      !message.includes('already exists') &&
      !message.includes('duplicate') &&
      !code.includes('er_dup_key')
    ) {
      throw error;
    }
  }
}

export async function down(knex) {
  const hasTable = await knex.schema.hasTable('integration_api_key_invites');
  if (!hasTable) {
    return;
  }

  const client = String(knex?.client?.config?.client ?? '').toLowerCase();
  if (client.includes('mysql')) {
    await knex.raw('ALTER TABLE ?? DROP INDEX ??', ['integration_api_key_invites', INDEX_NAME]);
    return;
  }

  await knex.raw('DROP INDEX IF EXISTS ??', [INDEX_NAME]);
}
