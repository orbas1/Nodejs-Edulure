import db from '../config/database.js';

const TABLE = 'qa_test_suite_runs';

const BASE_COLUMNS = [
  'id',
  'suite_id as suiteId',
  'run_identifier as runIdentifier',
  'git_commit as gitCommit',
  'git_branch as gitBranch',
  'environment',
  'status',
  'triggered_by as triggeredBy',
  'coverage_statements as coverageStatements',
  'coverage_branches as coverageBranches',
  'coverage_functions as coverageFunctions',
  'coverage_lines as coverageLines',
  'failure_rate as failureRate',
  'total_tests as totalTests',
  'passed_tests as passedTests',
  'report_url as reportUrl',
  'evidence_url as evidenceUrl',
  'metadata',
  'started_at as startedAt',
  'completed_at as completedAt',
  'created_at as createdAt',
  'updated_at as updatedAt'
];

function parseJson(value, fallback) {
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

function parseDecimal(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function toDecimalValue(value, { fallback = null, precision = 4 } = {}) {
  if (value === null || value === undefined) {
    return fallback;
  }

  const number = Number(value);
  if (!Number.isFinite(number)) {
    return fallback;
  }

  return Number(number.toFixed(precision));
}

function deserialize(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    suiteId: row.suiteId,
    runIdentifier: row.runIdentifier,
    gitCommit: row.gitCommit ?? null,
    gitBranch: row.gitBranch ?? null,
    environment: row.environment ?? null,
    status: row.status,
    triggeredBy: row.triggeredBy ?? null,
    coverage: {
      statements: parseDecimal(row.coverageStatements),
      branches: parseDecimal(row.coverageBranches),
      functions: parseDecimal(row.coverageFunctions),
      lines: parseDecimal(row.coverageLines)
    },
    failureRate: parseDecimal(row.failureRate),
    totalTests: row.totalTests ?? null,
    passedTests: row.passedTests ?? null,
    reportUrl: row.reportUrl ?? null,
    evidenceUrl: row.evidenceUrl ?? null,
    metadata: parseJson(row.metadata, {}),
    startedAt: row.startedAt ?? null,
    completedAt: row.completedAt ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

function buildPayload(run) {
  const metadata = run.metadata && typeof run.metadata === 'object' ? run.metadata : {};
  return {
    suite_id: run.suiteId,
    run_identifier: run.runIdentifier,
    git_commit: run.gitCommit ?? null,
    git_branch: run.gitBranch ?? null,
    environment: run.environment ?? null,
    status: run.status ?? 'in_progress',
    triggered_by: run.triggeredBy ?? null,
    coverage_statements: toDecimalValue(run.coverageStatements ?? run.coverage?.statements ?? null, { fallback: 0 }),
    coverage_branches: toDecimalValue(run.coverageBranches ?? run.coverage?.branches ?? null, { fallback: 0 }),
    coverage_functions: toDecimalValue(run.coverageFunctions ?? run.coverage?.functions ?? null, { fallback: 0 }),
    coverage_lines: toDecimalValue(run.coverageLines ?? run.coverage?.lines ?? null, { fallback: 0 }),
    failure_rate: toDecimalValue(run.failureRate, { fallback: 0 }),
    total_tests: Number.isFinite(run.totalTests) ? Number(run.totalTests) : null,
    passed_tests: Number.isFinite(run.passedTests) ? Number(run.passedTests) : null,
    report_url: run.reportUrl ?? null,
    evidence_url: run.evidenceUrl ?? null,
    metadata: JSON.stringify(metadata),
    started_at: run.startedAt ?? null,
    completed_at: run.completedAt ?? null
  };
}

export default class QaTestSuiteRunModel {
  static deserialize = deserialize;

  static async create(run, connection = db) {
    const payload = buildPayload(run);
    const [id] = await connection(TABLE).insert(payload);
    return this.findById(id, connection);
  }

  static async findById(id, connection = db) {
    if (!id) {
      return null;
    }

    const row = await connection(TABLE).select(BASE_COLUMNS).where({ id }).first();
    return deserialize(row);
  }

  static async listBySuiteId(suiteId, connection = db) {
    if (!suiteId) {
      return [];
    }

    const rows = await connection(TABLE)
      .select(BASE_COLUMNS)
      .where({ suite_id: suiteId })
      .orderBy([{ column: 'completed_at', order: 'desc' }, { column: 'created_at', order: 'desc' }]);
    return rows.map(deserialize);
  }

  static async getLatestBySuiteIds(suiteIds, connection = db) {
    if (!Array.isArray(suiteIds) || suiteIds.length === 0) {
      return [];
    }

    const rows = await connection(TABLE)
      .select(BASE_COLUMNS)
      .whereIn('suite_id', suiteIds)
      .orderBy([{ column: 'completed_at', order: 'desc' }, { column: 'created_at', order: 'desc' }, { column: 'id', order: 'desc' }]);

    const latest = new Map();
    for (const row of rows) {
      if (!latest.has(row.suiteId)) {
        latest.set(row.suiteId, deserialize(row));
      }
    }

    return Array.from(latest.values());
  }
}
