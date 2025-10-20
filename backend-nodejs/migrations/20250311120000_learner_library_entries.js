const LIBRARY_FORMATS = ['E-book', 'Audiobook', 'Guide', 'Workbook', 'Video', 'Podcast'];

export async function up(knex) {
  const hasLibraryEntries = await knex.schema.hasTable('learner_library_entries');
  if (!hasLibraryEntries) {
    await knex.schema.createTable('learner_library_entries', (table) => {
      table.increments('id').primary();
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE');
      table
        .integer('asset_id')
        .unsigned()
        .references('id')
        .inTable('content_assets')
        .onDelete('SET NULL');
      table.string('title', 240).notNullable();
      table.string('format', 80).notNullable().defaultTo('E-book');
      table.decimal('progress', 5, 2).notNullable().defaultTo(0);
      table.timestamp('last_opened');
      table.string('url', 500);
      table.text('summary');
      table.string('author', 180);
      table.string('cover_url', 500);
      table.json('tags').notNullable().defaultTo('[]');
      table.json('highlights').notNullable().defaultTo('[]');
      table.string('audio_url', 500);
      table.string('preview_url', 500);
      table.json('metadata').notNullable().defaultTo('{}');
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table
        .timestamp('updated_at')
        .notNullable()
        .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
      table.index(['user_id'], 'learner_library_entries_user_idx');
      table.index(['user_id', 'format'], 'learner_library_entries_format_idx');
    });
  }

  // Ensure legacy formats are normalised
  await knex('learner_library_entries')
    .whereNotIn('format', LIBRARY_FORMATS)
    .update({ format: 'E-book' })
    .catch(() => undefined);
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('learner_library_entries');
}
