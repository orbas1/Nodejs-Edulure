import {
  applyComplianceDomainSchema,
  rollbackComplianceDomainSchema
} from '../src/database/domains/compliance.js';

export async function up(knex) {
  await applyComplianceDomainSchema(knex);
}

export async function down(knex) {
  await rollbackComplianceDomainSchema(knex);
}
