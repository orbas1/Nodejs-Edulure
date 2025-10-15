import db from '../config/database.js';

function parseJson(value, fallback = []) {
  if (!value) {
    return fallback;
  }

  if (typeof value === 'object') {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch (_error) {
    return fallback;
  }
}

function mapRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    integration: row.integration,
    reportDate: row.report_date,
    status: row.status,
    mismatchCount: Number(row.mismatch_count ?? 0),
    missingInPlatform: parseJson(row.missing_in_platform, []),
    missingInIntegration: parseJson(row.missing_in_integration, []),
    extraContext: parseJson(row.extra_context, {}),
    generatedAt: row.generated_at,
    correlationId: row.correlation_id
  };
}

function serialise(value) {
  if (value === undefined || value === null) {
    return null;
  }

  try {
    return JSON.stringify(value);
  } catch (_error) {
    return JSON.stringify({});
  }
}

export default class IntegrationReconciliationReportModel {
  static async create(report, connection = db) {
    const payload = {
      integration: report.integration,
      report_date: report.reportDate,
      status: report.status ?? 'completed',
      mismatch_count: report.mismatchCount ?? 0,
      missing_in_platform: serialise(report.missingInPlatform),
      missing_in_integration: serialise(report.missingInIntegration),
      extra_context: serialise(report.extraContext),
      correlation_id: report.correlationId
    };

    const [id] = await connection('integration_reconciliation_reports').insert(payload);
    const row = await connection('integration_reconciliation_reports').where({ id }).first();
    return mapRow(row);
  }

  static async latest(integration, connection = db) {
    const row = await connection('integration_reconciliation_reports')
      .where({ integration })
      .orderBy('generated_at', 'desc')
      .first();
    return mapRow(row);
  }

  static async list(integration, { limit = 10 } = {}, connection = db) {
    const rows = await connection('integration_reconciliation_reports')
      .where({ integration })
      .orderBy('generated_at', 'desc')
      .limit(limit);

    return rows.map((row) => mapRow(row));
  }
}
