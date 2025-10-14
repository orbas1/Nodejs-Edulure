export async function up(knex) {
  const hasEbooks = await knex.schema.hasTable('ebooks');
  if (!hasEbooks) {
    await knex.schema.createTable('ebooks', (table) => {
      table.increments('id').primary();
      table.uuid('public_id').notNullable().unique();
      table
        .integer('asset_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('content_assets')
        .onDelete('CASCADE');
      table.string('title', 250).notNullable();
      table.string('slug', 220).notNullable().unique();
      table.string('subtitle', 500);
      table.text('description');
      table.json('authors').notNullable().defaultTo(JSON.stringify([]));
      table.json('tags').notNullable().defaultTo(JSON.stringify([]));
      table.json('categories').notNullable().defaultTo(JSON.stringify([]));
      table.json('languages').notNullable().defaultTo(JSON.stringify(['en']));
      table.string('isbn', 32);
      table.integer('reading_time_minutes').unsigned().defaultTo(0);
      table.string('price_currency', 3).notNullable().defaultTo('USD');
      table.integer('price_amount').unsigned().notNullable().defaultTo(0);
      table.decimal('rating_average', 4, 2).notNullable().defaultTo(0);
      table.integer('rating_count').unsigned().notNullable().defaultTo(0);
      table.string('watermark_id', 120);
      table
        .enum('status', ['draft', 'review', 'published', 'archived'])
        .notNullable()
        .defaultTo('draft');
      table.boolean('is_public').notNullable().defaultTo(false);
      table.timestamp('release_at');
      table.json('metadata').notNullable().defaultTo('{}');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table
        .timestamp('updated_at')
        .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
      table.index(['status']);
      table.index(['release_at']);
    });
  }

  const hasChapters = await knex.schema.hasTable('ebook_chapters');
  if (!hasChapters) {
    await knex.schema.createTable('ebook_chapters', (table) => {
      table.increments('id').primary();
      table
        .integer('ebook_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('ebooks')
        .onDelete('CASCADE');
      table.string('title', 250).notNullable();
      table.string('slug', 220).notNullable();
      table.integer('position').unsigned().notNullable().defaultTo(0);
      table.integer('word_count').unsigned().defaultTo(0);
      table.text('summary');
      table.json('metadata').notNullable().defaultTo('{}');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table
        .timestamp('updated_at')
        .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
      table.unique(['ebook_id', 'slug']);
      table.index(['ebook_id', 'position']);
    });
  }

  const hasHighlights = await knex.schema.hasTable('ebook_highlights');
  if (!hasHighlights) {
    await knex.schema.createTable('ebook_highlights', (table) => {
      table.increments('id').primary();
      table
        .integer('ebook_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('ebooks')
        .onDelete('CASCADE');
      table
        .integer('chapter_id')
        .unsigned()
        .references('id')
        .inTable('ebook_chapters')
        .onDelete('SET NULL');
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE');
      table.string('highlight_color', 30).defaultTo('#F59E0B');
      table.string('location', 120).notNullable();
      table.text('text').notNullable();
      table.text('note');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.json('metadata').notNullable().defaultTo('{}');
      table.index(['ebook_id', 'user_id']);
    });
  }

  const hasBookmarks = await knex.schema.hasTable('ebook_bookmarks');
  if (!hasBookmarks) {
    await knex.schema.createTable('ebook_bookmarks', (table) => {
      table.increments('id').primary();
      table
        .integer('ebook_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('ebooks')
        .onDelete('CASCADE');
      table
        .integer('chapter_id')
        .unsigned()
        .references('id')
        .inTable('ebook_chapters')
        .onDelete('SET NULL');
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE');
      table.string('label', 200);
      table.string('location', 120).notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.json('metadata').notNullable().defaultTo('{}');
      table.unique(['ebook_id', 'user_id', 'location']);
    });
  }

  const hasReaderSettings = await knex.schema.hasTable('ebook_reader_settings');
  if (!hasReaderSettings) {
    await knex.schema.createTable('ebook_reader_settings', (table) => {
      table.increments('id').primary();
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE');
      table.enum('theme', ['light', 'dark', 'sepia']).notNullable().defaultTo('light');
      table.integer('font_size').unsigned().notNullable().defaultTo(16);
      table.decimal('line_height', 4, 2).notNullable().defaultTo(1.5);
      table.string('font_family', 80).notNullable().defaultTo('Inter');
      table.json('metadata').notNullable().defaultTo('{}');
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.unique(['user_id']);
    });
  }

  const hasWatermarkEvents = await knex.schema.hasTable('ebook_watermark_events');
  if (!hasWatermarkEvents) {
    await knex.schema.createTable('ebook_watermark_events', (table) => {
      table.increments('id').primary();
      table
        .integer('ebook_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('ebooks')
        .onDelete('CASCADE');
      table
        .integer('user_id')
        .unsigned()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL');
      table.string('download_reference', 120).notNullable();
      table.string('watermark_hash', 128).notNullable();
      table.timestamp('issued_at').defaultTo(knex.fn.now());
      table.json('metadata').notNullable().defaultTo('{}');
      table.unique(['ebook_id', 'download_reference']);
      table.index(['ebook_id']);
    });
  }
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('ebook_watermark_events');
  await knex.schema.dropTableIfExists('ebook_reader_settings');
  await knex.schema.dropTableIfExists('ebook_bookmarks');
  await knex.schema.dropTableIfExists('ebook_highlights');
  await knex.schema.dropTableIfExists('ebook_chapters');
  await knex.schema.dropTableIfExists('ebooks');
}
