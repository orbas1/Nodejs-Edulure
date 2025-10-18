import { onUpdateTrigger } from '../src/utils/migrationHelpers.js';

export async function up(knex) {
  const hasTable = await knex.schema.hasTable('feature_flag_tenant_states');
  if (!hasTable) {
    await knex.schema.createTable('feature_flag_tenant_states', (table) => {
      table.increments('id').primary();
      table
        .integer('flag_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('feature_flags')
        .onDelete('CASCADE');
      table.string('tenant_id', 128).notNullable();
      table.string('environment', 32).notNullable().defaultTo('production');
      table
        .enu('override_state', ['forced_on', 'forced_off'], {
          useNative: true,
          enumName: 'feature_flag_override_state'
        })
        .notNullable();
      table.string('variant_key', 64);
      table.json('metadata');
      table.string('updated_by', 120);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table
        .timestamp('updated_at')
        .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
      table.unique(['flag_id', 'tenant_id', 'environment']);
      table.index(['tenant_id', 'environment']);
      table.index(['flag_id', 'environment']);
    });
  }

  if (knex.client.config.client === 'pg') {
    await knex.raw(onUpdateTrigger('feature_flag_tenant_states'));
  }
}

export async function down(knex) {
  const hasTable = await knex.schema.hasTable('feature_flag_tenant_states');
  if (hasTable) {
    await knex.schema.dropTable('feature_flag_tenant_states');
  }

  if (knex.client.config.client === 'pg') {
    await knex.raw('DROP TYPE IF EXISTS feature_flag_override_state;');
  }
}
