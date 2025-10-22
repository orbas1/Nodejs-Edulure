import { jsonDefault } from './_helpers/utils.js';

export async function up(knex) {
  const hasTable = await knex.schema.hasTable('growth_experiments');
  if (!hasTable) {
    await knex.schema.createTable('growth_experiments', (table) => {
      table.increments('id').primary();
      table.uuid('public_id').notNullable().unique();
      table.string('name', 200).notNullable();
      table.string('status', 40).notNullable().defaultTo('draft');
      table
        .integer('owner_id')
        .unsigned()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL');
      table.string('owner_email', 255);
      table.text('hypothesis');
      table.text('primary_metric');
      table.decimal('baseline_value', 12, 4);
      table.decimal('target_value', 12, 4);
      table.timestamp('start_at');
      table.timestamp('end_at');
      table
        .json('segments')
        .notNullable()
        .defaultTo(jsonDefault(knex, []));
      table
        .json('metadata')
        .notNullable()
        .defaultTo(jsonDefault(knex, {}));
      table
        .integer('created_by')
        .unsigned()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL');
      table
        .integer('updated_by')
        .unsigned()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table
        .timestamp('updated_at')
        .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
      table.index(['status']);
      table.index(['start_at']);
    });
  }
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('growth_experiments');
}
