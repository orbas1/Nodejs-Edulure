import { jsonDefault } from './_helpers/utils.js';

export async function up(knex) {
  const hasTable = await knex.schema.hasTable('revenue_adjustments');
  if (!hasTable) {
    await knex.schema.createTable('revenue_adjustments', (table) => {
      table.increments('id').primary();
      table.uuid('public_id').notNullable().unique();
      table.string('reference', 120).notNullable();
      table.string('category', 80).notNullable().defaultTo('general');
      table.string('status', 40).notNullable().defaultTo('scheduled');
      table.string('currency', 3).notNullable().defaultTo('USD');
      table.bigInteger('amount_cents').notNullable().defaultTo(0);
      table.timestamp('effective_at').notNullable();
      table.text('notes');
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
      table.index(['effective_at']);
      table.index(['category']);
    });
  }
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('revenue_adjustments');
}
