export async function up(knex) {
  const hasSystemPreferences = await knex.schema.hasTable('learner_system_preferences');
  if (!hasSystemPreferences) {
    await knex.schema.createTable('learner_system_preferences', (table) => {
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
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table
        .timestamp('updated_at')
        .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
      table.unique(['user_id']);
    });
  }

  const hasFinanceBudgets = await knex.schema.hasTable('learner_finance_budgets');
  if (!hasFinanceBudgets) {
    await knex.schema.createTable('learner_finance_budgets', (table) => {
      table.increments('id').primary();
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE');
      table.string('name', 120).notNullable();
      table.integer('amount_cents').unsigned().notNullable().defaultTo(0);
      table.string('currency', 3).notNullable().defaultTo('USD');
      table.string('period', 24).notNullable().defaultTo('monthly');
      table.boolean('alerts_enabled').notNullable().defaultTo(true);
      table.integer('alert_threshold_percent').unsigned().notNullable().defaultTo(80);
      table.json('metadata').notNullable().defaultTo('{}');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table
        .timestamp('updated_at')
        .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
      table.index(['user_id', 'period'], 'learner_finance_budgets_user_period_idx');
    });
  }
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('learner_finance_budgets');
  await knex.schema.dropTableIfExists('learner_system_preferences');
}
