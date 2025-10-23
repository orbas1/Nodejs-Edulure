import { addTimestamps, ensureUpdatedAtTrigger, jsonDefault } from './_helpers/schema.js';

export async function up(knex) {
  await knex.transaction(async (trx) => {
    const hasNotificationPrefs = await trx.schema.hasTable('learner_notification_preferences');
    if (!hasNotificationPrefs) {
      await trx.schema.createTable('learner_notification_preferences', (table) => {
        table.increments('id').primary();
        table
          .integer('user_id')
          .unsigned()
          .notNullable()
          .references('id')
          .inTable('users')
          .onDelete('CASCADE');
        table.boolean('weekly_digest').notNullable().defaultTo(true);
        table.boolean('community_digest').notNullable().defaultTo(true);
        table.boolean('product_updates').notNullable().defaultTo(true);
        table.boolean('sms_alerts').notNullable().defaultTo(false);
        table.boolean('tutor_reminders').notNullable().defaultTo(true);
        table.json('metadata').notNullable().defaultTo(jsonDefault(trx, '{}'));
        addTimestamps(table, trx);
        table.unique(['user_id']);
      });

      await ensureUpdatedAtTrigger(trx, 'learner_notification_preferences');
    }

    const hasSecuritySettings = await trx.schema.hasTable('learner_security_settings');
    if (!hasSecuritySettings) {
      await trx.schema.createTable('learner_security_settings', (table) => {
        table.increments('id').primary();
        table
          .integer('user_id')
          .unsigned()
          .notNullable()
          .references('id')
          .inTable('users')
          .onDelete('CASCADE');
        table.boolean('require_mfa').notNullable().defaultTo(false);
        table.boolean('notify_on_new_device').notNullable().defaultTo(true);
        table.integer('session_timeout_minutes').unsigned().notNullable().defaultTo(60);
        table.json('metadata').notNullable().defaultTo(jsonDefault(trx, '{}'));
        addTimestamps(table, trx);
        table.unique(['user_id']);
      });

      await ensureUpdatedAtTrigger(trx, 'learner_security_settings');
    }
  });
}

export async function down(knex) {
  await knex.transaction(async (trx) => {
    await trx.schema.dropTableIfExists('learner_security_settings');
    await trx.schema.dropTableIfExists('learner_notification_preferences');
  });
}
