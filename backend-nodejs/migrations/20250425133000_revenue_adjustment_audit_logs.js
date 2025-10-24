import { jsonDefault } from './_helpers/schema.js';

const TABLE = 'revenue_adjustment_audit_logs';

export async function up(knex) {
  const hasTable = await knex.schema.hasTable(TABLE);
  if (hasTable) {
    return;
  }

  await knex.schema.createTable(TABLE, (table) => {
    table.increments('id').primary();
    table
      .integer('adjustment_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('revenue_adjustments')
      .onDelete('CASCADE');
    table.string('action', 60).notNullable().defaultTo('updated');
    table.json('changed_fields').notNullable().defaultTo(jsonDefault(knex, '[]'));
    table.json('previous_values').defaultTo(jsonDefault(knex, 'null'));
    table.json('next_values').defaultTo(jsonDefault(knex, 'null'));
    table
      .integer('performed_by')
      .unsigned()
      .references('id')
      .inTable('users')
      .onDelete('SET NULL');
    table.timestamp('performed_at').notNullable().defaultTo(knex.fn.now());
    table.index(['adjustment_id', 'performed_at'], 'revenue_adjustment_audit_adjustment_idx');
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists(TABLE);
}
