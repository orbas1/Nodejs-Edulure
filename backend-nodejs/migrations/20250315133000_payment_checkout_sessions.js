import { jsonDefault } from './_helpers/utils.js';

const TABLE = 'payment_checkout_sessions';

export async function up(knex) {
  const hasTable = await knex.schema.hasTable(TABLE);
  if (hasTable) {
    return;
  }

  await knex.schema.createTable(TABLE, (table) => {
    table.increments('id').primary();
    table.string('public_id', 64).notNullable();
    table.integer('user_id').unsigned().references('id').inTable('users').onDelete('SET NULL');
    table.string('entity_type', 60).notNullable();
    table.string('entity_id', 120).notNullable();
    table.string('currency', 3).notNullable();
    table.json('primary_item').notNullable().defaultTo(jsonDefault(knex, {}));
    table.json('addon_items').notNullable().defaultTo(jsonDefault(knex, []));
    table.json('upsell_descriptors').notNullable().defaultTo(jsonDefault(knex, []));
    table.json('context').notNullable().defaultTo(jsonDefault(knex, {}));
    table.json('metadata').notNullable().defaultTo(jsonDefault(knex, {}));
    table.integer('subtotal_cents').notNullable().defaultTo(0);
    table.integer('required_total_cents').notNullable().defaultTo(0);
    table.integer('optional_total_cents').notNullable().defaultTo(0);
    table.string('status', 40).notNullable().defaultTo('pending');
    table.timestamp('expires_at', { useTz: true }).nullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.alterTable(TABLE, (table) => {
    table.unique(['public_id'], 'payment_checkout_sessions_public_id_unique');
    table.index(['user_id'], 'payment_checkout_sessions_user_idx');
    table.index(['entity_type', 'entity_id'], 'payment_checkout_sessions_entity_idx');
    table.index(['status'], 'payment_checkout_sessions_status_idx');
    table.index(['created_at'], 'payment_checkout_sessions_created_at_idx');
  });
}

export async function down(knex) {
  const hasTable = await knex.schema.hasTable(TABLE);
  if (!hasTable) {
    return;
  }

  await knex.schema.dropTable(TABLE);
}
