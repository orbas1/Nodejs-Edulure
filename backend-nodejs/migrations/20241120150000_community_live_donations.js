import { jsonDefault } from './_helpers/utils.js';

export async function up(knex) {
  const hasTable = await knex.schema.hasTable('community_donations');
  if (!hasTable) {
    await knex.schema.createTable('community_donations', (table) => {
      table.increments('id').primary();
      table
        .integer('community_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('communities')
        .onDelete('CASCADE');
      table
        .integer('event_id')
        .unsigned()
        .references('id')
        .inTable('community_events')
        .onDelete('SET NULL');
      table
        .integer('payment_intent_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('payment_intents')
        .onDelete('CASCADE');
      table
        .integer('user_id')
        .unsigned()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL');
      table
        .integer('affiliate_id')
        .unsigned()
        .references('id')
        .inTable('community_affiliates')
        .onDelete('SET NULL');
      table.bigInteger('amount_cents').unsigned().notNullable();
      table.string('currency', 3).notNullable();
      table
        .enum('status', ['pending', 'succeeded', 'failed', 'refunded'])
        .notNullable()
        .defaultTo('pending');
      table.string('referral_code', 60);
      table.string('donor_name', 120);
      table.text('message');
      table.json('metadata').notNullable().defaultTo(jsonDefault(knex, {}));
      table.timestamp('captured_at');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table
        .timestamp('updated_at')
        .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
      table.index(['community_id', 'status']);
      table.index(['payment_intent_id']);
      table.index(['event_id']);
    });
  }
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('community_donations');
}
