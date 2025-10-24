import createHttpError from 'http-errors';

import db from '../config/database.js';
import QaFixtureSetModel from '../models/QaFixtureSetModel.js';
import QaManualChecklistModel from '../models/QaManualChecklistModel.js';
import QaSandboxEnvironmentModel from '../models/QaSandboxEnvironmentModel.js';
import QaTestSuiteModel from '../models/QaTestSuiteModel.js';
import QaTestSuiteRunModel from '../models/QaTestSuiteRunModel.js';
import QaTestSurfaceModel from '../models/QaTestSurfaceModel.js';

function normaliseThresholdValue(value) {
  if (value === null || value === undefined) {
    return null;
  }
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function resolveThresholds(surface) {
  const base = surface.thresholds ?? {};
  const suiteThresholds = Array.isArray(surface.suites) && surface.suites.length === 1 ? surface.suites[0].thresholds : null;
  return {
    statements: normaliseThresholdValue(suiteThresholds?.statements ?? base.statements),
    branches: normaliseThresholdValue(suiteThresholds?.branches ?? base.branches),
    functions: normaliseThresholdValue(suiteThresholds?.functions ?? base.functions),
    lines: normaliseThresholdValue(suiteThresholds?.lines ?? base.lines)
  };
}

function chooseLatestRun(suites = []) {
  const runs = suites
    .map((suite) => suite.latestRun)
    .filter((run) => Boolean(run));
  if (!runs.length) {
    return null;
  }

  runs.sort((a, b) => {
    const aTime = new Date(a.completedAt ?? a.updatedAt ?? a.createdAt ?? 0).getTime();
    const bTime = new Date(b.completedAt ?? b.updatedAt ?? b.createdAt ?? 0).getTime();
    return bTime - aTime;
  });

  return runs[0];
}

function hasCoverageValues(coverage) {
  if (!coverage || typeof coverage !== 'object') {
    return false;
  }
  return ['statements', 'branches', 'functions', 'lines'].some((metric) => {
    const value = coverage[metric];
    return Number.isFinite(value);
  });
}

function evaluateSurfaceStatus(latestRun, coverage, thresholds) {
  if (!latestRun) {
    return 'missing';
  }

  const runStatus = String(latestRun.status ?? '').toLowerCase();
  if (runStatus === 'missing') {
    return 'missing';
  }
  if (runStatus === 'failed' || runStatus === 'fail' || runStatus === 'error') {
    return 'fail';
  }

  if (!hasCoverageValues(coverage)) {
    return 'in_progress';
  }

  const metrics = ['statements', 'branches', 'functions', 'lines'];
  for (const metric of metrics) {
    const threshold = thresholds?.[metric];
    if (!Number.isFinite(threshold)) {
      continue;
    }
    const value = coverage?.[metric];
    if (!Number.isFinite(value)) {
      return 'in_progress';
    }
    if (value < threshold) {
      return 'fail';
    }
  }

  return runStatus === 'in_progress' ? 'in_progress' : 'pass';
}

function decorateSurface(surface) {
  const suites = Array.isArray(surface.suites) ? surface.suites : [];
  const thresholds = resolveThresholds(surface);
  const latestRun = surface.latestRun ?? null;
  const coverage = latestRun?.coverage ?? null;
  const status = evaluateSurfaceStatus(latestRun, coverage, thresholds);

  return {
    slug: surface.slug,
    displayName: surface.displayName,
    surfaceType: surface.surfaceType,
    ownerTeam: surface.ownerTeam,
    repositoryPath: surface.repositoryPath,
    ciIdentifier: surface.ciIdentifier ?? null,
    thresholds,
    status,
    metrics: coverage,
    latestRun,
    suites: suites.map((suite) => ({
      id: suite.id,
      suiteKey: suite.suiteKey,
      suiteType: suite.suiteType,
      ownerEmail: suite.ownerEmail ?? null,
      ciJob: suite.ciJob ?? null,
      thresholds: suite.thresholds,
      latestRun: suite.latestRun ?? null
    })),
    metadata: surface.metadata ?? {}
  };
}

function summariseSurfaces(surfaces) {
  const decorated = surfaces.map(decorateSurface);

  const totals = { pass: 0, fail: 0, in_progress: 0, missing: 0 };
  const coverageValues = [];
  const failureRates = [];
  const evidence = new Set();

  for (const surface of decorated) {
    totals[surface.status] = (totals[surface.status] ?? 0) + 1;
    if (Number.isFinite(surface.metrics?.lines)) {
      coverageValues.push(surface.metrics.lines);
    } else if (Number.isFinite(surface.metrics?.statements)) {
      coverageValues.push(surface.metrics.statements);
    }
    if (Number.isFinite(surface.latestRun?.failureRate)) {
      failureRates.push(surface.latestRun.failureRate);
    }
    if (surface.latestRun?.reportUrl) {
      evidence.add(surface.latestRun.reportUrl);
    }
    if (surface.latestRun?.evidenceUrl) {
      evidence.add(surface.latestRun.evidenceUrl);
    }
  }

  const averageCoverage = coverageValues.length
    ? Number((coverageValues.reduce((sum, value) => sum + value, 0) / coverageValues.length).toFixed(4))
    : null;
  const averageFailureRate = failureRates.length
    ? Number((failureRates.reduce((sum, value) => sum + value, 0) / failureRates.length).toFixed(4))
    : null;

  return {
    generatedAt: new Date().toISOString(),
    surfaces: decorated,
    aggregate: {
      coverage: averageCoverage,
      failureRate: averageFailureRate,
      totals
    },
    evidence: Array.from(evidence)
  };
}

function buildRunIdentifier(base, targetId) {
  const suffix = targetId ? `-${targetId}` : '';
  if (!base) {
    return `${targetId ?? 'coverage'}-${Date.now()}`;
  }
  return `${base}${suffix}`;
}

function toDecimalRatio(value) {
  if (value === null || value === undefined) {
    return null;
  }
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return null;
  }
  return Number((number / 100).toFixed(4));
}

