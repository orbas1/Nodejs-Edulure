import { jsonDefault } from './_helpers/schema.js';

function getDialect(knex) {
  return knex?.client?.config?.client ?? '';
}

async function indexExists(knex, tableName, indexName) {
  const dialect = getDialect(knex);
  if (dialect.includes('pg')) {
    const result = await knex.raw(
      `SELECT 1 FROM pg_indexes WHERE schemaname = current_schema() AND tablename = ? AND indexname = ?`,
      [tableName, indexName]
    );
    return Boolean(result.rows?.length);
  }
  if (dialect.includes('mysql')) {
    const [rows] = await knex.raw(`SHOW INDEX FROM ?? WHERE Key_name = ?`, [tableName, indexName]);
    return Array.isArray(rows) && rows.length > 0;
  }
  return false;
}

export async function up(knex) {
  await knex.transaction(async (trx) => {
    const threadTable = 'direct_message_threads';
    const participantTable = 'direct_message_participants';

    const hasThreads = await trx.schema.hasTable(threadTable);
    if (hasThreads) {
      const hasArchivedAt = await trx.schema.hasColumn(threadTable, 'archived_at');
      if (!hasArchivedAt) {
        await trx.schema.alterTable(threadTable, (table) => {
          table.timestamp('archived_at');
        });
      }

      const hasArchivedBy = await trx.schema.hasColumn(threadTable, 'archived_by');
      if (!hasArchivedBy) {
        await trx.schema.alterTable(threadTable, (table) => {
          table
            .integer('archived_by')
            .unsigned()
            .references('id')
            .inTable('users')
            .onDelete('SET NULL');
        });
      }

      const hasArchiveMeta = await trx.schema.hasColumn(threadTable, 'archive_metadata');
      if (!hasArchiveMeta) {
        await trx.schema.alterTable(threadTable, (table) => {
          table.json('archive_metadata').notNullable().defaultTo(jsonDefault(trx, '{}'));
        });
      }

      if (!(await indexExists(trx, threadTable, 'direct_message_threads_archived_idx'))) {
        await trx.schema.alterTable(threadTable, (table) => {
          table.index(['archived_at'], 'direct_message_threads_archived_idx');
        });
      }
    }

    const hasParticipants = await trx.schema.hasTable(participantTable);
    if (hasParticipants) {
      const hasParticipantArchived = await trx.schema.hasColumn(participantTable, 'archived_at');
      if (!hasParticipantArchived) {
        await trx.schema.alterTable(participantTable, (table) => {
          table.timestamp('archived_at');
        });
      }

      if (!(await indexExists(trx, participantTable, 'direct_message_participants_archive_idx'))) {
        await trx.schema.alterTable(participantTable, (table) => {
          table.index(['user_id', 'archived_at'], 'direct_message_participants_archive_idx');
        });
      }
    }
  });
}

export async function down(knex) {
  await knex.transaction(async (trx) => {
    const threadTable = 'direct_message_threads';
    const participantTable = 'direct_message_participants';

    const hasThreads = await trx.schema.hasTable(threadTable);
    if (hasThreads) {
      if (await trx.schema.hasColumn(threadTable, 'archive_metadata')) {
        await trx.schema.alterTable(threadTable, (table) => {
          table.dropColumn('archive_metadata');
        });
      }

      if (await trx.schema.hasColumn(threadTable, 'archived_by')) {
        await trx.schema.alterTable(threadTable, (table) => {
          table.dropColumn('archived_by');
        });
      }

      if (await trx.schema.hasColumn(threadTable, 'archived_at')) {
        await trx.schema.alterTable(threadTable, (table) => {
          table.dropIndex(['archived_at'], 'direct_message_threads_archived_idx');
          table.dropColumn('archived_at');
        });
      }
    }

    const hasParticipants = await trx.schema.hasTable(participantTable);
    if (hasParticipants) {
      if (await trx.schema.hasColumn(participantTable, 'archived_at')) {
        await trx.schema.alterTable(participantTable, (table) => {
          table.dropIndex(['user_id', 'archived_at'], 'direct_message_participants_archive_idx');
          table.dropColumn('archived_at');
        });
      }
    }
  });
}
