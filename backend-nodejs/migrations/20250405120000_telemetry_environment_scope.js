import { buildEnvironmentColumns, getEnvironmentDescriptor } from '../src/utils/environmentContext.js';

const DEFAULT_ENVIRONMENT_DESCRIPTOR = getEnvironmentDescriptor();
const DEFAULT_ENVIRONMENT_COLUMNS = buildEnvironmentColumns(DEFAULT_ENVIRONMENT_DESCRIPTOR);

function addEnvironmentColumns(knex, tableName, { indexName }) {
  return knex.schema.alterTable(tableName, (table) => {
    table
      .string('environment_key', 80)
      .notNullable()
      .defaultTo(DEFAULT_ENVIRONMENT_COLUMNS.environment_key);
    table
      .string('environment_name', 160)
      .notNullable()
      .defaultTo(DEFAULT_ENVIRONMENT_COLUMNS.environment_name);
    table
      .string('environment_tier', 60)
      .defaultTo(DEFAULT_ENVIRONMENT_COLUMNS.environment_tier);
    table
      .string('environment_region', 120)
      .defaultTo(DEFAULT_ENVIRONMENT_COLUMNS.environment_region);
    table
      .string('environment_workspace', 160)
      .defaultTo(DEFAULT_ENVIRONMENT_COLUMNS.environment_workspace ?? null);
    if (indexName) {
      table.index(['environment_key'], indexName);
    }
  });
}

function removeEnvironmentColumns(knex, tableName, { indexName }) {
  return knex.schema.alterTable(tableName, (table) => {
    if (indexName) {
      table.dropIndex(['environment_key'], indexName);
    }
    table.dropColumn('environment_key');
    table.dropColumn('environment_name');
    table.dropColumn('environment_tier');
    table.dropColumn('environment_region');
    table.dropColumn('environment_workspace');
  });
}

export async function up(knex) {
  await knex.transaction(async (trx) => {
    await addEnvironmentColumns(trx, 'telemetry_event_batches', {
      indexName: 'telemetry_event_batches_environment_idx'
    });
    await trx('telemetry_event_batches').update(DEFAULT_ENVIRONMENT_COLUMNS);

    await addEnvironmentColumns(trx, 'telemetry_events', {
      indexName: 'telemetry_events_environment_idx'
    });
    await trx('telemetry_events').update(DEFAULT_ENVIRONMENT_COLUMNS);

    await addEnvironmentColumns(trx, 'telemetry_consent_ledger', {
      indexName: 'telemetry_consent_environment_idx'
    });
    await trx('telemetry_consent_ledger').update(DEFAULT_ENVIRONMENT_COLUMNS);

    await addEnvironmentColumns(trx, 'telemetry_lineage_runs', {
      indexName: 'telemetry_lineage_environment_idx'
    });
    await trx('telemetry_lineage_runs').update(DEFAULT_ENVIRONMENT_COLUMNS);
  });
}

export async function down(knex) {
  await knex.transaction(async (trx) => {
    await removeEnvironmentColumns(trx, 'telemetry_lineage_runs', {
      indexName: 'telemetry_lineage_environment_idx'
    });
    await removeEnvironmentColumns(trx, 'telemetry_consent_ledger', {
      indexName: 'telemetry_consent_environment_idx'
    });
    await removeEnvironmentColumns(trx, 'telemetry_events', {
      indexName: 'telemetry_events_environment_idx'
    });
    await removeEnvironmentColumns(trx, 'telemetry_event_batches', {
      indexName: 'telemetry_event_batches_environment_idx'
    });
  });
}
