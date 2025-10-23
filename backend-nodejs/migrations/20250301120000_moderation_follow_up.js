import { jsonDefault } from './_helpers/utils.js';

const JSON_EMPTY_OBJECT = (knex) => jsonDefault(knex, {});

export async function up(knex) {
  const hasTable = await knex.schema.hasTable('moderation_follow_ups');
  if (!hasTable) {
    await knex.schema.createTable('moderation_follow_ups', (table) => {
      table.increments('id').primary();
      table
        .integer('case_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('community_post_moderation_cases')
        .onDelete('CASCADE');
      table
        .integer('action_id')
        .unsigned()
        .references('id')
        .inTable('community_post_moderation_actions')
        .onDelete('SET NULL');
      table
        .integer('assigned_to')
        .unsigned()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL');
      table.enum('status', ['pending', 'completed', 'cancelled']).notNullable().defaultTo('pending');
      table.timestamp('due_at').notNullable();
      table.timestamp('completed_at');
      table.json('metadata').notNullable().defaultTo(JSON_EMPTY_OBJECT(knex));
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.index(['case_id', 'status']);
      table.index(['due_at', 'status'], 'moderation_follow_ups_due_idx');
    });
  }
}

export async function down(knex) {
  const hasTable = await knex.schema.hasTable('moderation_follow_ups');
  if (hasTable) {
    await knex.schema.dropTable('moderation_follow_ups');
  }
}
