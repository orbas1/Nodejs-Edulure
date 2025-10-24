import crypto from 'crypto';
import cron from 'node-cron';

import { env } from '../config/env.js';
import logger from '../config/logger.js';
import DomainEventModel from '../models/DomainEventModel.js';
import PlatformSettingModel from '../models/PlatformSettingModel.js';
import {
  dataRetentionJobLastRunTimestamp,
  dataRetentionPoliciesProcessedTotal
} from '../observability/metrics.js';
import { enforceRetentionPolicies } from '../services/dataRetentionService.js';
import { RetentionPolicyRegistry } from '../services/RetentionPolicyRegistry.js';

const RESUME_APPROVAL_KEY = 'governance.data_retention.resume_gate';
const STATUS_PALETTE = {
  executed: 'emerald',
  simulated: 'sky',
  'skipped-inactive': 'slate',
  'skipped-unsupported': 'amber',
  'skipped-legal-hold': 'amber',
  failed: 'crimson'
};

function ensurePositiveInteger(value, fallback) {
  const parsed = Number.isFinite(value) ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.floor(parsed);
}

function ensureNumber(value, fallback, { min = Number.NEGATIVE_INFINITY } = {}) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min) {
    return fallback;
  }
  return parsed;
}

function normalizePolicyResult(result) {
  const status = result?.status ?? 'unknown';
  const affectedRows = Number(result?.affectedRows ?? 0);
  const sampleIds = Array.isArray(result?.sampleIds) ? result.sampleIds : [];

  return {
    policyId: result?.policyId ?? null,
    entityName: result?.entityName ?? null,
    status,
    affectedRows,
    sampleIds,
    dryRun: Boolean(result?.dryRun ?? false),
    description: result?.description ?? null,
    reason: result?.reason ?? null,
    context: result?.context ?? {},
    severityToken: STATUS_PALETTE[status] ?? 'slate'
  };
}

function calculateTotals(results = []) {
  return results.reduce(
    (acc, entry) => {
      const status = entry.status ?? 'unknown';
      acc[status] = (acc[status] ?? 0) + 1;
      acc.affectedRows = (acc.affectedRows ?? 0) + (entry.affectedRows ?? 0);
      return acc;
    },
    { affectedRows: 0 }
  );
}

function determineRunOutcome(results = [], anomalies = []) {
  const hasFailure = results.some((entry) => entry.status === 'failed');
  if (hasFailure) {
    return { result: 'failed', palette: 'crimson' };
  }
  if (anomalies.length > 0) {
    return { result: 'degraded', palette: 'amber' };
  }
  return { result: 'success', palette: 'emerald' };
}

function buildRunSummary({
  trigger,
  startedAt,
  completedAt,
  dryRun,
  policies,
  preflight,
  execution,
  anomalies
}) {
  const executionResults = (execution?.results ?? []).map(normalizePolicyResult);
  const totals = calculateTotals(executionResults);
  const outcome = determineRunOutcome(executionResults, anomalies);

  const formattedPreflight = preflight
    ? {
        ...preflight,
        results: (preflight.results ?? []).map(normalizePolicyResult)
      }
    : null;

  return {
    trigger,
    startedAt,
    completedAt,
    dryRun,
    runId: execution?.runId ?? null,
    mode: execution?.mode ?? null,
    policyCount: policies.length,
    totals,
    anomalies,
    execution: {
      ...execution,
      results: executionResults
    },
    preflight: formattedPreflight,
    paletteToken: outcome.palette,
    status: outcome.result
  };
}

function createDefaultPolicyRegistry(refreshIntervalMs) {
  return new RetentionPolicyRegistry({ refreshIntervalMs });
}

