const LIBRARY_FORMATS = ['E-book', 'Audiobook', 'Guide', 'Workbook', 'Video', 'Podcast'];

const DIALECTS = {
  mysql: new Set(['mysql', 'mysql2']),
  postgres: new Set(['pg', 'postgres', 'postgresql'])
};

function getDialect(knex) {
  return knex?.client?.config?.client ?? 'mysql2';
}

function isMysql(knex) {
  return DIALECTS.mysql.has(getDialect(knex));
}

function isPostgres(knex) {
  return DIALECTS.postgres.has(getDialect(knex));
}

function normaliseRows(result) {
  if (!result) {
    return [];
  }

  if (Array.isArray(result)) {
    return result[0] ?? [];
  }

  if (typeof result === 'object' && result !== null && Array.isArray(result.rows)) {
    return result.rows;
  }

  return [];
}

async function constraintExists(knex, tableName, constraintName) {
  if (isMysql(knex)) {
    const rows = normaliseRows(
      await knex.raw(
        `SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND CONSTRAINT_NAME = ?`,
        [tableName, constraintName]
      )
    );
    return rows.length > 0;
  }

  if (isPostgres(knex)) {
    const rows = normaliseRows(
      await knex.raw(
        `SELECT 1 FROM information_schema.table_constraints WHERE table_schema = current_schema() AND table_name = ? AND constraint_name = ?`,
        [tableName, constraintName]
      )
    );
    return rows.length > 0;
  }

  return false;
}

async function addCheckConstraint(knex, tableName, constraintName, expression) {
  if (await constraintExists(knex, tableName, constraintName)) {
    return;
  }

  await knex.raw(`ALTER TABLE ?? ADD CONSTRAINT ?? CHECK (${expression})`, [tableName, constraintName]);
}

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
        table.json('tags').notNullable().defaultTo('[]');
        table.json('highlights').notNullable().defaultTo('[]');
        table.string('audio_url', 500);
        table.string('preview_url', 500);
        table.json('metadata').notNullable().defaultTo('{}');
        table.timestamp('created_at').notNullable().defaultTo(trx.fn.now());
        table
          .timestamp('updated_at')
          .notNullable()
          .defaultTo(trx.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
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
