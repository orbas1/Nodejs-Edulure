export async function up(knex) {
  await knex.schema.createTable('user_two_factor_challenges', (table) => {
    table.increments('id').primary();
    table
      .integer('user_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');
    table.string('token_hash', 128).notNullable();
    table.string('delivery_channel', 32).notNullable().defaultTo('email');
    table.integer('attempt_count').notNullable().defaultTo(0);
    table.timestamp('expires_at').notNullable();
    table.timestamp('consumed_at').nullable();
    table.string('consumed_reason', 64).nullable();
    table.timestamps(true, true);

    table.index(['user_id', 'expires_at'], 'user_two_factor_challenges_user_expiry_idx');
    table.index(['token_hash', 'expires_at'], 'user_two_factor_challenges_hash_idx');
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('user_two_factor_challenges');
}