export class DataRetentionJob {
  constructor({
    enabled = env.retention.enabled,
    schedule = env.retention.cronExpression,
    timezone = env.retention.timezone,
    dryRun = env.retention.dryRun,
    runOnStartup = env.retention.runOnStartup,
    maxConsecutiveFailures = env.retention.maxConsecutiveFailures,
    failureBackoffMinutes = env.retention.failureBackoffMinutes,
    maxBackoffMinutes = env.retention.maxBackoffMinutes,
    backoffExponentBase = env.retention.backoffExponentBase,
    alertThreshold = env.retention.alertThreshold,
    policyRefreshIntervalMs = env.retention.policyRefreshIntervalMs,
    executor = enforceRetentionPolicies,
    scheduler = cron,
    policyRegistry,
    approvalStore = PlatformSettingModel,
    resumeApprovalKey = RESUME_APPROVAL_KEY,
    alertPublisher,
    loggerInstance = logger.child({ module: 'data-retention-job' }),
    nowProvider = () => new Date(),
    metrics = {
      policiesProcessedCounter: dataRetentionPoliciesProcessedTotal,
      jobLastRunGauge: dataRetentionJobLastRunTimestamp
    }
  } = {}) {
    this.enabled = Boolean(enabled);
    this.schedule = schedule;
    this.timezone = timezone;
    this.dryRun = Boolean(dryRun);
    this.runOnStartup = Boolean(runOnStartup);
    this.executor = executor;
    this.scheduler = scheduler;
    this.logger = loggerInstance;
    this.metrics = metrics ?? {};
    this.nowProvider = typeof nowProvider === 'function' ? nowProvider : () => new Date();
    this.task = null;
    this.consecutiveFailures = 0;
    this.failureEscalations = 0;
    this.pausedUntil = null;
    this.pauseApprovalToken = null;
    this.resumeApprovalContext = null;
    this.lastSummary = null;
    this.anomalies = [];

    this.maxConsecutiveFailures = ensurePositiveInteger(maxConsecutiveFailures, 3);
    this.failureBackoffMinutes = ensurePositiveInteger(failureBackoffMinutes, 30);
    this.maxBackoffMinutes = ensurePositiveInteger(maxBackoffMinutes, this.failureBackoffMinutes * 4);
    this.backoffExponentBase = ensureNumber(backoffExponentBase, 2, { min: 1 });
    this.alertThreshold = ensurePositiveInteger(alertThreshold, 500);

    const refreshInterval = ensurePositiveInteger(policyRefreshIntervalMs, 300_000);
    this.policyRegistry =
      policyRegistry ?? createDefaultPolicyRegistry(refreshInterval ?? 300_000);

    this.approvalStore = approvalStore;
    this.resumeApprovalKey = resumeApprovalKey;
    this.alertPublisher =
      typeof alertPublisher === 'function'
        ? alertPublisher
        : async ({ runId, policy, result, mode, trigger, threshold }) => {
            await DomainEventModel.record({
              entityType: 'data_retention_policy',
              entityId: String(policy.id),
              eventType: 'governance.data_retention.anomaly',
              payload: {
                runId,
                policyId: policy.id,
                entityName: policy.entityName,
                affectedRows: result.affectedRows,
                sampleIds: result.sampleIds ?? [],
                mode,
                trigger,
                threshold: threshold ?? this.alertThreshold
              },
              performedBy: null
            });
          };

    if (typeof this.executor !== 'function') {
      throw new Error('DataRetentionJob requires an executor function.');
    }

    if (!this.schedule || typeof this.schedule !== 'string') {
      throw new Error('DataRetentionJob requires a cron schedule string.');
    }

    if (!this.timezone || typeof this.timezone !== 'string') {
      throw new Error('DataRetentionJob requires a valid timezone identifier.');
    }
  }

  start() {
    if (!this.enabled) {
      this.logger.warn('Data retention job disabled; skipping scheduler start.');
      return;
    }

    if (this.task) {
      return;
    }

    const validate = this.scheduler.validate ?? (() => true);
    if (!validate(this.schedule)) {
      throw new Error(`Invalid data retention cron expression: "${this.schedule}"`);
    }

    this.task = this.scheduler.schedule(
      this.schedule,
      () => {
        this.runCycle('scheduled').catch((error) => {
          this.logger.error({ err: error }, 'Unhandled data retention job error');
        });
      },
      { timezone: this.timezone }
    );

    if (typeof this.task.start === 'function') {
      this.task.start();
    }

    this.logger.info(
      { schedule: this.schedule, timezone: this.timezone, dryRun: this.dryRun },
      'Data retention job scheduled'
    );

    this.policyRegistry.refresh({ force: true }).catch((error) => {
      this.logger.warn({ err: error }, 'Failed to warm retention policy registry');
    });

    if (this.runOnStartup) {
      this.runCycle('startup').catch((error) => {
        this.logger.error({ err: error }, 'Startup data retention cycle failed');
      });
    }
  }

