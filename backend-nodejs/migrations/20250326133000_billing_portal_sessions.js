import { addCheckConstraint, addTimestamps, ensureUpdatedAtTrigger, jsonDefault } from './_helpers/schema.js';

const TABLE = 'billing_portal_sessions';

export async function up(knex) {
  await knex.schema.createTable(TABLE, (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('(UUID())'));
    table
      .integer('user_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');
    table.string('session_token_hash', 128).notNullable().unique();
    table.string('portal_url', 512).notNullable();
    table.string('return_url', 512);
    table
      .enum('status', ['active', 'consumed', 'expired'])
      .notNullable()
      .defaultTo('active');
    table.timestamp('expires_at').notNullable();
    table.timestamp('consumed_at');
    table.json('metadata').notNullable().defaultTo(jsonDefault(knex, '{}'));
    addTimestamps(table, knex);

    table.index(['user_id', 'status'], 'billing_portal_sessions_user_status_idx');
    table.index(['expires_at'], 'billing_portal_sessions_expiry_idx');
  });

  await addCheckConstraint(
    knex,
    TABLE,
    'billing_portal_sessions_expiry_future_chk',
    'expires_at >= created_at'
  );
  await ensureUpdatedAtTrigger(knex, TABLE);
}

export async function down(knex) {
  await knex.schema.dropTableIfExists(TABLE);
}
