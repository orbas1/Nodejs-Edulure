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
  const hasTable = await knex.schema.hasTable('environment_descriptors');
  if (hasTable) {
    return;
  }

  await knex.schema.createTable('environment_descriptors', (table) => {
    table.increments('id').primary();
    table.string('environment_name', 120).notNullable();
    table.string('domain', 255).nullable();
    table.string('aws_account_alias', 160).nullable();
    table.string('aws_region', 80).nullable();
    table.string('aws_vpc_id', 160).nullable();
    ensureJsonColumn(table, 'aws_private_subnet_tags', knex, { defaultValue: [] });
    ensureJsonColumn(table, 'aws_public_subnet_tags', knex, { defaultValue: [] });
    table.string('blueprint_parameter', 255).nullable();
    table.string('blueprint_runtime_endpoint', 255).nullable();
    table.string('blueprint_service_name', 160).nullable();
    table.string('terraform_workspace', 255).nullable();
    table.string('docker_compose_file', 255).nullable();
    table.string('docker_compose_command', 255).nullable();
    ensureJsonColumn(table, 'docker_compose_profiles', knex, { defaultValue: [] });
    table.string('observability_dashboard_path', 255).nullable();
    table.string('observability_cloudwatch_dashboard', 255).nullable();
    table.string('contacts_primary', 255).nullable();
    table.string('contacts_on_call', 255).nullable();
    ensureJsonColumn(table, 'contacts_additional', knex, { defaultValue: [] });
    ensureJsonColumn(table, 'change_windows', knex, { defaultValue: [] });
    ensureJsonColumn(table, 'notes', knex, { defaultValue: [] });
    ensureJsonColumn(table, 'metadata', knex, { defaultValue: {} });
    table.timestamp('recorded_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(updatedAtDefault(knex));

    table.unique(['environment_name'], 'environment_descriptors_unique');
    table.index(['aws_region'], 'environment_descriptors_region_idx');
    table.index(['blueprint_service_name'], 'environment_descriptors_service_idx');

    applyTableDefaults(table);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('environment_descriptors');
}
