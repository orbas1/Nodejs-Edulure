const DIALECTS = {
  mysql: new Set(['mysql', 'mysql2']),
  postgres: new Set(['pg', 'postgres', 'postgresql'])
};

function getDialect(knex) {
  return knex?.client?.config?.client ?? 'mysql2';
}

function isMysql(knex) {
  return DIALECTS.mysql.has(getDialect(knex));
}

function isPostgres(knex) {
  return DIALECTS.postgres.has(getDialect(knex));
}

async function mysqlColumnIncludesEscrow(knex) {
  const [rows] = await knex.raw("SHOW COLUMNS FROM `payment_intents` LIKE 'provider'");
  if (!rows || rows.length === 0) {
    return false;
  }

  return rows[0].Type?.includes("'escrow'") ?? false;
}

export async function up(knex) {
  const hasTable = await knex.schema.hasTable('payment_intents');
  if (!hasTable) {
    return;
  }

  if (isMysql(knex)) {
    const alreadySupportsEscrow = await mysqlColumnIncludesEscrow(knex);
    if (!alreadySupportsEscrow) {
      await knex.raw(
        "ALTER TABLE `payment_intents` MODIFY `provider` ENUM('stripe','paypal','escrow') NOT NULL"
      );
    }
    return;
  }

  if (isPostgres(knex)) {
    await knex.transaction(async (trx) => {
      await trx.raw("ALTER TYPE payment_intents_provider ADD VALUE IF NOT EXISTS 'escrow'");
    });
    return;
  }

  await knex.schema.alterTable('payment_intents', (table) => {
    table.enum('provider', ['stripe', 'paypal', 'escrow']).notNullable().alter();
  });
}

export async function down(knex) {
  const hasTable = await knex.schema.hasTable('payment_intents');
  if (!hasTable) {
    return;
  }

  await knex('payment_intents').where({ provider: 'escrow' }).update({ provider: 'stripe' });

  if (isMysql(knex)) {
    const alreadySupportsEscrow = await mysqlColumnIncludesEscrow(knex);
    if (alreadySupportsEscrow) {
      await knex.raw("ALTER TABLE `payment_intents` MODIFY `provider` ENUM('stripe','paypal') NOT NULL");
    }
    return;
  }

  if (isPostgres(knex)) {
    await knex.transaction(async (trx) => {
      await trx.raw('ALTER TYPE payment_intents_provider RENAME TO payment_intents_provider_old');
      await trx.raw("CREATE TYPE payment_intents_provider AS ENUM ('stripe','paypal')");
      await trx.raw(
        'ALTER TABLE payment_intents ALTER COLUMN provider TYPE payment_intents_provider USING provider::text::payment_intents_provider'
      );
      await trx.raw('DROP TYPE payment_intents_provider_old');
    });
    return;
  }

  await knex.schema.alterTable('payment_intents', (table) => {
    table.enum('provider', ['stripe', 'paypal']).notNullable().alter();
  });
}
