import {
  addCheckConstraint,
  addTimestamps,
  ensureUpdatedAtTrigger,
  jsonDefault
} from './_helpers/schema.js';

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
        table.json('preferences').notNullable().defaultTo(jsonDefault(trx, '{}'));
        addTimestamps(table, trx);
        table.unique(['user_id']);
      });
      await ensureUpdatedAtTrigger(trx, 'learner_system_preferences');
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
        table.json('metadata').notNullable().defaultTo(jsonDefault(trx, '{}'));
        addTimestamps(table, trx);
        table.index(['user_id', 'purchased_at'], 'learner_finance_purchases_user_date_idx');
        table.index(['user_id', 'status'], 'learner_finance_purchases_user_status_idx');
      });

      await addCheckConstraint(
        trx,
        'learner_finance_purchases',
        'learner_finance_purchases_amount_chk',
        'amount_cents >= 0'
      );
      await ensureUpdatedAtTrigger(trx, 'learner_finance_purchases');
    }
  });
}

export async function down(knex) {
  await knex.transaction(async (trx) => {
    await trx.schema.dropTableIfExists('learner_finance_purchases');
    await trx.schema.dropTableIfExists('learner_system_preferences');
  });
}
