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

  const rows = await knex('integration_api_key_invites')
    .select('id', 'metadata')
    .whereNull(COLUMN_NAME)
    .andWhereNotNull('metadata');

  if (!Array.isArray(rows) || rows.length === 0) {
    return;
  }

  for (const row of rows) {
    let documentationUrl = null;
    try {
      const metadata = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata;
      const candidate = metadata?.documentationUrl;
      if (typeof candidate === 'string' && candidate.trim()) {
        documentationUrl = candidate.trim();
      }
    } catch (_error) {
      documentationUrl = null;
    }

    if (!documentationUrl) {
      continue;
    }

    await knex('integration_api_key_invites')
      .where({ id: row.id })
      .update({ [COLUMN_NAME]: documentationUrl });
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