export default class QaReadinessService {
  static async listSurfaces({ includeSuites = true, includeLatestRun = true, activeOnly = true } = {}) {
    const surfaces = await QaTestSurfaceModel.list({ active: activeOnly });
    if (!surfaces.length) {
      return [];
    }

    let suites = [];
    if (includeSuites || includeLatestRun) {
      suites = await QaTestSuiteModel.list({ surfaceIds: surfaces.map((surface) => surface.id) });
    }

    let latestRuns = [];
    if (includeLatestRun && suites.length) {
      latestRuns = await QaTestSuiteRunModel.getLatestBySuiteIds(suites.map((suite) => suite.id));
    }

    const runMap = new Map();
    latestRuns.forEach((run) => {
      runMap.set(run.suiteId, { ...run });
    });

    const suitesBySurface = new Map();
    for (const suite of suites) {
      const latestRun = includeLatestRun ? runMap.get(suite.id) ?? null : null;
      const enrichedSuite = {
        ...suite,
        latestRun: latestRun ? { ...latestRun, suiteKey: suite.suiteKey } : null
      };
      if (!suitesBySurface.has(suite.surfaceId)) {
        suitesBySurface.set(suite.surfaceId, []);
      }
      suitesBySurface.get(suite.surfaceId).push(enrichedSuite);
    }

    return surfaces.map((surface) => {
      const surfaceSuites = suitesBySurface.get(surface.id) ?? [];
      const latestRun = includeLatestRun ? chooseLatestRun(surfaceSuites) : null;
      return {
        ...surface,
        suites: includeSuites ? surfaceSuites : undefined,
        latestRun
      };
    });
  }

  static async getCoverageSummary({ surfaces } = {}) {
    const resolved = surfaces ?? (await this.listSurfaces({ includeSuites: true, includeLatestRun: true }));
    return summariseSurfaces(resolved);
  }

  static async listSurfacesWithSummary(options = {}) {
    const surfaces = await this.listSurfaces(options);
    const summary = await this.getCoverageSummary({ surfaces });
    return { surfaces: summary.surfaces, aggregate: summary.aggregate };
  }

  static async getSurface(slug) {
    const surfaces = await this.listSurfaces({ includeSuites: true, includeLatestRun: true });
    const surface = surfaces.find((entry) => entry.slug === slug);
    if (!surface) {
      throw createHttpError(404, `QA surface '${slug}' was not found.`);
    }
    const summary = summariseSurfaces([surface]);
    return summary.surfaces[0];
  }

