let cachedDatabaseName;

const getDatabaseName = async (knex) => {
  if (cachedDatabaseName) {
    return cachedDatabaseName;
  }

  const [rows] = await knex.raw('SELECT DATABASE() AS db');
  cachedDatabaseName = rows[0]?.db;
  return cachedDatabaseName;
};

const indexExists = async (knex, tableName, indexName) => {
  const database = await getDatabaseName(knex);
  const [rows] = await knex.raw(
    `SELECT COUNT(1) AS count
     FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND INDEX_NAME = ?`,
    [database, tableName, indexName]
  );

  return Number(rows[0]?.count ?? 0) > 0;
};

const ensureIndex = async (knex, tableName, indexName, columns) => {
  if (await indexExists(knex, tableName, indexName)) {
    return false;
  }

  await knex.schema.alterTable(tableName, (table) => {
    table.index(columns, indexName);
  });
  return true;
};

const dropIndexIfExists = async (knex, tableName, indexName) => {
  if (!(await indexExists(knex, tableName, indexName))) {
    return false;
  }

  await knex.schema.alterTable(tableName, (table) => {
    table.dropIndex([], indexName);
  });
  return true;
};

export async function up(knex) {
  const hasSessionsTable = await knex.schema.hasTable('user_sessions');
  if (!hasSessionsTable) {
    return;
  }

  const ensureColumn = async (columnName, definition, options = {}) => {
    const exists = await knex.schema.hasColumn('user_sessions', columnName);
    if (!exists) {
      await knex.schema.alterTable('user_sessions', (table) => {
        definition(table);
        if (options.index) {
          const { columns = [columnName], indexName } = options.index;
          table.index(columns, indexName ?? `idx_user_sessions_${columns.join('_')}`);
        }
      });
    }
    if (options.index) {
      const { columns = [columnName], indexName } = options.index;
      await ensureIndex(knex, 'user_sessions', indexName ?? `idx_user_sessions_${columns.join('_')}`, columns);
    }
    return !exists;
  };

  await ensureColumn(
    'last_used_at',
    (table) => {
      table.timestamp('last_used_at').nullable().after('created_at');
    },
    { index: { indexName: 'idx_user_sessions_last_used', columns: ['user_id', 'last_used_at'] } }
  );

  await ensureColumn(
    'rotated_at',
    (table) => {
      table.timestamp('rotated_at').nullable().after('last_used_at');
    },
    { index: { indexName: 'idx_user_sessions_rotated_at', columns: ['rotated_at'] } }
  );

  await ensureColumn(
    'revoked_by',
    (table) => {
      table
        .integer('revoked_by')
        .unsigned()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
        .after('revoked_reason');
    },
    { index: { indexName: 'idx_user_sessions_revoked_by', columns: ['revoked_by'] } }
  );

  const hasLastUsedAt = await knex.schema.hasColumn('user_sessions', 'last_used_at');
  if (hasLastUsedAt) {
    await knex('user_sessions')
      .whereNull('last_used_at')
      .update({ last_used_at: knex.raw('COALESCE(created_at, CURRENT_TIMESTAMP)') });
  }
}

export async function down(knex) {
  const hasSessionsTable = await knex.schema.hasTable('user_sessions');
  if (!hasSessionsTable) {
    return;
  }

  const indexNames = [
    'idx_user_sessions_last_used',
    'idx_user_sessions_rotated_at',
    'idx_user_sessions_revoked_by'
  ];

  for (const indexName of indexNames) {
    await dropIndexIfExists(knex, 'user_sessions', indexName);
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
