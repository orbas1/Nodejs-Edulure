async function addColumnIfMissing(knex, tableName, columnName, definition) {
  const exists = await knex.schema.hasColumn(tableName, columnName);
  if (!exists) {
    await knex.schema.alterTable(tableName, (table) => {
      definition(table);
    });
  }
}

async function dropColumnIfExists(knex, tableName, columnName) {
  const exists = await knex.schema.hasColumn(tableName, columnName);
  if (exists) {
    await knex.schema.alterTable(tableName, (table) => {
      table.dropColumn(columnName);
    });
  }
}

export async function up(knex) {
  const hasCoursesTable = await knex.schema.hasTable('courses');
  if (hasCoursesTable) {
    await addColumnIfMissing(knex, 'courses', 'trailer_url', (table) =>
      table.string('trailer_url', 500).nullable()
    );
    await addColumnIfMissing(knex, 'courses', 'promo_video_url', (table) =>
      table.string('promo_video_url', 500).nullable()
    );
    await addColumnIfMissing(knex, 'courses', 'syllabus_url', (table) =>
      table.string('syllabus_url', 500).nullable()
    );
    await addColumnIfMissing(knex, 'courses', 'hero_image_url', (table) =>
      table.string('hero_image_url', 500).nullable()
    );
  }

  const hasEbooksTable = await knex.schema.hasTable('ebooks');
  if (hasEbooksTable) {
    await addColumnIfMissing(knex, 'ebooks', 'cover_image_url', (table) =>
      table.string('cover_image_url', 500).nullable()
    );
    await addColumnIfMissing(knex, 'ebooks', 'sample_download_url', (table) =>
      table.string('sample_download_url', 500).nullable()
    );
    await addColumnIfMissing(knex, 'ebooks', 'audiobook_url', (table) =>
      table.string('audiobook_url', 500).nullable()
    );
  }
}

export async function down(knex) {
  const hasCoursesTable = await knex.schema.hasTable('courses');
  if (hasCoursesTable) {
    await dropColumnIfExists(knex, 'courses', 'trailer_url');
    await dropColumnIfExists(knex, 'courses', 'promo_video_url');
    await dropColumnIfExists(knex, 'courses', 'syllabus_url');
    await dropColumnIfExists(knex, 'courses', 'hero_image_url');
  }

  const hasEbooksTable = await knex.schema.hasTable('ebooks');
  if (hasEbooksTable) {
    await dropColumnIfExists(knex, 'ebooks', 'cover_image_url');
    await dropColumnIfExists(knex, 'ebooks', 'sample_download_url');
    await dropColumnIfExists(knex, 'ebooks', 'audiobook_url');
  }
}
