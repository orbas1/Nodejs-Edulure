const TABLE_NAME = 'feature_flag_tenant_states';

const OVERRIDE_STATE_ENUM = ['enabled', 'disabled', 'conditional'];

export async function up(knex) {
  const exists = await knex.schema.hasTable(TABLE_NAME);
  if (exists) {
    return;
  }

  await knex.schema.createTable(TABLE_NAME, (table) => {
    table.increments('id').primary();
    table
      .integer('flag_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('feature_flags')
      .onDelete('CASCADE');
    table.string('tenant_id', 64).notNullable();
    table.string('environment', 32).notNullable().defaultTo('production');
    table
      .enu('override_state', OVERRIDE_STATE_ENUM, {
        useNative: true,
        enumName: 'feature_flag_tenant_state'
      })
      .notNullable()
      .defaultTo('disabled');
    table.string('variant_key', 120);
    table.integer('priority').notNullable().defaultTo(0);
    table.json('metadata');
    table.string('updated_by', 120);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table
      .timestamp('updated_at')
      .notNullable()
      .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.unique(['tenant_id', 'flag_id', 'environment'], 'tenant_flag_env_unique');
    table.index(['override_state', 'environment'], 'tenant_flag_state_env_idx');
    table.index(['flag_id'], 'tenant_flag_flag_idx');
  });
}

export async function down(knex) {
  const exists = await knex.schema.hasTable(TABLE_NAME);
  if (!exists) {
    return;
  }

  await knex.schema.dropTable(TABLE_NAME);
}