  async ensureResumeApproval(trigger) {
    if (!this.pauseApprovalToken) {
      return true;
    }

    try {
      const approval = await this.approvalStore.findByKey(this.resumeApprovalKey);
      const value = approval?.value ?? {};
      if (value.resumeApproved === true && value.resumeToken === this.pauseApprovalToken) {
        this.logger.info(
          {
            trigger,
            approvedBy: value.approvedBy ?? null,
            approvedAt: value.approvedAt ?? null
          },
          'Resume approval confirmed for data retention job'
        );
        this.resumeApprovalContext = value;
        return true;
      }

      this.logger.warn(
        { trigger, resumeToken: this.pauseApprovalToken },
        'Awaiting resume approval before running data retention job'
      );
      return false;
    } catch (error) {
      this.logger.error({ err: error, trigger }, 'Failed to load resume approval state');
      return false;
    }
  }

  collectAnomalies(results = [], context = {}) {
    const entries = [];
    for (const result of results) {
      const affectedRows = Number(result?.affectedRows ?? 0);
      if (affectedRows >= this.alertThreshold) {
        entries.push({
          policyId: result?.policyId ?? context.policyId ?? null,
          entityName: result?.entityName ?? null,
          affectedRows,
          threshold: this.alertThreshold,
          sampleIds: result?.sampleIds ?? [],
          trigger: context.trigger ?? 'manual',
          runId: context.runId ?? null,
          mode: context.mode ?? null,
          dryRun: context.dryRun ?? false
        });
      }
    }
    return entries;
  }

  recordMetrics(summary) {
    const results = summary.execution?.results ?? [];
    if (this.metrics?.policiesProcessedCounter) {
      for (const entry of results) {
        this.metrics.policiesProcessedCounter.labels(entry.status ?? 'unknown').inc();
      }
    }

    const completedAt = summary.completedAt instanceof Date ? summary.completedAt : new Date(summary.completedAt);
    const timestampSeconds = Number.isFinite(completedAt.getTime())
      ? completedAt.getTime() / 1000
      : Date.now() / 1000;

    if (this.metrics?.jobLastRunGauge) {
      this.metrics.jobLastRunGauge.labels(summary.status ?? 'unknown').set(timestampSeconds);
    }
  }

  computePauseDurationMinutes() {
    const multiplier = Math.max(1, Math.pow(this.backoffExponentBase, this.failureEscalations));
    const minutes = Math.min(this.failureBackoffMinutes * multiplier, this.maxBackoffMinutes);
    return minutes;
  }

  async recordPause({ trigger, error }) {
    this.pauseApprovalToken = crypto.randomUUID();
    const now = this.nowProvider();
    const payload = {
      status: 'paused',
      resumeApproved: false,
      resumeToken: this.pauseApprovalToken,
      pausedAt: now.toISOString(),
      failure: {
        trigger,
        message: error?.message ?? 'data_retention_failure',
        occurredAt: now.toISOString()
      }
    };

    try {
      await this.approvalStore.upsert(this.resumeApprovalKey, payload);
    } catch (storeError) {
      this.logger.error({ err: storeError }, 'Failed to persist resume approval gate');
    }
  }

  async clearResumeGate() {
    if (!this.pauseApprovalToken && !this.resumeApprovalContext) {
      return;
    }

    const now = this.nowProvider();
    try {
      await this.approvalStore.upsert(this.resumeApprovalKey, {
        status: 'active',
        resumeApproved: false,
        resumeToken: null,
        clearedAt: now.toISOString(),
        lastApproval: this.resumeApprovalContext ?? null
      });
    } catch (error) {
      this.logger.warn({ err: error }, 'Failed to reset resume approval gate');
    }

    this.pauseApprovalToken = null;
    this.resumeApprovalContext = null;
    this.failureEscalations = 0;
  }

  async handleAlert({ runId, policy, result, mode, trigger }) {
    const anomaly = {
      policyId: policy.id,
      entityName: policy.entityName,
      affectedRows: Number(result.affectedRows ?? 0),
      threshold: this.alertThreshold,
      sampleIds: result.sampleIds ?? [],
      trigger,
      runId,
      mode
    };
    this.anomalies.push(anomaly);
    this.logger.warn(
      {
        trigger,
        policyId: policy.id,
        entityName: policy.entityName,
        affectedRows: anomaly.affectedRows,
        threshold: this.alertThreshold
      },
      'Data retention policy exceeded alert threshold'
    );

    if (typeof this.alertPublisher === 'function') {
      try {
        await this.alertPublisher({ runId, policy, result, mode, trigger, threshold: this.alertThreshold });
      } catch (error) {
        this.logger.error({ err: error, policyId: policy.id }, 'Failed to publish retention anomaly alert');
      }
    }
  }

