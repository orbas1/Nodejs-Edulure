import db from '../config/database.js';
import integrationOrchestratorService from './IntegrationOrchestratorService.js';
import IntegrationSyncRunModel from '../models/IntegrationSyncRunModel.js';
import IntegrationSyncResultModel from '../models/IntegrationSyncResultModel.js';
import IntegrationReconciliationReportModel from '../models/IntegrationReconciliationReportModel.js';
import integrationStatusService from './IntegrationStatusService.js';
import { getIntegrationDescriptor } from './IntegrationProviderRegistry.js';

const DASHBOARD_INTEGRATIONS = ['hubspot', 'salesforce'];

function getIntegrationMetadata(id) {
  const normalised = typeof id === 'string' ? id.toLowerCase() : '';
  if (!normalised || !DASHBOARD_INTEGRATIONS.includes(normalised)) {
    return null;
  }

  const descriptor = getIntegrationDescriptor(normalised);
  if (descriptor) {
    return descriptor;
  }

  return {
    id: normalised,
    label: normalised,
    category: 'integration',
    type: 'general',
    enabled: true
  };
}

function isValidDate(value) {
  if (!value) return false;
  const candidate = value instanceof Date ? value : new Date(value);
  return !Number.isNaN(candidate.getTime());
}

function toDateOrNull(value) {
  return isValidDate(value) ? new Date(value) : null;
}

function calculateDurationSeconds(startedAt, finishedAt) {
  const start = toDateOrNull(startedAt);
  const end = toDateOrNull(finishedAt);
  if (!start || !end) {
    return null;
  }
  const diffMs = end.getTime() - start.getTime();
  if (!Number.isFinite(diffMs) || diffMs < 0) {
    return null;
  }
  return Math.round(diffMs / 1000);
}

function maskEmail(email) {
  if (typeof email !== 'string' || !email.includes('@')) {
    return null;
  }
  const [local, domain] = email.split('@');
  if (!local) {
    return `***@${domain}`;
  }
  if (local.length <= 2) {
    return `${local.charAt(0)}***@${domain}`;
  }
  return `${local.slice(0, 2)}***@${domain}`;
}

function sanitiseMismatchEntries(entries = []) {
  if (!Array.isArray(entries)) {
    return [];
  }
  return entries.slice(0, 10).map((entry, index) => {
    if (!entry || typeof entry !== 'object') {
      return {
        id: `entry-${index}`,
        label: String(entry ?? 'Unknown record')
      };
    }

    const entityId =
      entry.entityId ?? entry.id ?? entry.externalId ?? entry.publicId ?? entry.email ?? `entry-${index}`;
    const email = maskEmail(entry.email ?? entry.primaryEmail ?? entry.contactEmail ?? null);
    const name = entry.name ?? entry.fullName ?? entry.displayName ?? entry.company ?? null;
    const reason = entry.reason ?? entry.status ?? entry.note ?? null;

    return {
      id: entityId,
      entityId,
      email,
      name,
      reason
    };
  });
}

function sanitiseRun(run) {
  if (!run) return null;
  const durationSeconds = calculateDurationSeconds(run.startedAt, run.finishedAt);
  return {
    id: run.id,
    integration: run.integration,
    syncType: run.syncType,
    status: run.status,
    triggeredBy: run.triggeredBy,
    correlationId: run.correlationId,
    retryAttempt: run.retryAttempt ?? 0,
    windowStartAt: run.windowStartAt,
    windowEndAt: run.windowEndAt,
    startedAt: run.startedAt,
    finishedAt: run.finishedAt,
    durationSeconds,
    records: {
      pushed: Number(run.recordsPushed ?? 0),
      pulled: Number(run.recordsPulled ?? 0),
      failed: Number(run.recordsFailed ?? 0),
      skipped: Number(run.recordsSkipped ?? 0)
    },
    lastError: run.lastError ?? null,
    metadata: run.metadata ?? {}
  };
}

