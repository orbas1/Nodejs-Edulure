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

function jsonDefault(knex, fallback = '{}') {
  if (isPostgres(knex)) {
    return knex.raw('?::jsonb', [fallback]);
  }

  if (isMysql(knex)) {
    return knex.raw('CAST(? AS JSON)', [fallback]);
  }

  return knex.raw('?', [fallback]);
}

async function ensureUpdatedAtTrigger(knex, tableName) {
  if (isMysql(knex)) {
    await knex.raw(
      `ALTER TABLE ?? MODIFY COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`,
      [tableName]
    );
    return;
  }

  if (isPostgres(knex)) {
    await knex.raw(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'set_updated_at_timestamp') THEN
          CREATE FUNCTION set_updated_at_timestamp() RETURNS trigger AS $$
          BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
          END;
          $$ LANGUAGE plpgsql;
        END IF;
      END;
      $$;
    `);

    const triggerName = `${tableName}_updated_at_trg`;

    await knex.raw(
      `
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1
            FROM pg_trigger
            WHERE tgname = '${triggerName}'
          ) THEN
            CREATE TRIGGER "${triggerName}"
            BEFORE UPDATE ON "${tableName}"
            FOR EACH ROW
            EXECUTE FUNCTION set_updated_at_timestamp();
          END IF;
        END;
        $$;
      `
    );
  }
}

function addTimestamps(table, context) {
  table.timestamp('created_at').notNullable().defaultTo(context.fn.now());
  table.timestamp('updated_at').notNullable().defaultTo(context.fn.now());
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
