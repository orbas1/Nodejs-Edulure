import { jsonDefault } from './_helpers/utils.js';

const JOB_STATE_TABLE = 'background_job_states';
const NOTIFICATION_QUEUE_TABLE = 'notification_dispatch_queue';

export async function up(knex) {
  const hasJobStateTable = await knex.schema.hasTable(JOB_STATE_TABLE);
  if (!hasJobStateTable) {
    await knex.schema.createTable(JOB_STATE_TABLE, (table) => {
      table.increments('id').primary();
      table.string('job_key', 160).notNullable();
      table.string('state_key', 160).notNullable();
      table.string('version', 160);
      table.json('state_value').notNullable().defaultTo(jsonDefault(knex, {}));
      table.json('metadata').notNullable().defaultTo(jsonDefault(knex, {}));
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table
        .timestamp('updated_at')
        .notNullable()
        .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

      table.unique(['job_key', 'state_key'], 'background_job_states_unique_key');
      table.index(['job_key'], 'background_job_states_job_key_idx');
      table.index(['job_key', 'updated_at'], 'background_job_states_recency_idx');
    });
  }

  const hasNotificationQueue = await knex.schema.hasTable(NOTIFICATION_QUEUE_TABLE);
  if (!hasNotificationQueue) {
    await knex.schema.createTable(NOTIFICATION_QUEUE_TABLE, (table) => {
      table.bigIncrements('id').primary();
      table
        .integer('user_id')
        .unsigned()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE');
      table
        .enu('channel', ['email', 'push', 'in_app'], {
          useNative: true,
          enumName: 'notification_dispatch_channel_enum'
        })
        .notNullable();
      table
        .enu('status', ['pending', 'processing', 'sent', 'failed', 'cancelled'], {
          useNative: true,
          enumName: 'notification_dispatch_status_enum'
        })
        .notNullable()
        .defaultTo('pending');
      table.string('dedupe_key', 190).notNullable();
      table.string('template_id', 150);
      table.string('title', 240);
      table.text('body');
      table.json('payload').notNullable().defaultTo(jsonDefault(knex, {}));
      table.json('metadata').notNullable().defaultTo(jsonDefault(knex, {}));
      table.timestamp('scheduled_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('available_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('last_attempt_at');
      table.integer('attempts').unsigned().notNullable().defaultTo(0);
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table
        .timestamp('updated_at')
        .notNullable()
        .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

      table.unique(['dedupe_key'], 'notification_dispatch_queue_dedupe_idx');
      table.index(['status', 'available_at'], 'notification_dispatch_queue_status_available_idx');
      table.index(['user_id', 'channel'], 'notification_dispatch_queue_user_channel_idx');
    });
  }
}

export async function down(knex) {
  const hasNotificationQueue = await knex.schema.hasTable(NOTIFICATION_QUEUE_TABLE);
  if (hasNotificationQueue) {
    await knex.schema.dropTableIfExists(NOTIFICATION_QUEUE_TABLE);
    const isPostgres = (knex?.client?.config?.client ?? '').toLowerCase().includes('pg');
    if (isPostgres) {
      await knex.raw('DROP TYPE IF EXISTS notification_dispatch_channel_enum');
      await knex.raw('DROP TYPE IF EXISTS notification_dispatch_status_enum');
    }
  }

  const hasJobStateTable = await knex.schema.hasTable(JOB_STATE_TABLE);
  if (hasJobStateTable) {
    await knex.schema.dropTableIfExists(JOB_STATE_TABLE);
  }
}
