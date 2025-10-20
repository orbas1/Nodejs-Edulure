export async function up(knex) {
  const hasCoursesTable = await knex.schema.hasTable('courses');
  if (hasCoursesTable) {
    await knex.schema.alterTable('courses', (table) => {
      table.string('trailer_url', 500).nullable();
      table.string('promo_video_url', 500).nullable();
      table.string('syllabus_url', 500).nullable();
      table.string('hero_image_url', 500).nullable();
    });
  }

  const hasEbooksTable = await knex.schema.hasTable('ebooks');
  if (hasEbooksTable) {
    await knex.schema.alterTable('ebooks', (table) => {
      table.string('cover_image_url', 500).nullable();
      table.string('sample_download_url', 500).nullable();
      table.string('audiobook_url', 500).nullable();
    });
  }
}

export async function down(knex) {
  const hasCoursesTable = await knex.schema.hasTable('courses');
  if (hasCoursesTable) {
    await knex.schema.alterTable('courses', (table) => {
      table.dropColumn('trailer_url');
      table.dropColumn('promo_video_url');
      table.dropColumn('syllabus_url');
      table.dropColumn('hero_image_url');
    });
  }

  const hasEbooksTable = await knex.schema.hasTable('ebooks');
  if (hasEbooksTable) {
    await knex.schema.alterTable('ebooks', (table) => {
      table.dropColumn('cover_image_url');
      table.dropColumn('sample_download_url');
      table.dropColumn('audiobook_url');
    });
  }
}
