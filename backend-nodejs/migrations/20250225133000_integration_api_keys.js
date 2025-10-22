import { jsonDefault } from './_helpers/utils.js';
const JSON_EMPTY_OBJECT = (knex) => jsonDefault(knex, {});

export async function up(knex) {
  await knex.schema.createTable('integration_api_keys', (table) => {
    table.increments('id').primary();
    table.string('provider', 64).notNullable();
    table.string('environment', 32).notNullable().defaultTo('production');
    table.string('alias', 128).notNullable();
    table.string('owner_email', 255).notNullable();
    table.string('last_four', 8).notNullable();
    table.string('key_hash', 128).notNullable();
    table.binary('encrypted_key').notNullable();
    table.string('encryption_key_id', 64).notNullable();
    table.string('classification_tag', 64).notNullable();
    table.integer('rotation_interval_days').unsigned().notNullable().defaultTo(90);
    table.timestamp('last_rotated_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('next_rotation_at').nullable();
    table.timestamp('expires_at').nullable();
    table.timestamp('disabled_at').nullable();
    table.string('status', 24).notNullable().defaultTo('active');
    table.json('metadata').notNullable().defaultTo(JSON_EMPTY_OBJECT(knex));
    table.string('created_by', 128).notNullable();
    table.string('updated_by', 128).nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table
      .timestamp('updated_at')
      .notNullable()
      .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.unique(['provider', 'environment', 'alias'], 'integration_api_keys_alias_unique');
    table.index(['provider', 'environment'], 'integration_api_keys_provider_env_idx');
    table.index(['status', 'next_rotation_at'], 'integration_api_keys_rotation_idx');
    table.index(['owner_email'], 'integration_api_keys_owner_idx');
    table.index(['key_hash'], 'integration_api_keys_hash_idx');
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('integration_api_keys');
}