function sanitiseFailure(result) {
  return {
    id: result.id,
    syncRunId: result.syncRunId,
    integration: result.integration,
    entityId: result.entityId ?? result.externalId ?? result.id,
    externalId: result.externalId ?? null,
    direction: result.direction,
    operation: result.operation,
    status: result.status,
    retryCount: Number(result.retryCount ?? 0),
    message: result.message ?? null,
    occurredAt: result.occurredAt
  };
}

function sanitiseReport(report) {
  return {
    id: report.id,
    integration: report.integration,
    status: report.status,
    mismatchCount: Number(report.mismatchCount ?? 0),
    correlationId: report.correlationId ?? null,
    reportDate: report.reportDate,
    generatedAt: report.generatedAt,
    missingInPlatform: sanitiseMismatchEntries(report.missingInPlatform),
    missingInIntegration: sanitiseMismatchEntries(report.missingInIntegration),
    extraContext: report.extraContext ?? {}
  };
}

function deriveHealth(summary, enabled) {
  if (!enabled) return 'disabled';
  if ((summary.failureCount ?? 0) > 0) return 'critical';
  if ((summary.partialCount ?? 0) > 0 || (summary.openFailures ?? 0) > 0) return 'warning';
  return 'operational';
}

function serialiseStatus(status) {
  if (!status) {
    return null;
  }

  return {
    state: status.status,
    summary: status.statusSummary,
    latestSyncRunId: status.latestSyncRunId,
    consecutiveFailures: status.consecutiveFailures,
    openIncidents: status.openIncidentCount,
    lastSuccessAt: status.lastSuccessAt ? status.lastSuccessAt.toISOString() : null,
    lastFailureAt: status.lastFailureAt ? status.lastFailureAt.toISOString() : null,
    updatedAt: status.updatedAt ? status.updatedAt.toISOString() : null
  };
}

function serialiseCallSummary(summary) {
  if (!summary) {
    return null;
  }

  return {
    total: Number(summary.total ?? 0),
    success: Number(summary.success ?? 0),
    degraded: Number(summary.degraded ?? 0),
    failure: Number(summary.failure ?? 0)
  };
}

function calculateCallHealthStats(callSummary) {
  const total = Number(callSummary?.total ?? 0);
  if (!total) {
    return { successRate: null, errorRate: null, degradedRate: null };
  }

  const success = Number(callSummary?.success ?? 0);
  const degraded = Number(callSummary?.degraded ?? 0);
  const failure = Number(callSummary?.failure ?? 0);

  return {
    successRate: Math.max(0, Math.min(100, Math.round((success / total) * 100))),
    degradedRate: Math.max(0, Math.min(100, Math.round((degraded / total) * 100))),
    errorRate: Math.max(0, Math.min(100, Math.round((failure / total) * 100)))
  };
}

function buildSloSummary(summary, healthStats) {
  if (!summary) {
    return null;
  }

  const sloTarget = 98;
  const successRate = summary.successRate ?? healthStats.successRate ?? null;
  if (successRate === null) {
    return null;
  }

  const variance = Number.isFinite(successRate) ? Number((successRate - sloTarget).toFixed(2)) : null;
  return {
    sloTarget,
    successRate,
    variance,
    breaching: variance !== null && variance < -0.5
  };
}

export default class IntegrationDashboardService {
  constructor({
    orchestratorService = integrationOrchestratorService,
    runModel = IntegrationSyncRunModel,
    resultModel = IntegrationSyncResultModel,
    reportModel = IntegrationReconciliationReportModel,
    database = db,
    statusService = integrationStatusService
  } = {}) {
    this.orchestratorService = orchestratorService;
    this.runModel = runModel;
    this.resultModel = resultModel;
    this.reportModel = reportModel;
    this.db = database;
    this.statusService = statusService;
  }

