export async function up(knex) {
  await knex.schema.alterTable('community_members', (table) => {
    table
      .enum('status', ['active', 'pending', 'banned', 'suspended', 'trial', 'trialing', 'complimentary'])
      .notNullable()
      .defaultTo('active')
      .alter();
  });
}

export async function down(knex) {
  await knex('community_members')
    .whereIn('status', ['trial', 'trialing', 'complimentary'])
    .update({ status: 'active' });

  await knex.schema.alterTable('community_members', (table) => {
    table
      .enum('status', ['active', 'pending', 'banned', 'suspended'])
      .notNullable()
      .defaultTo('active')
      .alter();
  });
}
