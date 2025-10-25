import { constraintExists } from './_helpers/schema.js';

async function dedupe(trx, tableName, columns) {
  const partitionPlaceholders = columns.map(() => '??').join(', ');
  await trx.raw(
    `DELETE FROM ?? WHERE id IN (
      SELECT id
      FROM (
        SELECT id, ROW_NUMBER() OVER (PARTITION BY ${partitionPlaceholders} ORDER BY id) AS row_num
        FROM ??
      ) ranked
      WHERE row_num > 1
    )`,
    [tableName, ...columns, tableName]
  );
}

async function ensureUnique(trx, tableName, columns, constraintName) {
  if (await constraintExists(trx, tableName, constraintName)) {
    return;
  }
  try {
    await trx.schema.alterTable(tableName, (table) => {
      table.unique(columns, constraintName);
    });
  } catch (error) {
    const message = String(error?.message ?? '').toLowerCase();
    const code = String(error?.code ?? '').toLowerCase();
    if (
      !message.includes('already exists') &&
      !message.includes('duplicate') &&
      !code.includes('er_dup_key')
    ) {
      throw error;
    }
  }
}

export async function up(knex) {
  await knex.transaction(async (trx) => {
    const postTable = 'community_post_reactions';
    const messageTable = 'community_message_reactions';

    const hasPostTable = await trx.schema.hasTable(postTable);
    if (hasPostTable) {
      await dedupe(trx, postTable, ['post_id', 'user_id', 'reaction']);
      await ensureUnique(trx, postTable, ['post_id', 'user_id', 'reaction'], 'community_post_reactions_unique');
    }

    const hasMessageTable = await trx.schema.hasTable(messageTable);
    if (hasMessageTable) {
      await dedupe(trx, messageTable, ['message_id', 'user_id', 'emoji']);
      await ensureUnique(trx, messageTable, ['message_id', 'user_id', 'emoji'], 'community_message_reactions_unique');
    }
  });
}

export async function down(knex) {
  await knex.transaction(async (trx) => {
    const postTable = 'community_post_reactions';
    const messageTable = 'community_message_reactions';

    if (await constraintExists(trx, postTable, 'community_post_reactions_unique')) {
      await trx.schema.alterTable(postTable, (table) => {
        table.dropUnique(['post_id', 'user_id', 'reaction'], 'community_post_reactions_unique');
      });
    }

    if (await constraintExists(trx, messageTable, 'community_message_reactions_unique')) {
      await trx.schema.alterTable(messageTable, (table) => {
        table.dropUnique(['message_id', 'user_id', 'emoji'], 'community_message_reactions_unique');
      });
    }
  });
}
