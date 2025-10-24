import { addTimestamps, ensureUpdatedAtTrigger, jsonDefault } from './_helpers/schema.js';

export async function up(knex) {
  const hasTable = await knex.schema.hasTable('user_role_assignments');
  if (!hasTable) {
    await knex.schema.createTable('user_role_assignments', (table) => {
      table.increments('id').primary();
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE');
      table.string('role_key', 100).notNullable();
      table.string('scope_type', 60).notNullable().defaultTo('global');
      table.string('scope_id', 120).nullable();
      table
        .integer('assigned_by')
        .unsigned()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL');
      table.timestamp('assigned_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('expires_at').nullable();
      table.json('metadata').notNullable().defaultTo(jsonDefault(knex, {}));
      table.timestamp('revoked_at').nullable();
      table
        .integer('revoked_by')
        .unsigned()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL');
      table.string('revoked_reason', 160);
      addTimestamps(table, knex);
      table.unique(
        ['user_id', 'role_key', 'scope_type', 'scope_id', 'revoked_at'],
        'user_role_assignments_unique_active'
      );
      table.index(['user_id', 'role_key'], 'user_role_assignments_user_role_idx');
      table.index(['scope_type', 'scope_id'], 'user_role_assignments_scope_idx');
      table.index(['expires_at'], 'user_role_assignments_expires_idx');
    });
    await ensureUpdatedAtTrigger(knex, 'user_role_assignments');
  }
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('user_role_assignments');
}