  async buildSnapshot({
    runLimit = 12,
    failureLimit = 40,
    failureLookbackHours = 72,
    reportLimit = 5
  } = {}) {
    const orchestratorStatus = await this.orchestratorService.statusSnapshot();
    const now = new Date();
    const failureSince = new Date(now.getTime() - failureLookbackHours * 60 * 60 * 1000);

    const integrations = await Promise.all(
      DASHBOARD_INTEGRATIONS.map(async (integrationId) => {
        const meta = getIntegrationMetadata(integrationId);
        const recentRuns = await this.runModel.listRecent(meta.id, { limit: runLimit }, this.db);
        const sanitisedRuns = recentRuns.map(sanitiseRun).filter(Boolean);
        const failuresRaw = await this.resultModel.listFailures(
          meta.id,
          { since: failureSince },
          this.db
        );
        const sanitisedFailures = failuresRaw.slice(0, failureLimit).map(sanitiseFailure);
        const reportsRaw = await this.reportModel.list(meta.id, { limit: reportLimit }, this.db);
        const reports = reportsRaw.map(sanitiseReport);

        const integrationSnapshot = orchestratorStatus?.[meta.id] ?? {};
        const [statusResult, callSummaryResult] = await Promise.allSettled([
          this.statusService?.getStatus ? this.statusService.getStatus(meta.id) : Promise.resolve(null),
          this.statusService?.summariseCalls
            ? this.statusService.summariseCalls(meta.id)
            : Promise.resolve(null)
        ]);

        const statusRecord = statusResult.status === 'fulfilled' ? statusResult.value : null;
        const callSummary = callSummaryResult.status === 'fulfilled' ? callSummaryResult.value : null;

        const totalRuns = sanitisedRuns.length;
        const successCount = sanitisedRuns.filter((run) => run.status === 'succeeded').length;
        const partialCount = sanitisedRuns.filter((run) => run.status === 'partial').length;
        const failureCount = sanitisedRuns.filter((run) => run.status === 'failed').length;
        const successRate = totalRuns ? Math.round((successCount / totalRuns) * 100) : null;
        const averageDurationSeconds = totalRuns
          ? Math.round(
              sanitisedRuns.reduce((acc, run) => acc + (run.durationSeconds ?? 0), 0) / Math.max(totalRuns, 1)
            )
          : null;

        const recordsPushed = sanitisedRuns.reduce((acc, run) => acc + (run.records?.pushed ?? 0), 0);
        const recordsFailed = sanitisedRuns.reduce((acc, run) => acc + (run.records?.failed ?? 0), 0);

        const latestRun = sanitisedRuns[0] ?? null;
        const reconciliation = {
          reports,
          latestStatus: reports[0]?.status ?? null,
          latestGeneratedAt: reports[0]?.generatedAt ?? null,
          totalMismatchOpen: reports.reduce((acc, report) => acc + (report.mismatchCount ?? 0), 0)
        };

        const enabledSnapshot = Boolean(integrationSnapshot.enabled);
        const summary = {
          lastRunStatus: latestRun?.status ?? null,
          lastRunAt: latestRun?.finishedAt ?? latestRun?.startedAt ?? null,
          successRate,
          averageDurationSeconds,
          recordsPushed,
          recordsFailed,
          failureCount,
          partialCount,
          openFailures: sanitisedFailures.length
        };

        const health = deriveHealth(summary, enabledSnapshot);

        const callSummarySanitised = serialiseCallSummary(callSummary ?? integrationSnapshot.callSummary ?? null);
        const callHealth = calculateCallHealthStats(callSummarySanitised);
        const slo = buildSloSummary(summary, callHealth);

        return {
          ...meta,
          enabled: enabledSnapshot,
          environment: integrationSnapshot.environment ?? 'production',
          health,
          summary,
          recentRuns: sanitisedRuns,
          failureLog: sanitisedFailures,
          reconciliation,
          status: integrationSnapshot,
          statusDetails: serialiseStatus(statusRecord) ?? serialiseStatus(integrationSnapshot.status ?? null),
          callSummary: callSummarySanitised,
          callHealth,
          slo
        };
      })
    );

    return {
      generatedAt: now.toISOString(),
      concurrency: {
        activeJobs: orchestratorStatus?.concurrentJobs ?? 0,
        maxConcurrentJobs: orchestratorStatus?.maxConcurrentJobs ?? 0
      },
      integrations,
      searchIndex: integrations.map((integration) => ({
        id: `integration-${integration.id}`,
        role: 'admin',
        type: 'Integration',
        title: `${integration.label} sync health`,
        url: `/dashboard/admin/integrations?integration=${integration.id}`
      }))
    };
  }

