import { jsonDefault } from './_helpers/utils.js';

const TABLES = Object.freeze({
  passkeys: 'user_passkeys',
  challenges: 'user_passkey_challenges',
  magicLinks: 'user_magic_links'
});

function applyTableDefaults(table) {
  if (typeof table.engine === 'function') {
    table.engine('InnoDB');
  }
  if (typeof table.charset === 'function') {
    table.charset('utf8mb4');
  }
  if (typeof table.collate === 'function') {
    table.collate('utf8mb4_unicode_ci');
  }
}

function ensureJsonColumn(table, column, knex, { nullable = false, defaultValue = {} } = {}) {
  const col = table.json(column);
  if (nullable) {
    col.nullable();
  } else {
    col.notNullable();
  }
  if (defaultValue !== undefined) {
    col.defaultTo(jsonDefault(knex, defaultValue));
  }
  return col;
}

export async function up(knex) {
  const hasPasskeys = await knex.schema.hasTable(TABLES.passkeys);
  if (!hasPasskeys) {
    await knex.schema.createTable(TABLES.passkeys, (table) => {
      table.increments('id').primary();
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE');
      table.string('credential_id', 255).notNullable().unique('uniq_user_passkeys_credential');
      table.binary('credential_public_key').notNullable();
      table.bigint('signature_counter').unsigned().notNullable().defaultTo(0);
      table.string('friendly_name', 120);
      table.string('credential_device_type', 60);
      table.boolean('credential_backed_up').notNullable().defaultTo(false);
      ensureJsonColumn(table, 'transports', knex, { nullable: true, defaultValue: [] });
      ensureJsonColumn(table, 'metadata', knex, { nullable: true });
      table.timestamp('last_used_at');
      table.timestamp('revoked_at');
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table
        .timestamp('updated_at')
        .notNullable()
        .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
      table.index(['user_id'], 'idx_user_passkeys_user_id');
      table.index(['created_at'], 'idx_user_passkeys_created_at');
      table.index(['revoked_at'], 'idx_user_passkeys_revoked_at');
      applyTableDefaults(table);
    });
  }

  const hasChallenges = await knex.schema.hasTable(TABLES.challenges);
  if (!hasChallenges) {
    await knex.schema.createTable(TABLES.challenges, (table) => {
      table.string('request_id', 64).primary();
      table
        .integer('user_id')
        .unsigned()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL');
      table.string('email', 255);
      table.enum('type', ['registration', 'authentication']).notNullable();
      table.binary('challenge').notNullable();
      ensureJsonColumn(table, 'options_snapshot', knex, { nullable: false });
      ensureJsonColumn(table, 'metadata', knex, { nullable: true });
      table.timestamp('expires_at').notNullable();
      table.timestamp('consumed_at');
      table.string('consumed_reason', 120);
      table.string('consumed_ip', 64);
      table.string('consumed_user_agent', 255);
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.index(['user_id'], 'idx_user_passkey_challenges_user_id');
      table.index(['email'], 'idx_user_passkey_challenges_email');
      table.index(['expires_at'], 'idx_user_passkey_challenges_expires_at');
      applyTableDefaults(table);
    });
  }

  const hasMagicLinks = await knex.schema.hasTable(TABLES.magicLinks);
  if (!hasMagicLinks) {
    await knex.schema.createTable(TABLES.magicLinks, (table) => {
      table.increments('id').primary();
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE');
      table.string('email', 255).notNullable();
      table.string('token_hash', 128).notNullable().unique('uniq_user_magic_links_token');
      table.string('redirect_to', 500);
      ensureJsonColumn(table, 'metadata', knex, { nullable: true });
      table.timestamp('expires_at').notNullable();
      table.timestamp('consumed_at');
      table.string('consumed_ip', 64);
      table.string('consumed_user_agent', 255);
      table.string('consumed_reason', 120);
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table
        .timestamp('updated_at')
        .notNullable()
        .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
      table.index(['user_id'], 'idx_user_magic_links_user_id');
      table.index(['email'], 'idx_user_magic_links_email');
      table.index(['expires_at'], 'idx_user_magic_links_expires_at');
      table.index(['consumed_at'], 'idx_user_magic_links_consumed_at');
      applyTableDefaults(table);
    });
  }
}

export async function down(knex) {
  await knex.schema.dropTableIfExists(TABLES.magicLinks);
  await knex.schema.dropTableIfExists(TABLES.challenges);
  await knex.schema.dropTableIfExists(TABLES.passkeys);
}
