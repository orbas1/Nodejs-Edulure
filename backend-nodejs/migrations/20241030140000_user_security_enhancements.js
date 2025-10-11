exports.up = async function up(knex) {
  const hasEmailVerifiedAt = await knex.schema.hasColumn('users', 'email_verified_at');
  if (!hasEmailVerifiedAt) {
    await knex.schema.alterTable('users', (table) => {
      table.timestamp('email_verified_at').nullable().after('email');
    });
  }

  const hasFailedLoginAttempts = await knex.schema.hasColumn('users', 'failed_login_attempts');
  if (!hasFailedLoginAttempts) {
    await knex.schema.alterTable('users', (table) => {
      table.integer('failed_login_attempts').unsigned().notNullable().defaultTo(0).after('password_hash');
    });
  }

  const hasLastFailedLoginAt = await knex.schema.hasColumn('users', 'last_failed_login_at');
  if (!hasLastFailedLoginAt) {
    await knex.schema.alterTable('users', (table) => {
      table.timestamp('last_failed_login_at').nullable().after('failed_login_attempts');
    });
  }

  const hasLockedUntil = await knex.schema.hasColumn('users', 'locked_until');
  if (!hasLockedUntil) {
    await knex.schema.alterTable('users', (table) => {
      table.timestamp('locked_until').nullable().after('last_failed_login_at');
    });
  }

  const hasLastLoginAt = await knex.schema.hasColumn('users', 'last_login_at');
  if (!hasLastLoginAt) {
    await knex.schema.alterTable('users', (table) => {
      table.timestamp('last_login_at').nullable().after('locked_until');
    });
  }

  const hasPasswordChangedAt = await knex.schema.hasColumn('users', 'password_changed_at');
  if (!hasPasswordChangedAt) {
    await knex.schema.alterTable('users', (table) => {
      table.timestamp('password_changed_at').nullable().after('last_login_at');
    });
  }

  const hasLastVerificationSentAt = await knex.schema.hasColumn('users', 'last_verification_sent_at');
  if (!hasLastVerificationSentAt) {
    await knex.schema.alterTable('users', (table) => {
      table.timestamp('last_verification_sent_at').nullable().after('password_changed_at');
    });
  }

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
};

exports.down = async function down(knex) {
  const hasVerificationTable = await knex.schema.hasTable('user_email_verification_tokens');
  if (hasVerificationTable) {
    await knex.schema.dropTable('user_email_verification_tokens');
  }

  const columnNames = [
    'last_verification_sent_at',
    'password_changed_at',
    'last_login_at',
    'locked_until',
    'last_failed_login_at',
    'failed_login_attempts',
    'email_verified_at'
  ];

  for (const column of columnNames) {
    const exists = await knex.schema.hasColumn('users', column);
    if (exists) {
      await knex.schema.alterTable('users', (table) => {
        table.dropColumn(column);
      });
    }
  }
};
