import cron from 'node-cron';

import { env } from '../config/env.js';
import logger from '../config/logger.js';
import DomainEventModel from '../models/DomainEventModel.js';
import { enforceRetentionPolicies } from '../services/dataRetentionService.js';
import AuditEventService from '../services/AuditEventService.js';
import governanceStakeholderService from '../services/GovernanceStakeholderService.js';

function ensurePositiveInteger(value, fallback) {
  const parsed = Number.isFinite(value) ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.floor(parsed);
}

function ensureArray(value) {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry).trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(/[\s,]+/)
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
  return [String(value)].filter(Boolean);
}

const DEFAULT_VERIFICATION = Object.freeze({ enabled: true, failOnResidual: true, sampleSize: 5 });

function normaliseVerificationConfig(config = {}) {
  const enabled = config.enabled !== false;
  const failOnResidual = config.failOnResidual !== false;
  const sampleSize = ensurePositiveInteger(config.sampleSize, DEFAULT_VERIFICATION.sampleSize);
  return {
    enabled,
    failOnResidual,
    sampleSize
  };
}

const DEFAULT_REPORTING = Object.freeze({
  enabled: true,
  channel: 'governance.compliance',
  audience: []
});

function normaliseReportingConfig(config = {}) {
  const enabled = config.enabled !== false;
  const channel = config.channel ?? DEFAULT_REPORTING.channel;
  const audience = ensureArray(config.audience ?? DEFAULT_REPORTING.audience);
  return {
    enabled,
    channel,
    audience
  };
}

function computeTotals(executed = []) {
  return executed.reduce(
    (acc, entry) => {
      const affected = Number(entry.affectedRows ?? 0);
      const matched = Number(entry.preRunCount ?? entry.affectedRows ?? 0);
      acc.affectedRows += affected;
      acc.matchedRows += matched;
      if (entry.verification?.status === 'residual') {
        acc.residualPolicies.push({
          policyId: entry.policyId,
          entityName: entry.entityName,
          remainingRows: Number(entry.verification?.remainingRows ?? 0)
        });
      }
      return acc;
    },
    { affectedRows: 0, matchedRows: 0, residualPolicies: [] }
  );
}

function formatPolicyLine(entry) {
  const affected = Number(entry.affectedRows ?? 0);
  const verification = entry.verification?.status
    ? `${entry.verification.status}${
        entry.verification.status === 'residual'
          ? ` (${Number(entry.verification.remainingRows ?? 0)} remaining)`
          : ''
      }`
    : 'no verification';
  return `• ${entry.entityName ?? entry.policyId}: ${affected} rows — ${verification}`;
}

function formatFailureLine(entry) {
  return `• ${entry.entityName ?? entry.policyId}: ${entry.error ?? 'unknown error'}`;
}

function computeAuditSeverity({ executed, failed, dryRun }) {
  if (dryRun) {
    return 'info';
  }
  if ((failed?.length ?? 0) > 0) {
    return 'warning';
  }
  if (executed?.some((entry) => entry.verification?.status === 'residual')) {
    return 'warning';
  }
  return 'notice';
}

