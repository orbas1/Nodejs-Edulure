import {
  applyComplianceDomainSchema,
  TABLES
} from '../src/database/domains/compliance.js';

export async function up(knex) {
  await applyComplianceDomainSchema(knex);
}

export async function down(knex) {
  const hasArchives = await knex.schema.hasTable(TABLES.PARTITION_ARCHIVES);
  if (hasArchives) {
    await knex.schema.dropTable(TABLES.PARTITION_ARCHIVES);
  }

  const hasPolicies = await knex.schema.hasTable('data_partition_policies');
  if (hasPolicies) {
    await knex('data_partition_policies').update({ metadata: JSON.stringify({}) });
  }
}
