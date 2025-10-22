import { jsonDefault } from './_helpers/utils.js';
const JSON_EMPTY_OBJECT = (knex) => jsonDefault(knex, {});

export async function up(knex) {
  await knex.schema.createTable('integration_api_key_invites', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('(UUID())'));
    table.string('provider', 64).notNullable();
    table.string('environment', 32).notNullable().defaultTo('production');
    table.string('alias', 128).notNullable();
    table
      .integer('api_key_id')
      .unsigned()
      .references('id')
      .inTable('integration_api_keys')
      .onDelete('SET NULL');
    table.string('owner_email', 255).notNullable();
    table.string('requested_by', 255).notNullable();
    table.timestamp('requested_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('expires_at').notNullable();
    table.string('status', 32).notNullable().defaultTo('pending');
    table.string('token_hash', 128).notNullable().unique();
    table.integer('rotation_interval_days').unsigned().notNullable().defaultTo(90);
    table.timestamp('key_expires_at').nullable();
    table.timestamp('completed_at').nullable();
    table.string('completed_by', 255).nullable();
    table.timestamp('cancelled_at').nullable();
    table.string('cancelled_by', 255).nullable();
    table.timestamp('last_sent_at').nullable();
    table.integer('send_count').unsigned().notNullable().defaultTo(1);
    table.json('metadata').notNullable().defaultTo(JSON_EMPTY_OBJECT(knex));
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table
      .timestamp('updated_at')
      .notNullable()
      .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table.index(['provider', 'environment'], 'integration_api_key_invites_provider_environment_idx');
    table.index(['owner_email'], 'integration_api_key_invites_owner_idx');
    table.index(['status', 'expires_at'], 'integration_api_key_invites_status_expiry_idx');
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('integration_api_key_invites');
}