  async runCycle(trigger = 'manual') {
    if (!this.enabled) {
      this.logger.warn({ trigger }, 'Data retention job invoked while disabled');
      return null;
    }

    const now = this.nowProvider();
    if (this.pausedUntil && now.getTime() < this.pausedUntil.getTime()) {
      this.logger.warn(
        { trigger, resumeAt: this.pausedUntil.toISOString() },
        'Data retention job paused after repeated failures'
      );
      return null;
    }

    const approved = await this.ensureResumeApproval(trigger);
    if (!approved) {
      return null;
    }

    this.anomalies = [];
    const startedAt = now;

    try {
      const policies = await this.policyRegistry.listActivePolicies({ forceRefresh: false });
      if (!policies || policies.length === 0) {
        const completedAt = this.nowProvider();
        const summary = buildRunSummary({
          trigger,
          startedAt,
          completedAt,
          dryRun: this.dryRun,
          policies: [],
          preflight: null,
          execution: { runId: null, mode: this.dryRun ? 'simulate' : 'commit', results: [] },
          anomalies: []
        });
        this.lastSummary = summary;
        this.recordMetrics(summary);
        this.logger.info({ trigger }, 'No active data retention policies to enforce');
        return summary;
      }

      const preflight = await this.executor({
        dryRun: true,
        mode: 'simulate',
        policies,
        alertThreshold: this.alertThreshold,
        emitEvents: false
      });

      const preflightAnomalies = this.collectAnomalies(preflight.results, {
        trigger,
        runId: preflight.runId,
        mode: preflight.mode,
        dryRun: true
      });

      let execution = preflight;
      if (!this.dryRun) {
        execution = await this.executor({
          dryRun: false,
          mode: 'commit',
          policies,
          alertThreshold: this.alertThreshold,
          onAlert: (payload) => this.handleAlert({ ...payload, trigger }),
          emitEvents: true
        });
      } else {
        this.anomalies = preflightAnomalies;
      }

      const completedAt = this.nowProvider();
      const summary = buildRunSummary({
        trigger,
        startedAt,
        completedAt,
        dryRun: this.dryRun,
        policies,
        preflight: { ...preflight, anomalies: preflightAnomalies },
        execution: { ...execution, anomalies: this.anomalies },
        anomalies: this.anomalies
      });

      this.consecutiveFailures = 0;
      this.pausedUntil = null;
      await this.clearResumeGate();
      this.lastSummary = summary;
      this.recordMetrics(summary);

      this.logger.info(
        {
          trigger,
          dryRun: this.dryRun,
          executedPolicies: summary.totals.executed ?? summary.totals.simulated ?? 0,
          failedPolicies: summary.totals.failed ?? 0,
          anomalies: summary.anomalies.length
        },
        'Data retention execution completed'
      );

      return summary;
    } catch (error) {
      await this.handleFailure({ error, trigger });
      throw error;
    }
  }

  async handleFailure({ error, trigger }) {
    this.consecutiveFailures += 1;
    this.logger.error(
      { err: error, trigger, consecutiveFailures: this.consecutiveFailures },
      'Data retention execution failed'
    );

    if (this.consecutiveFailures >= this.maxConsecutiveFailures) {
      const pauseMinutes = this.computePauseDurationMinutes();
      this.failureEscalations += 1;
      const pauseMs = pauseMinutes * 60 * 1000;
      this.pausedUntil = new Date(this.nowProvider().getTime() + pauseMs);
      this.consecutiveFailures = 0;
      this.logger.warn(
        {
          trigger,
          resumeAt: this.pausedUntil.toISOString(),
          failureBackoffMinutes: pauseMinutes
        },
        'Pausing data retention job after repeated failures'
      );
      await this.recordPause({ trigger, error });
    }
  }

  async runOnce() {
    return this.runCycle('manual');
  }

  stop() {
    if (this.task) {
      if (typeof this.task.stop === 'function') {
        this.task.stop();
      }
      if (typeof this.task.destroy === 'function') {
        this.task.destroy();
      }
      this.task = null;
      this.logger.info('Data retention job stopped');
    }
  }
}

export function createDataRetentionJob(options = {}) {
  return new DataRetentionJob(options);
}

const dataRetentionJob = createDataRetentionJob();

export default dataRetentionJob;
