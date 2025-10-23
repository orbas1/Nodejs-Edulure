import { addTimestamps, ensureUpdatedAtTrigger, jsonDefault } from './_helpers/schema.js';

const LEAD_STATUSES = ['new', 'contacted', 'nurturing', 'converted'];

export async function up(knex) {
  const hasTable = await knex.schema.hasTable('marketing_leads');
  if (hasTable) {
    return;
  }

  await knex.schema.createTable('marketing_leads', (table) => {
    table.increments('id').primary();
    table.string('email', 180).notNullable();
    table.string('full_name', 200);
    table.string('company', 200);
    table.string('persona', 120);
    table.string('goal', 360);
    table.string('cta_source', 120);
    table.string('block_slug', 120);
    table
      .enum('status', LEAD_STATUSES, {
        useNative: false,
        enumName: 'marketing_lead_status_enum'
      })
      .notNullable()
      .defaultTo('new');
    table.json('metadata').notNullable().defaultTo(jsonDefault(knex, {}));
    addTimestamps(table, knex);
    table.index(['email'], 'marketing_leads_email_idx');
    table.index(['status'], 'marketing_leads_status_idx');
    table.index(['block_slug'], 'marketing_leads_block_slug_idx');
  });

  await ensureUpdatedAtTrigger(knex, 'marketing_leads');
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('marketing_leads');
}
