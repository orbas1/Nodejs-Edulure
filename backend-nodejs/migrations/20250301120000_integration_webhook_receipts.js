export async function up(knex) {
  await knex.schema.createTable('integration_webhook_receipts', (table) => {
    table.increments('id').primary();
    table.string('provider', 64).notNullable();
    table.string('external_event_id', 255).notNullable();
    table.string('signature', 255).nullable();
    table.string('payload_hash', 128).notNullable();
    table.json('metadata').nullable();
    table.string('status', 32).notNullable().defaultTo('received');
    table.text('error_message').nullable();
    table.timestamp('received_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('processed_at').nullable();
    table.timestamps(true, true);
    table.unique(['provider', 'external_event_id'], 'integration_webhook_receipts_provider_event_unique');
    table.index(['provider', 'received_at'], 'integration_webhook_receipts_provider_received_idx');
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('integration_webhook_receipts');
}
