const DIALECTS = {
  mysql: new Set(['mysql', 'mysql2']),
  postgres: new Set(['pg', 'postgres', 'postgresql'])
};

function getDialect(knex) {
  return knex?.client?.config?.client ?? 'mysql2';
}

function isMysql(knex) {
  return DIALECTS.mysql.has(getDialect(knex));
}

function isPostgres(knex) {
  return DIALECTS.postgres.has(getDialect(knex));
}

function normaliseRows(result) {
  if (!result) {
    return [];
  }

  if (Array.isArray(result)) {
    return result[0] ?? [];
  }

  if (typeof result === 'object' && result !== null && Array.isArray(result.rows)) {
    return result.rows;
  }

  return [];
}

async function constraintExists(knex, tableName, constraintName) {
  if (isMysql(knex)) {
    const rows = normaliseRows(
      await knex.raw(
        `SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND CONSTRAINT_NAME = ?`,
        [tableName, constraintName]
      )
    );
    return rows.length > 0;
  }

  if (isPostgres(knex)) {
    const rows = normaliseRows(
      await knex.raw(
        `SELECT 1 FROM information_schema.table_constraints WHERE table_schema = current_schema() AND table_name = ? AND constraint_name = ?`,
        [tableName, constraintName]
      )
    );
    return rows.length > 0;
  }

  return false;
}

async function addCheckConstraint(knex, tableName, constraintName, expression) {
  if (await constraintExists(knex, tableName, constraintName)) {
    return;
  }

  await knex.raw(`ALTER TABLE ?? ADD CONSTRAINT ?? CHECK (${expression})`, [tableName, constraintName]);
}

export async function up(knex) {
  await knex.transaction(async (trx) => {
    const hasSystemPreferences = await trx.schema.hasTable('learner_system_preferences');
    if (!hasSystemPreferences) {
      await trx.schema.createTable('learner_system_preferences', (table) => {
        table.increments('id').primary();
        table
          .integer('user_id')
          .unsigned()
          .notNullable()
          .references('id')
          .inTable('users')
          .onDelete('CASCADE');
        table.string('language', 8).notNullable().defaultTo('en');
        table.string('region', 32).notNullable().defaultTo('US');
        table.string('timezone', 64).notNullable().defaultTo('UTC');
        table.boolean('notifications_enabled').notNullable().defaultTo(true);
        table.boolean('digest_enabled').notNullable().defaultTo(true);
        table.boolean('auto_play_media').notNullable().defaultTo(false);
        table.boolean('high_contrast').notNullable().defaultTo(false);
        table.boolean('reduced_motion').notNullable().defaultTo(false);
        table.json('preferences').notNullable().defaultTo('{}');
        table.timestamp('created_at').notNullable().defaultTo(trx.fn.now());
        table
          .timestamp('updated_at')
          .notNullable()
          .defaultTo(trx.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
        table.unique(['user_id']);
      });
    }

    const hasFinancePurchases = await trx.schema.hasTable('learner_finance_purchases');
    if (!hasFinancePurchases) {
      await trx.schema.createTable('learner_finance_purchases', (table) => {
        table.increments('id').primary();
        table
          .integer('user_id')
          .unsigned()
          .notNullable()
          .references('id')
          .inTable('users')
          .onDelete('CASCADE');
        table.string('reference', 64).notNullable();
        table.string('description', 255).notNullable();
        table.integer('amount_cents').unsigned().notNullable().defaultTo(0);
        table.string('currency', 3).notNullable().defaultTo('USD');
        table.string('status', 32).notNullable().defaultTo('paid');
        table.timestamp('purchased_at').notNullable().defaultTo(trx.fn.now());
        table.json('metadata').notNullable().defaultTo('{}');
        table.timestamp('created_at').notNullable().defaultTo(trx.fn.now());
        table
          .timestamp('updated_at')
          .notNullable()
          .defaultTo(trx.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
        table.index(['user_id', 'purchased_at'], 'learner_finance_purchases_user_date_idx');
        table.index(['user_id', 'status'], 'learner_finance_purchases_user_status_idx');
      });

      await addCheckConstraint(
        trx,
        'learner_finance_purchases',
        'learner_finance_purchases_amount_chk',
        'amount_cents >= 0'
      );
    }
  });
}

export async function down(knex) {
  await knex.transaction(async (trx) => {
    await trx.schema.dropTableIfExists('learner_finance_purchases');
    await trx.schema.dropTableIfExists('learner_system_preferences');
  });
}
