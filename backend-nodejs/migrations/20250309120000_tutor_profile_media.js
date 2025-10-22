export async function up(knex) {
  const hasAvatar = await knex.schema.hasColumn('tutor_profiles', 'avatar_url');
  if (!hasAvatar) {
    await knex.schema.alterTable('tutor_profiles', (table) => {
      table.string('avatar_url', 500).nullable();
    });
  }

  const hasBanner = await knex.schema.hasColumn('tutor_profiles', 'banner_url');
  if (!hasBanner) {
    await knex.schema.alterTable('tutor_profiles', (table) => {
      table.string('banner_url', 500).nullable();
    });
  }
}

export async function down(knex) {
  const hasTable = await knex.schema.hasTable('tutor_profiles');
  if (!hasTable) {
    return;
  }

  if (await knex.schema.hasColumn('tutor_profiles', 'avatar_url')) {
    await knex.schema.alterTable('tutor_profiles', (table) => {
      table.dropColumn('avatar_url');
    });
  }

  if (await knex.schema.hasColumn('tutor_profiles', 'banner_url')) {
    await knex.schema.alterTable('tutor_profiles', (table) => {
      table.dropColumn('banner_url');
    });
  }
}
