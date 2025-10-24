export async function up(knex) {
  const hasTable = await knex.schema.hasTable('search_documents');
  if (!hasTable) {
    return;
  }

  const hasColumn = await knex.schema.hasColumn('search_documents', 'cluster_key');
  if (hasColumn) {
    return;
  }

  await knex.schema.alterTable('search_documents', (table) => {
    table
      .string('cluster_key', 60)
      .notNullable()
      .defaultTo('general')
      .index('idx_search_documents_cluster_key');
  });

  await knex('search_documents').update({ cluster_key: 'general' });
}

export async function down(knex) {
  const hasTable = await knex.schema.hasTable('search_documents');
  if (!hasTable) {
    return;
  }

  const hasColumn = await knex.schema.hasColumn('search_documents', 'cluster_key');
  if (!hasColumn) {
    return;
  }

  await knex.schema.alterTable('search_documents', (table) => {
    table.dropIndex('cluster_key', 'idx_search_documents_cluster_key');
    table.dropColumn('cluster_key');
  });
}
