export async function up(knex) {
  const hasUsersTable = await knex.schema.hasTable('users');
  if (!hasUsersTable) {
    return;
  }

  const ensureColumn = async (columnName, definition) => {
    const exists = await knex.schema.hasColumn('users', columnName);
    if (!exists) {
      await knex.schema.alterTable('users', (table) => {
        definition(table);
      });
    }
  };

  await ensureColumn('email_verified_at', (table) => {
    table.timestamp('email_verified_at').nullable().after('email');
  });

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

  await ensureColumn('locked_until', (table) => {
    table.timestamp('locked_until').nullable().after('last_failed_login_at');
  });

  await ensureColumn('last_login_at', (table) => {
    table.timestamp('last_login_at').nullable().after('locked_until');
  });

  await ensureColumn('password_changed_at', (table) => {
    table.timestamp('password_changed_at').nullable().after('last_login_at');
  });

  await ensureColumn('last_verification_sent_at', (table) => {
    table.timestamp('last_verification_sent_at').nullable().after('password_changed_at');
  });

  await ensureColumn('two_factor_enabled', (table) => {
    table
      .boolean('two_factor_enabled')
      .notNullable()
      .defaultTo(false)
      .after('address');
  });

  await ensureColumn('two_factor_secret', (table) => {
    table
      .specificType('two_factor_secret', 'varbinary(255)')
      .nullable()
      .after('two_factor_enabled');
  });

  await ensureColumn('two_factor_enrolled_at', (table) => {
    table.timestamp('two_factor_enrolled_at').nullable().after('two_factor_secret');
  });

  await ensureColumn('two_factor_last_verified_at', (table) => {
    table.timestamp('two_factor_last_verified_at').nullable().after('two_factor_enrolled_at');
  });

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
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.index(['user_id', 'expires_at']);
      table.unique(['token_hash']);
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

  for (const column of columnNames) {
    const exists = await knex.schema.hasColumn('users', column);
    if (exists) {
      await knex.schema.alterTable('users', (table) => {
        table.dropColumn(column);
      });
    }
  }
}
