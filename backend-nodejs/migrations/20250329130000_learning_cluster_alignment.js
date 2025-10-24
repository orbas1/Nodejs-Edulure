const CLUSTER_COLUMN = { name: 'cluster_key', length: 60, defaultValue: 'general' };

async function ensureClusterColumn(knex, tableName, { indexName }) {
  const hasTable = await knex.schema.hasTable(tableName);
  if (!hasTable) {
    return;
  }
  const hasColumn = await knex.schema.hasColumn(tableName, CLUSTER_COLUMN.name);
  if (hasColumn) {
    return;
  }
  await knex.schema.alterTable(tableName, (table) => {
    const column = table.string(CLUSTER_COLUMN.name, CLUSTER_COLUMN.length).notNullable().defaultTo(CLUSTER_COLUMN.defaultValue);
    if (indexName) {
      column.index(indexName);
    }
  });
}

async function dropClusterColumn(knex, tableName) {
  const hasTable = await knex.schema.hasTable(tableName);
  if (!hasTable) {
    return;
  }
  const hasColumn = await knex.schema.hasColumn(tableName, CLUSTER_COLUMN.name);
  if (!hasColumn) {
    return;
  }
  await knex.schema.alterTable(tableName, (table) => {
    table.dropColumn(CLUSTER_COLUMN.name);
  });
}

export async function up(knex) {
  await ensureClusterColumn(knex, 'content_assets', { indexName: 'idx_content_assets_cluster_key' });
  await ensureClusterColumn(knex, 'courses', { indexName: 'idx_courses_cluster_key' });
  await ensureClusterColumn(knex, 'live_classrooms', { indexName: 'idx_live_classrooms_cluster_key' });
}

export async function down(knex) {
  await dropClusterColumn(knex, 'live_classrooms');
  await dropClusterColumn(knex, 'courses');
  await dropClusterColumn(knex, 'content_assets');
}
