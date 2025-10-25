import { jsonDefault } from './_helpers/utils.js';
import { updatedAtDefault } from './_helpers/tableDefaults.js';
const JSON_EMPTY_OBJECT = (knex) => jsonDefault(knex, {});
const JSON_EMPTY_ARRAY = (knex) => jsonDefault(knex, []);

export async function up(knex) {
  const hasTable = await knex.schema.hasTable('user_profiles');
  if (!hasTable) {
    await knex.schema.createTable('user_profiles', (table) => {
      table.increments('id').primary();
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE');
      table.string('display_name', 200);
      table.string('tagline', 240);
      table.string('location', 160);
      table.string('avatar_url', 500);
      table.string('banner_url', 500);
      table.text('bio');
      table.json('social_links').notNullable().defaultTo(JSON_EMPTY_ARRAY(knex));
      table.json('metadata').notNullable().defaultTo(JSON_EMPTY_OBJECT(knex));
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table
        .timestamp('updated_at')
        .defaultTo(updatedAtDefault(knex));
      table.unique(['user_id']);
      table.index(['display_name']);
    });
  }
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('user_profiles');
}
