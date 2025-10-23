import { jsonDefault } from './_helpers/utils.js';

const DASHBOARD_PREFERENCES_DEFAULT = Object.freeze({ pinnedNavigation: [] });

async function ensureColumn(knex, column, builder) {
  const hasColumn = await knex.schema.hasColumn('users', column);
  if (!hasColumn) {
    await knex.schema.table('users', builder);
  }
}

export async function up(knex) {
  await ensureColumn(knex, 'dashboard_preferences', (table) => {
    table.json('dashboard_preferences').notNullable().defaultTo(jsonDefault(knex, DASHBOARD_PREFERENCES_DEFAULT));
  });

  await ensureColumn(knex, 'unread_community_count', (table) => {
    table.integer('unread_community_count').unsigned().notNullable().defaultTo(0);
  });

  await ensureColumn(knex, 'pending_payouts', (table) => {
    table.integer('pending_payouts').unsigned().notNullable().defaultTo(0);
  });

  const hasActiveLiveRoom = await knex.schema.hasColumn('users', 'active_live_room');
  if (!hasActiveLiveRoom) {
    await knex.schema.table('users', (table) => {
      table.json('active_live_room').nullable();
    });
  }

  // Normalise existing rows so newly added columns never return nulls to the application layer.
  await knex('users')
    .whereNull('dashboard_preferences')
    .update({ dashboard_preferences: JSON.stringify(DASHBOARD_PREFERENCES_DEFAULT) });

  await knex('users')
    .whereNull('unread_community_count')
    .update({ unread_community_count: 0 });

  await knex('users')
    .whereNull('pending_payouts')
    .update({ pending_payouts: 0 });
}

export async function down(knex) {
  const client = knex?.client?.config?.client ?? '';
  if (typeof client === 'string' && client.toLowerCase().includes('sqlite')) {
    // Skip column drops for sqlite; the dev database uses a clean reset.
    return;
  }

  await knex.schema.table('users', (table) => {
    table.dropColumn('active_live_room');
    table.dropColumn('pending_payouts');
    table.dropColumn('unread_community_count');
    table.dropColumn('dashboard_preferences');
  });
}
