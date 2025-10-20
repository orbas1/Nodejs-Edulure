import {
  addCheckConstraint,
  addTimestamps,
  ensureUpdatedAtTrigger,
  jsonDefault
} from './_helpers/schema.js';

const LIBRARY_FORMATS = ['E-book', 'Audiobook', 'Guide', 'Workbook', 'Video', 'Podcast'];

export async function up(knex) {
  const formatList = LIBRARY_FORMATS.map((format) => `'${format.replace(/'/g, "''")}'`).join(', ');

  await knex.transaction(async (trx) => {
    const hasLibraryEntries = await trx.schema.hasTable('learner_library_entries');
    if (!hasLibraryEntries) {
      await trx.schema.createTable('learner_library_entries', (table) => {
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
        table.json('tags').notNullable().defaultTo(jsonDefault(trx, '[]'));
        table.json('highlights').notNullable().defaultTo(jsonDefault(trx, '[]'));
        table.string('audio_url', 500);
        table.string('preview_url', 500);
        table.json('metadata').notNullable().defaultTo(jsonDefault(trx, '{}'));
        addTimestamps(table, trx);
        table.index(['user_id'], 'learner_library_entries_user_idx');
        table.index(['user_id', 'format'], 'learner_library_entries_format_idx');
      });

      await addCheckConstraint(
        trx,
        'learner_library_entries',
        'learner_library_entries_progress_chk',
        'progress >= 0 AND progress <= 100'
      );
      await addCheckConstraint(
        trx,
        'learner_library_entries',
        'learner_library_entries_format_chk',
        `format IN (${formatList})`
      );
      await ensureUpdatedAtTrigger(trx, 'learner_library_entries');
    }

    const tableStillExists = hasLibraryEntries || (await trx.schema.hasTable('learner_library_entries'));
    if (tableStillExists) {
      await trx('learner_library_entries')
        .whereNotIn('format', LIBRARY_FORMATS)
        .update({ format: 'E-book' });
    }
  });
}

export async function down(knex) {
  await knex.transaction(async (trx) => {
    await trx.schema.dropTableIfExists('learner_library_entries');
  });
}
