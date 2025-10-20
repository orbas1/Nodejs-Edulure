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

const applyTableDefaults = (table) => {
  if (typeof table.engine === 'function') {
    table.engine('InnoDB');
  }

  if (typeof table.charset === 'function') {
    table.charset('utf8mb4');
  }

  if (typeof table.collate === 'function') {
    table.collate('utf8mb4_unicode_ci');
  }
};

export async function up(knex) {
  const hasUsersTable = await knex.schema.hasTable('users');
  if (!hasUsersTable) {
    return;
  }

  const ensureColumn = async (columnName, definition, options = {}) => {
    const exists = await knex.schema.hasColumn('users', columnName);
    if (!exists) {
      await knex.schema.alterTable('users', (table) => {
        definition(table);
        if (options.index) {
          const { columns = [columnName], indexName } = options.index;
          table.index(columns, indexName ?? `idx_users_${columns.join('_')}`);
        }
      });
      return true;
    }

    if (options.index) {
      const { columns = [columnName], indexName } = options.index;
      await ensureIndex(knex, 'users', indexName ?? `idx_users_${columns.join('_')}`, columns);
    }

    return false;
  };

  await ensureColumn(
    'email_verified_at',
    (table) => {
      table.timestamp('email_verified_at').nullable().after('email');
    },
    { index: { indexName: 'idx_users_email_verified_at' } }
  );

  await ensureColumn('failed_login_attempts', (table) => {
    table
      .integer('failed_login_attempts')
      .unsigned()
      .notNullable()
      .defaultTo(0)
      .after('password_hash');
  });

  await ensureColumn('last_failed_login_at', (table) => {
    table.timestamp('last_failed_login_at').nullable().after('failed_login_attempts');
  });

  await ensureColumn(
    'locked_until',
    (table) => {
      table.timestamp('locked_until').nullable().after('last_failed_login_at');
    },
    { index: { indexName: 'idx_users_locked_until' } }
  );

  await ensureColumn(
    'last_login_at',
    (table) => {
      table.timestamp('last_login_at').nullable().after('locked_until');
    },
    { index: { indexName: 'idx_users_last_login_at' } }
  );

  await ensureColumn('password_changed_at', (table) => {
    table.timestamp('password_changed_at').nullable().after('last_login_at');
  });

  await ensureColumn('last_verification_sent_at', (table) => {
    table.timestamp('last_verification_sent_at').nullable().after('password_changed_at');
  });

  await ensureColumn(
    'two_factor_enabled',
    (table) => {
      table
        .boolean('two_factor_enabled')
        .notNullable()
        .defaultTo(false)
        .after('address');
    },
    { index: { indexName: 'idx_users_two_factor_enabled' } }
  );

  await ensureColumn('two_factor_secret', (table) => {
    table
      .specificType('two_factor_secret', 'varbinary(255)')
      .nullable()
      .after('two_factor_enabled');
  });

  await ensureColumn('two_factor_enrolled_at', (table) => {
    table.timestamp('two_factor_enrolled_at').nullable().after('two_factor_secret');
  });

  await ensureColumn(
    'two_factor_last_verified_at',
    (table) => {
      table.timestamp('two_factor_last_verified_at').nullable().after('two_factor_enrolled_at');
    },
    { index: { indexName: 'idx_users_two_factor_last_verified' } }
  );

  const hasVerificationTable = await knex.schema.hasTable('user_email_verification_tokens');
  if (!hasVerificationTable) {
    await knex.schema.createTable('user_email_verification_tokens', (table) => {
      table.increments('id').primary();
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE');
      table.string('token_hash', 128).notNullable();
      table.timestamp('expires_at').notNullable();
      table.timestamp('consumed_at').nullable();
      table.string('consumed_reason', 120).nullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.index(['user_id', 'expires_at'], 'idx_user_email_verification_user_expiry');
      table.index(['consumed_at'], 'idx_user_email_verification_consumed_at');
      table.unique(['token_hash'], 'uniq_user_email_verification_token');
      applyTableDefaults(table);
    });
  }
}

export async function down(knex) {
  const hasVerificationTable = await knex.schema.hasTable('user_email_verification_tokens');
  if (hasVerificationTable) {
    await knex.schema.dropTable('user_email_verification_tokens');
  }

  const columnNames = [
    'two_factor_last_verified_at',
    'two_factor_enrolled_at',
    'two_factor_secret',
    'two_factor_enabled',
    'last_verification_sent_at',
    'password_changed_at',
    'last_login_at',
    'locked_until',
    'last_failed_login_at',
    'failed_login_attempts',
    'email_verified_at'
  ];

  const hasUsersTable = await knex.schema.hasTable('users');
  if (!hasUsersTable) {
    return;
  }

  const indexNames = [
    'idx_users_email_verified_at',
    'idx_users_locked_until',
    'idx_users_last_login_at',
    'idx_users_two_factor_enabled',
    'idx_users_two_factor_last_verified'
  ];

  for (const indexName of indexNames) {
    await dropIndexIfExists(knex, 'users', indexName);
  }

  for (const column of columnNames) {
    const exists = await knex.schema.hasColumn('users', column);
    if (exists) {
      await knex.schema.alterTable('users', (table) => {
        table.dropColumn(column);
      });
    }
  }
}
