import { applyTableDefaults, updatedAtDefault } from './_helpers/tableDefaults.js';
import { jsonDefault } from './_helpers/utils.js';

const ensureJsonColumn = (table, columnName, knex, { nullable = false, defaultValue = {} } = {}) => {
  const column = table.specificType(columnName, 'json');

  if (nullable) {
    column.nullable();
  } else {
    column.notNullable();
  }

  column.defaultTo(jsonDefault(knex, defaultValue));
  return column;
};

export async function up(knex) {
  const hasTable = await knex.schema.hasTable('environment_blueprints');
  if (hasTable) {
    return;
  }

  await knex.schema.createTable('environment_blueprints', (table) => {
    table.increments('id').primary();
    table.string('blueprint_key', 120).notNullable();
    table.string('environment_name', 120).notNullable();
    table.string('environment_provider', 120).notNullable();
    table.string('service_name', 160).notNullable();
    table.string('blueprint_version', 40).notNullable();
    table.string('blueprint_hash', 128).notNullable();
    table.string('module_path', 255).notNullable();
    table.string('module_hash', 128).notNullable();
    table.string('ssm_parameter_name', 255).notNullable();
    table.string('runtime_endpoint', 255).notNullable();
    table.string('observability_dashboard_path', 255).notNullable();
    table.string('observability_dashboard_hash', 128).notNullable();
    ensureJsonColumn(table, 'alarm_outputs', knex, { defaultValue: [] });
    ensureJsonColumn(table, 'metadata', knex, { defaultValue: {} });
    table.timestamp('recorded_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(updatedAtDefault(knex));

    table.unique(['blueprint_key', 'environment_name'], 'environment_blueprints_registry_unique');
    table.index(['service_name', 'environment_name'], 'environment_blueprints_service_env_idx');
    table.index(['environment_provider'], 'environment_blueprints_provider_idx');

    applyTableDefaults(table);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('environment_blueprints');
}
