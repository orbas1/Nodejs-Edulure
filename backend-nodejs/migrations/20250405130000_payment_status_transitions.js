import { jsonDefault } from './_helpers/utils.js';

const STATUSES = [
  'requires_payment_method',
  'requires_confirmation',
  'requires_action',
  'requires_capture',
  'processing',
  'succeeded',
  'canceled',
  'failed',
  'refunded',
  'partially_refunded'
];

async function ensureStatusEnumIncludesCapture(knex) {
  const client = knex.client.config.client;
  if (client && client.includes('pg')) {
    await knex.raw("ALTER TYPE payment_intents_status ADD VALUE IF NOT EXISTS 'requires_capture'");
    return;
  }

  if (client && client.includes('postgres')) {
    await knex.raw("ALTER TYPE payment_intents_status ADD VALUE IF NOT EXISTS 'requires_capture'");
    return;
  }

  if (client && client.includes('mysql')) {
    const values = STATUSES.map((status) => `'${status}'`).join(',');
    await knex.raw(
      `ALTER TABLE \`payment_intents\` MODIFY COLUMN \`status\` ENUM(${values}) NOT NULL DEFAULT 'requires_payment_method'`
    );
    return;
  }

  // Fallback to generic alter that works for mysql2 dialect naming
  const values = STATUSES.map((status) => `'${status}'`).join(',');
  await knex.raw(
    `ALTER TABLE payment_intents MODIFY COLUMN status ENUM(${values}) NOT NULL DEFAULT 'requires_payment_method'`
  );
}

async function revertStatusEnum(knex) {
  const baseStatuses = STATUSES.filter((status) => status !== 'requires_capture');
  const client = knex.client.config.client;

  if (client && client.includes('pg')) {
    await knex.raw('ALTER TYPE payment_intents_status RENAME TO payment_intents_status_old');
    await knex.raw(
      `CREATE TYPE payment_intents_status AS ENUM (${baseStatuses.map((status) => `'${status}'`).join(',')})`
    );
    await knex.raw(
      'ALTER TABLE payment_intents ALTER COLUMN status TYPE payment_intents_status USING status::text::payment_intents_status'
    );
    await knex.raw('DROP TYPE payment_intents_status_old');
    return;
  }

  if (client && client.includes('postgres')) {
    await knex.raw('ALTER TYPE payment_intents_status RENAME TO payment_intents_status_old');
    await knex.raw(
      `CREATE TYPE payment_intents_status AS ENUM (${baseStatuses.map((status) => `'${status}'`).join(',')})`
    );
    await knex.raw(
      'ALTER TABLE payment_intents ALTER COLUMN status TYPE payment_intents_status USING status::text::payment_intents_status'
    );
    await knex.raw('DROP TYPE payment_intents_status_old');
    return;
  }

  const values = baseStatuses.map((status) => `'${status}'`).join(',');
  if (client && client.includes('mysql')) {
    await knex.raw(
      `ALTER TABLE \`payment_intents\` MODIFY COLUMN \`status\` ENUM(${values}) NOT NULL DEFAULT 'requires_payment_method'`
    );
    return;
  }

  await knex.raw(
    `ALTER TABLE payment_intents MODIFY COLUMN status ENUM(${values}) NOT NULL DEFAULT 'requires_payment_method'`
  );
}

export async function up(knex) {
  await ensureStatusEnumIncludesCapture(knex);

  const hasTable = await knex.schema.hasTable('payment_intent_status_transitions');
  if (!hasTable) {
    await knex.schema.createTable('payment_intent_status_transitions', (table) => {
      table.increments('id').primary();
      table
        .integer('payment_intent_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('payment_intents')
        .onDelete('CASCADE');
      table
        .enum('from_status', STATUSES)
        .notNullable()
        .defaultTo('requires_payment_method');
      table.enum('to_status', STATUSES).notNullable();
      table
        .integer('changed_by')
        .unsigned()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL');
      table.string('reason', 200);
      table.json('metadata').notNullable().defaultTo(jsonDefault(knex, {}));
      table.timestamp('changed_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.index(['payment_intent_id', 'changed_at'], 'payment_intent_transitions_intent_at_idx');
      table.index(['to_status', 'changed_at'], 'payment_intent_transitions_status_at_idx');
    });
  }
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('payment_intent_status_transitions');
  await revertStatusEnum(knex);
}
