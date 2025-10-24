import { jsonDefault } from './_helpers/utils.js';

const DEFAULT_CHARSET = 'utf8mb4';
const DEFAULT_COLLATION = 'utf8mb4_unicode_ci';

const applyTableDefaults = (table) => {
  if (typeof table.engine === 'function') {
    table.engine('InnoDB');
  }

  if (typeof table.charset === 'function') {
    table.charset(DEFAULT_CHARSET);
  }

  if (typeof table.collate === 'function') {
    table.collate(DEFAULT_COLLATION);
  }
};

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
  const hasTable = await knex.schema.hasTable('environment_parity_snapshots');
  if (hasTable) {
    return;
  }

  await knex.schema.createTable('environment_parity_snapshots', (table) => {
    table.increments('id').primary();
    table.string('environment_name', 120).notNullable();
    table.string('environment_provider', 120).notNullable();
    table.string('environment_tier', 60);
    table.string('release_channel', 120);
    table.string('git_sha', 64);
    table.string('manifest_version', 120);
    table.string('manifest_hash', 128).notNullable();
    table.string('status', 32).notNullable().defaultTo('healthy');
    table.integer('mismatches_count').unsigned().notNullable().defaultTo(0);
    ensureJsonColumn(table, 'mismatches', knex, { defaultValue: [] });
    ensureJsonColumn(table, 'dependencies', knex, { defaultValue: [] });
    ensureJsonColumn(table, 'metadata', knex, { defaultValue: {} });
    table.timestamp('generated_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table
      .timestamp('updated_at')
      .notNullable()
      .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.index(['environment_name', 'environment_provider'], 'env_parity_snapshots_env_idx');
    table.index(['manifest_hash'], 'env_parity_snapshots_manifest_hash_idx');
    table.index(['status', 'generated_at'], 'env_parity_snapshots_status_generated_idx');

    applyTableDefaults(table);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('environment_parity_snapshots');
}

