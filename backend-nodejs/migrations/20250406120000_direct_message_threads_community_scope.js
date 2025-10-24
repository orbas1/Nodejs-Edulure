export async function up(knex) {
  const hasColumn = await knex.schema.hasColumn('direct_message_threads', 'community_id');
  if (!hasColumn) {
    await knex.schema.alterTable('direct_message_threads', (table) => {
      table
        .integer('community_id')
        .unsigned()
        .references('id')
        .inTable('communities')
        .onDelete('CASCADE');
      table.index(['community_id'], 'direct_message_threads_community_id_index');
    });
  }
}

export async function down(knex) {
  const hasColumn = await knex.schema.hasColumn('direct_message_threads', 'community_id');
  if (hasColumn) {
    await knex.schema.alterTable('direct_message_threads', (table) => {
      table.dropIndex(['community_id'], 'direct_message_threads_community_id_index');
      table.dropColumn('community_id');
    });
  }
}
