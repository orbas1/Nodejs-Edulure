export async function up(knex) {
  const hasSessionsTable = await knex.schema.hasTable('user_sessions');
  if (!hasSessionsTable) {
    return;
  }

  const ensureColumn = async (columnName, definition) => {
    const exists = await knex.schema.hasColumn('user_sessions', columnName);
    if (!exists) {
      await knex.schema.alterTable('user_sessions', (table) => {
        definition(table);
      });
    }
    return !exists;
  };

  await ensureColumn('last_used_at', (table) => {
    table.timestamp('last_used_at').nullable().after('created_at');
  });

  await ensureColumn('rotated_at', (table) => {
    table.timestamp('rotated_at').nullable().after('last_used_at');
  });

  await ensureColumn('revoked_by', (table) => {
    table
      .integer('revoked_by')
      .unsigned()
      .references('id')
      .inTable('users')
      .onDelete('SET NULL')
      .after('revoked_reason');
  });

  const hasLastUsedAt = await knex.schema.hasColumn('user_sessions', 'last_used_at');
  if (hasLastUsedAt) {
    await knex('user_sessions')
      .whereNull('last_used_at')
      .update({ last_used_at: knex.fn.now() });
  }
}

export async function down(knex) {
  const hasSessionsTable = await knex.schema.hasTable('user_sessions');
  if (!hasSessionsTable) {
    return;
  }

  const columns = ['revoked_by', 'rotated_at', 'last_used_at'];
  for (const column of columns) {
    const exists = await knex.schema.hasColumn('user_sessions', column);
    if (exists) {
      await knex.schema.alterTable('user_sessions', (table) => {
        table.dropColumn(column);
      });
    }
  }
}
