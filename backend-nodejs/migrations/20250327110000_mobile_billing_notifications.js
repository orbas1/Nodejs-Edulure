import {
  addTimestamps,
  ensureUpdatedAtTrigger,
  jsonDefault
} from './_helpers/schema.js';

const RECEIPTS_TABLE = 'billing_receipt_submissions';
const PREFS_TABLE = 'notification_preferences';
const DEVICES_TABLE = 'notification_device_registrations';

export async function up(knex) {
  await knex.transaction(async (trx) => {
    const hasReceipts = await trx.schema.hasTable(RECEIPTS_TABLE);
    if (!hasReceipts) {
      await trx.schema.createTable(RECEIPTS_TABLE, (table) => {
        table.increments('id').primary();
        table.uuid('public_id').notNullable().unique();
        table
          .integer('user_id')
          .unsigned()
          .references('id')
          .inTable('users')
          .onDelete('SET NULL');
        table
          .enum('platform', ['ios', 'android', 'web', 'test', 'unknown'])
          .notNullable()
          .defaultTo('unknown');
        table.string('product_id', 160).notNullable();
        table.string('transaction_id', 160).notNullable();
        table.text('purchase_token').notNullable();
        table
          .enum('status', ['pending', 'validated', 'rejected'])
          .notNullable()
          .defaultTo('pending');
        table.text('last_error');
        table.integer('retry_count').unsigned().notNullable().defaultTo(0);
        table.timestamp('last_attempt_at');
        table.timestamp('validated_at');
        table.json('payload').notNullable().defaultTo(jsonDefault(trx, '{}'));
        table.json('metadata').notNullable().defaultTo(jsonDefault(trx, '{}'));
        addTimestamps(table, trx);

        table.unique(['transaction_id', 'platform'], 'billing_receipt_transaction_platform_unique');
        table.index(['user_id', 'status'], 'billing_receipt_user_status_idx');
        table.index(['product_id'], 'billing_receipt_product_idx');
      });

      await ensureUpdatedAtTrigger(trx, RECEIPTS_TABLE);
    }

    const hasPrefs = await trx.schema.hasTable(PREFS_TABLE);
    if (!hasPrefs) {
      await trx.schema.createTable(PREFS_TABLE, (table) => {
        table.increments('id').primary();
        table
          .integer('user_id')
          .unsigned()
          .notNullable()
          .references('id')
          .inTable('users')
          .onDelete('CASCADE')
          .unique();
        table.json('channels').notNullable().defaultTo(jsonDefault(trx, '{}'));
        table.json('categories').notNullable().defaultTo(jsonDefault(trx, '{}'));
        table.string('slack_channel', 160);
        table.string('slack_workspace', 160);
        table.timestamp('last_synced_at');
        table.json('metadata').notNullable().defaultTo(jsonDefault(trx, '{}'));
        addTimestamps(table, trx);
      });

      await ensureUpdatedAtTrigger(trx, PREFS_TABLE);
    }

    const hasDevices = await trx.schema.hasTable(DEVICES_TABLE);
    if (!hasDevices) {
      await trx.schema.createTable(DEVICES_TABLE, (table) => {
        table.increments('id').primary();
        table
          .integer('user_id')
          .unsigned()
          .references('id')
          .inTable('users')
          .onDelete('SET NULL');
        table.string('device_token', 255).notNullable().unique();
        table.string('platform', 32).notNullable().defaultTo('unknown');
        table.string('app_version', 32);
        table.string('os_version', 32);
        table.string('locale', 16);
        table.timestamp('last_registered_at').notNullable().defaultTo(trx.fn.now());
        table.json('metadata').notNullable().defaultTo(jsonDefault(trx, '{}'));
        addTimestamps(table, trx);

        table.index(['user_id', 'platform'], 'notification_device_user_platform_idx');
      });

      await ensureUpdatedAtTrigger(trx, DEVICES_TABLE);
    }
  });
}

export async function down(knex) {
  await knex.transaction(async (trx) => {
    const tables = [DEVICES_TABLE, PREFS_TABLE, RECEIPTS_TABLE];
    for (const tableName of tables) {
      const exists = await trx.schema.hasTable(tableName);
      if (exists) {
        await trx.schema.dropTable(tableName);
      }
    }
  });
}
