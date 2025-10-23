import { jsonDefault } from './_helpers/utils.js';

const JSON_EMPTY_OBJECT = (knex) => jsonDefault(knex, {});

export async function up(knex) {
  await knex.schema.createTable('community_post_moderation_followups', (table) => {
    table.increments('id').primary();
    table
      .integer('case_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('community_post_moderation_cases')
      .onDelete('CASCADE');
    table.string('public_id', 64).notNullable().unique();
    table.string('status', 32).notNullable().defaultTo('pending');
    table.timestamp('remind_at').notNullable();
    table.string('reason', 255).nullable();
    table.json('metadata').notNullable().defaultTo(JSON_EMPTY_OBJECT(knex));
    table.timestamp('processed_at').nullable();
    table.timestamps(true, true);

    table.index(['status', 'remind_at'], 'moderation_followups_status_remind_idx');
    table.index(['case_id', 'status'], 'moderation_followups_case_status_idx');
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('community_post_moderation_followups');
}
