export async function up(knex) {
  const hasColumn = await knex.schema.hasColumn('user_sessions', 'last_used_at');
  await knex.schema.alterTable('user_sessions', (table) => {
    if (!hasColumn) {
      table.timestamp('last_used_at');
    }
    table.timestamp('rotated_at');
    table
      .integer('revoked_by')
      .unsigned()
      .references('id')
      .inTable('users')
      .onDelete('SET NULL');
  });

  await knex('user_sessions')
    .whereNull('last_used_at')
    .update({ last_used_at: knex.fn.now() });
}

export async function down(knex) {
  await knex.schema.alterTable('user_sessions', (table) => {
    table.dropColumn('revoked_by');
    table.dropColumn('rotated_at');
    table.dropColumn('last_used_at');
  });
}
