export async function up(knex) {
  const hasTable = await knex.schema.hasTable('payment_intents');
  if (!hasTable) {
    return;
  }

  const client = knex?.client?.config?.client ?? 'mysql2';
  const isMySql = ['mysql', 'mysql2'].includes(client);

  if (isMySql) {
    await knex.raw(
      "ALTER TABLE `payment_intents` MODIFY `provider` ENUM('stripe','paypal','escrow') NOT NULL"
    );
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

  const client = knex?.client?.config?.client ?? 'mysql2';
  const isMySql = ['mysql', 'mysql2'].includes(client);

  if (isMySql) {
    await knex.raw("ALTER TABLE `payment_intents` MODIFY `provider` ENUM('stripe','paypal') NOT NULL");
    return;
  }

  await knex.schema.alterTable('payment_intents', (table) => {
    table.enum('provider', ['stripe', 'paypal']).notNullable().alter();
  });
}