  static async listManualChecklists() {
    return QaManualChecklistModel.list({ includeItems: false });
  }

  static async getManualChecklist(slug) {
    const checklist = await QaManualChecklistModel.findBySlug(slug, { includeItems: true });
    if (!checklist) {
      throw createHttpError(404, `Manual QA checklist '${slug}' was not found.`);
    }
    return checklist;
  }

  static async listFixtureSets() {
    return QaFixtureSetModel.list();
  }

  static async listSandboxes(filters = {}) {
    return QaSandboxEnvironmentModel.list(filters);
  }

  static async recordCoverageMatrix(matrix, options = {}) {
    if (!matrix || !Array.isArray(matrix.surfaces)) {
      throw new Error('Coverage matrix is missing surfaces to persist.');
    }

    const surfaces = await QaTestSurfaceModel.list({ active: true });
    if (!surfaces.length) {
      return [];
    }

    const suites = await QaTestSuiteModel.list({ surfaceIds: surfaces.map((surface) => surface.id) });
    const suiteByKey = new Map(suites.map((suite) => [suite.suiteKey, suite]));
    const reportUrls = options.reportUrls ?? {};
    const evidenceUrls = options.evidenceUrls ?? {};
    const totalTests = options.totalTests ?? {};
    const passedTests = options.passedTests ?? {};
    const failureRates = options.failureRates ?? options.failureRate ?? {};

    const persistedRuns = [];
    for (const surfaceEntry of matrix.surfaces) {
      const suite = suiteByKey.get(surfaceEntry.id);
      if (!suite) {
        continue;
      }

      const status = String(surfaceEntry.status ?? 'unknown').toLowerCase();
      const metrics = surfaceEntry.metrics ? {
        statements: toDecimalRatio(surfaceEntry.metrics.statements),
        branches: toDecimalRatio(surfaceEntry.metrics.branches),
        functions: toDecimalRatio(surfaceEntry.metrics.functions),
        lines: toDecimalRatio(surfaceEntry.metrics.lines)
      } : null;

      const failureRateValue = (() => {
        const keyed = failureRates?.[surfaceEntry.id];
        if (Number.isFinite(keyed)) {
          return Number(keyed);
        }
        if (status === 'pass') {
          return 0;
        }
        if (status === 'missing') {
          return 1;
        }
        return 1;
      })();

      const run = await QaTestSuiteRunModel.create({
        suiteId: suite.id,
        runIdentifier: buildRunIdentifier(options.runIdentifier ?? options.gitCommit ?? options.gitBranch ?? 'coverage', surfaceEntry.id),
        gitCommit: options.gitCommit ?? null,
        gitBranch: options.gitBranch ?? null,
        environment: options.environment ?? 'staging',
        status: status === 'pass' ? 'passed' : status === 'fail' ? 'failed' : status,
        triggeredBy: options.triggeredBy ?? options.actor ?? null,
        coverage: metrics,
        failureRate: failureRateValue,
        totalTests: Number.isFinite(totalTests?.[surfaceEntry.id]) ? Number(totalTests[surfaceEntry.id]) : null,
        passedTests: Number.isFinite(passedTests?.[surfaceEntry.id]) ? Number(passedTests[surfaceEntry.id]) : null,
        reportUrl: reportUrls[surfaceEntry.id] ?? surfaceEntry.source ?? null,
        evidenceUrl: evidenceUrls[surfaceEntry.id] ?? null,
        metadata: {
          policyThresholds: surfaceEntry.thresholds ?? null,
          error: surfaceEntry.error ?? null,
          source: surfaceEntry.source ?? null
        },
        startedAt: options.startedAt ?? matrix.generatedAt ?? new Date().toISOString(),
        completedAt: options.completedAt ?? matrix.generatedAt ?? new Date().toISOString()
      });
      persistedRuns.push(run);
    }

    return persistedRuns;
  }

  static async resolveQualityGateMetrics() {
    const summary = await this.getCoverageSummary();
    const aggregateCoverage = summary.aggregate.coverage;
    const aggregateFailureRate = summary.aggregate.failureRate;
    return {
      coverage: aggregateCoverage,
      testFailureRate: aggregateFailureRate,
      evidence: summary.evidence
    };
  }

  static async closeConnections() {
    await db.destroy();
  }
}