  async triggerManualSync(integration, { windowStartAt, windowEndAt } = {}) {
    const key = typeof integration === 'string' ? integration.toLowerCase() : '';
    const meta = getIntegrationMetadata(key);
    if (!meta) {
      const error = new Error('Integration not found');
      error.status = 404;
      throw error;
    }

    const windowStart = toDateOrNull(windowStartAt);
    const windowEnd = toDateOrNull(windowEndAt);

    if (windowStart && windowEnd && windowEnd < windowStart) {
      const error = new Error('windowEndAt must be after windowStartAt');
      error.status = 422;
      throw error;
    }

    const triggerContext = { trigger: 'manual-dashboard', windowStartAt: windowStart, windowEndAt: windowEnd };

    let handler;
    if (key === 'hubspot') {
      if (!this.orchestratorService.hubspotEnabled) {
        const error = new Error('HubSpot integration is disabled');
        error.status = 409;
        throw error;
      }
      handler = () => this.orchestratorService.runHubSpotSync(triggerContext);
    } else if (key === 'salesforce') {
      if (!this.orchestratorService.salesforceEnabled) {
        const error = new Error('Salesforce integration is disabled');
        error.status = 409;
        throw error;
      }
      handler = () => this.orchestratorService.runSalesforceSync(triggerContext);
    } else {
      const error = new Error('Manual sync not supported for this integration');
      error.status = 400;
      throw error;
    }

    const result = await this.orchestratorService.executeJob(meta.id, handler);

    if (!result || !result.run) {
      const error = new Error('Integration sync already running or unavailable');
      error.status = 409;
      throw error;
    }

    return {
      integration: meta.id,
      runId: result.run.id,
      correlationId: result.run.correlationId,
      status: result.run.status ?? 'pending',
      triggeredBy: result.run.triggeredBy ?? 'manual-dashboard'
    };
  }

  async healthOverview() {
    const snapshot = await this.buildSnapshot({ runLimit: 5, failureLimit: 20, reportLimit: 3 });
    const totals = snapshot.integrations.reduce(
      (acc, integration) => {
        const { callHealth, summary } = integration;
        const successRate = summary.successRate ?? callHealth.successRate ?? null;
        if (successRate !== null) {
          acc.successRates.push(successRate);
        }

        if (callHealth.errorRate !== null) {
          acc.errorRates.push(callHealth.errorRate);
        }

        if (integration.health === 'critical') {
          acc.critical.push(integration.id);
        } else if (integration.health === 'warning') {
          acc.warning.push(integration.id);
        }

        return acc;
      },
      { successRates: [], errorRates: [], critical: [], warning: [] }
    );

    const average = (values) => {
      if (!values.length) return null;
      const sum = values.reduce((acc, value) => acc + value, 0);
      return Number((sum / values.length).toFixed(2));
    };

    return {
      generatedAt: snapshot.generatedAt,
      averageSuccessRate: average(totals.successRates),
      averageErrorRate: average(totals.errorRates),
      criticalIntegrations: totals.critical,
      warningIntegrations: totals.warning,
      totalIntegrations: snapshot.integrations.length
    };
  }
}