function createRunIdentifier(summary) {
  return summary?.runId ?? `data-retention-${Date.now()}`;
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
    executor = enforceRetentionPolicies,
    scheduler = cron,
    loggerInstance = logger.child({ module: 'data-retention-job' }),
    verification = env.retention.verification ?? DEFAULT_VERIFICATION,
    reporting = env.retention.reporting ?? DEFAULT_REPORTING,
    auditService = null,
    stakeholderService = null,
    domainEventModel = null
  } = {}) {
    this.enabled = Boolean(enabled);
    this.schedule = schedule;
    this.timezone = timezone;
    this.dryRun = Boolean(dryRun);
    this.runOnStartup = Boolean(runOnStartup);
    this.executor = executor;
    this.scheduler = scheduler;
    this.logger = loggerInstance;
    this.task = null;
    this.consecutiveFailures = 0;
    this.pausedUntil = null;
    this.lastSummary = null;
    this.maxConsecutiveFailures = ensurePositiveInteger(maxConsecutiveFailures, 3);
    this.failureBackoffMinutes = ensurePositiveInteger(failureBackoffMinutes, 15);
    this.verification = normaliseVerificationConfig(verification ?? {});
    this.reporting = normaliseReportingConfig(reporting ?? {});
    this.auditService = auditService && typeof auditService.record === 'function' ? auditService : null;
    this.stakeholderService =
      stakeholderService && typeof stakeholderService.scheduleCommunication === 'function'
        ? stakeholderService
        : null;
    this.domainEventModel =
      domainEventModel && typeof domainEventModel.record === 'function' ? domainEventModel : null;

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

    if (this.runOnStartup) {
      this.runCycle('startup').catch((error) => {
        this.logger.error({ err: error }, 'Startup data retention cycle failed');
      });
    }
  }

  async runCycle(trigger = 'manual') {
    if (!this.enabled) {
      this.logger.warn({ trigger }, 'Data retention job invoked while disabled');
      return null;
    }

    if (this.pausedUntil && Date.now() < this.pausedUntil.getTime()) {
      this.logger.warn(
        { trigger, resumeAt: this.pausedUntil.toISOString() },
        'Data retention job paused after repeated failures'
      );
      return null;
    }

    try {
      const summary = await this.executor({
        dryRun: this.dryRun,
        verification: this.verification
      });
      const executed = summary?.results?.filter((entry) => entry.status === 'executed') ?? [];
      const failed = summary?.results?.filter((entry) => entry.status === 'failed') ?? [];

      this.consecutiveFailures = 0;
      this.pausedUntil = null;
      this.lastSummary = summary;

      this.logger.info(
        { trigger, dryRun: this.dryRun, executedPolicies: executed.length, failedPolicies: failed.length },
        'Data retention execution completed'
      );

      await this.dispatchSummary({ trigger, summary, executed, failed });

      return summary;
    } catch (error) {
      this.consecutiveFailures += 1;
      this.logger.error(
        { err: error, trigger, consecutiveFailures: this.consecutiveFailures },
        'Data retention execution failed'
      );

      if (this.consecutiveFailures >= this.maxConsecutiveFailures) {
        const pauseMs = this.failureBackoffMinutes * 60 * 1000;
        this.pausedUntil = new Date(Date.now() + pauseMs);
        this.consecutiveFailures = 0;
        this.logger.warn(
          {
            trigger,
            resumeAt: this.pausedUntil.toISOString(),
            failureBackoffMinutes: this.failureBackoffMinutes
          },
          'Pausing data retention job after repeated failures'
        );
      }

      throw error;
    }
  }

  async runOnce() {
    return this.runCycle('manual');
  }

  async dispatchSummary({ trigger, summary, executed, failed }) {
    const tasks = [
      this.recordAuditSummary({ trigger, summary, executed, failed }),
      this.publishDomainEvent({ trigger, summary, executed, failed }),
      this.notifyStakeholders({ trigger, summary, executed, failed })
    ];

    for (const task of tasks) {
      if (!task) {
        continue;
      }
      try {
        await task;
      } catch (error) {
        this.logger.error(
          { err: error, trigger, runId: summary?.runId ?? null },
          'Failed to publish data retention post-run signal'
        );
      }
    }
  }

  async recordAuditSummary({ trigger, summary, executed, failed }) {
    if (!this.auditService) {
      return null;
    }

    const totals = computeTotals(executed);
    const severity = computeAuditSeverity({ executed, failed, dryRun: this.dryRun });
    const eventType = this.dryRun ? 'governance.data_retention.simulated' : 'governance.data_retention.completed';
    const entityId = createRunIdentifier(summary);

    const metadata = {
      trigger,
      dryRun: this.dryRun,
      runId: summary?.runId ?? null,
      totals: {
        executed: executed.length,
        failed: failed.length,
        affectedRows: totals.affectedRows,
        matchedRows: totals.matchedRows
      },
      residualPolicies: totals.residualPolicies,
      failures: failed.map((entry) => ({
        policyId: entry.policyId,
        entityName: entry.entityName,
        error: entry.error
      }))
    };

    await this.auditService.record({
      eventType,
      entityType: 'governance.data_retention_run',
      entityId,
      severity,
      metadata
    });

    return null;
  }

  async publishDomainEvent({ trigger, summary, executed, failed }) {
    if (!this.domainEventModel) {
      return null;
    }

    const totals = computeTotals(executed);
    const entityId = createRunIdentifier(summary);
    const eventType = this.dryRun ? 'governance.data_retention.simulated' : 'governance.data_retention.completed';

    const payload = {
      trigger,
      dryRun: this.dryRun,
      runId: summary?.runId ?? null,
      totals,
      executed: executed.map((entry) => ({
        policyId: entry.policyId,
        entityName: entry.entityName,
        affectedRows: entry.affectedRows,
        verification: entry.verification ?? null
      })),
      failures: failed.map((entry) => ({
        policyId: entry.policyId,
        entityName: entry.entityName,
        error: entry.error
      }))
    };

    await this.domainEventModel.record(
      {
        entityType: 'governance.data_retention_run',
        entityId,
        eventType,
        payload,
        performedBy: 'system'
      },
      {
        dispatchMetadata: {
          channel: this.reporting.channel,
          tags: ['data-retention', this.dryRun ? 'dry-run' : 'commit'],
          audience: this.reporting.audience
        }
      }
    );

    return null;
  }

  async notifyStakeholders({ trigger, summary, executed, failed }) {
    if (this.dryRun || !this.reporting.enabled || !this.stakeholderService) {
      return null;
    }

    const totals = computeTotals(executed);
    const entityId = createRunIdentifier(summary);
    const executedLines = executed.length ? executed.map(formatPolicyLine).join('\n') : '• No policies executed';
    const failureLines = failed.length
      ? `\n\nPolicies requiring attention:\n${failed.map(formatFailureLine).join('\n')}`
      : '';

    const body = [
      `Run ${entityId} triggered via ${trigger}.`,
      '',
      'Policies enforced:',
      executedLines,
      failureLines,
      '',
      `Total rows impacted: ${totals.affectedRows}`
    ]
      .filter(Boolean)
      .join('\n');

    const audience = this.reporting.audience.length ? this.reporting.audience.join(',') : 'compliance';
    const subject = failed.length
      ? `Data retention run ${entityId} — action required`
      : `Data retention run ${entityId} summary`;

    await this.stakeholderService.scheduleCommunication({
      slug: entityId,
      audience,
      channel: this.reporting.channel,
      subject,
      body,
      status: 'scheduled',
      scheduleAt: new Date().toISOString(),
      metrics: {
        targetAudience: this.reporting.audience,
        expectedRecipients: this.reporting.audience.length,
        delivered: 0,
        engagementRate: 0
      },
      metadata: {
        trigger,
        dryRun: this.dryRun,
        runId: summary?.runId ?? null,
        totals
      }
    });

    return null;
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

const dataRetentionJob = createDataRetentionJob({
  auditService: new AuditEventService({
    loggerInstance: logger.child({ module: 'data-retention-audit' })
  }),
  stakeholderService: governanceStakeholderService,
  domainEventModel: DomainEventModel
});

export default dataRetentionJob;
