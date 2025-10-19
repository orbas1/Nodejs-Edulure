import {
  applyTelemetryDomainSchema,
  rollbackTelemetryDomainSchema
} from '../src/database/domains/telemetry.js';

export async function up(knex) {
  await applyTelemetryDomainSchema(knex);
}

export async function down(knex) {
  await rollbackTelemetryDomainSchema(knex);
}
