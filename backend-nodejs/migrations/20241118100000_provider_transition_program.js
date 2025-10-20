import { jsonDefault } from './_utils.js';

const ANNOUNCEMENTS_TABLE = 'provider_transition_announcements';
const RESOURCES_TABLE = 'provider_transition_resources';
const TIMELINE_TABLE = 'provider_transition_timeline_entries';
const ACKS_TABLE = 'provider_transition_acknowledgements';
const STATUS_TABLE = 'provider_transition_status_updates';

function timestampWithAutoUpdate(knex, table, column = 'updated_at') {
  table
    .timestamp(column)
    .notNullable()
    .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
}

export async function up(knex) {
  await knex.schema.createTable(ANNOUNCEMENTS_TABLE, (table) => {
    table.increments('id').primary();
    table.string('slug', 120).notNullable().unique();
    table.string('title', 200).notNullable();
    table.string('summary', 500).notNullable();
    table.text('body_markdown').notNullable();
    table.string('status', 40).notNullable().defaultTo('draft');
    table.timestamp('effective_from').notNullable();
    table.timestamp('effective_to').nullable();
    table.boolean('ack_required').notNullable().defaultTo(true);
    table.timestamp('ack_deadline').nullable();
    table.string('owner_email', 150).nullable();
    table.string('tenant_scope', 80).notNullable().defaultTo('global');
    table.json('metadata').defaultTo(jsonDefault(knex, {}));
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    timestampWithAutoUpdate(knex, table);
  });

  await knex.schema.createTable(RESOURCES_TABLE, (table) => {
    table.increments('id').primary();
    table
      .integer('announcement_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable(ANNOUNCEMENTS_TABLE)
      .onDelete('CASCADE');
    table.string('label', 160).notNullable();
    table.string('url', 500).notNullable();
    table.string('type', 60).notNullable().defaultTo('guide');
    table.string('locale', 12).notNullable().defaultTo('en');
    table.string('description', 300).nullable();
    table.integer('sort_order').notNullable().defaultTo(0);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    timestampWithAutoUpdate(knex, table);
    table.index(['announcement_id', 'sort_order'], `${RESOURCES_TABLE}_announcement_sort_idx`);
  });

  await knex.schema.createTable(TIMELINE_TABLE, (table) => {
    table.increments('id').primary();
    table
      .integer('announcement_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable(ANNOUNCEMENTS_TABLE)
      .onDelete('CASCADE');
    table.date('occurs_on').notNullable();
    table.string('headline', 200).notNullable();
    table.string('owner', 150).nullable();
    table.string('cta_label', 120).nullable();
    table.string('cta_url', 500).nullable();
    table.text('details_markdown').notNullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    timestampWithAutoUpdate(knex, table);
    table.index(['announcement_id', 'occurs_on'], `${TIMELINE_TABLE}_announcement_date_idx`);
  });

  await knex.schema.createTable(ACKS_TABLE, (table) => {
    table.increments('id').primary();
    table
      .integer('announcement_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable(ANNOUNCEMENTS_TABLE)
      .onDelete('CASCADE');
    table.string('provider_reference', 120).nullable();
    table.string('organisation_name', 200).notNullable();
    table.string('contact_name', 160).notNullable();
    table.string('contact_email', 160).notNullable();
    table.string('ack_method', 60).notNullable().defaultTo('portal');
    table.boolean('follow_up_required').notNullable().defaultTo(false);
    table.string('follow_up_notes', 500).nullable();
    table.json('metadata').defaultTo(jsonDefault(knex, {}));
    table.timestamp('acknowledged_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    timestampWithAutoUpdate(knex, table);
    table.unique(['announcement_id', 'contact_email'], `${ACKS_TABLE}_announcement_email_unique`);
    table.index(['announcement_id', 'acknowledged_at'], `${ACKS_TABLE}_announcement_ack_idx`);
  });

  await knex.schema.createTable(STATUS_TABLE, (table) => {
    table.increments('id').primary();
    table
      .integer('announcement_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable(ANNOUNCEMENTS_TABLE)
      .onDelete('CASCADE');
    table.string('provider_reference', 120).nullable();
    table.string('status_code', 80).notNullable();
    table.text('notes').nullable();
    table.timestamp('recorded_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    timestampWithAutoUpdate(knex, table);
    table.index(['announcement_id', 'status_code'], `${STATUS_TABLE}_announcement_status_idx`);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists(STATUS_TABLE);
  await knex.schema.dropTableIfExists(ACKS_TABLE);
  await knex.schema.dropTableIfExists(TIMELINE_TABLE);
  await knex.schema.dropTableIfExists(RESOURCES_TABLE);
  await knex.schema.dropTableIfExists(ANNOUNCEMENTS_TABLE);
}
