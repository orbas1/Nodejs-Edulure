import { createHash } from 'node:crypto';

import cron from 'node-cron';

import { env } from '../config/env.js';
import logger from '../config/logger.js';
import MonetizationFinanceService from '../services/MonetizationFinanceService.js';
import MonetizationReconciliationRunModel from '../models/MonetizationReconciliationRunModel.js';
import MonetizationAlertNotificationService from '../services/MonetizationAlertNotificationService.js';
import { recordBackgroundJobRun } from '../observability/metrics.js';

function ensurePositiveInteger(value, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return fallback;
  }
  return Math.floor(numeric);
}

function normaliseTenantScope(value) {
  if (!value) {
    return 'global';
  }
  return String(value).trim().toLowerCase() || 'global';
}

function toInteger(value, fallback = 0) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  return Math.round(numeric);
}

function computeFailureDigest({ trigger, windowStart, windowEnd, tenantIds = [] }) {
  const hash = createHash('sha1');
  const normalisedTenants = Array.isArray(tenantIds)
    ? tenantIds.filter(Boolean).map((tenant) => String(tenant)).sort()
    : [];
  hash.update([trigger ?? 'unknown', windowStart ?? 'n/a', windowEnd ?? 'n/a', ...normalisedTenants].join('|'));
  return hash.digest('hex');
}

export class MonetizationReconciliationJob {
  constructor({
    service = MonetizationFinanceService,
    scheduler = cron,
    config = env.monetization.reconciliation,
    loggerInstance = logger.child({ module: 'monetization-reconciliation-job' }),
    maxConsecutiveFailures = 3,
    failureBackoffMinutes = 10,
    alertNotifier = new MonetizationAlertNotificationService()
  } = {}) {
    this.service = service;
    this.scheduler = scheduler;
    this.config = config;
    this.logger = loggerInstance;
    this.maxConsecutiveFailures = ensurePositiveInteger(maxConsecutiveFailures, 3);
    this.failureBackoffMinutes = ensurePositiveInteger(failureBackoffMinutes, 10);
    this.enabled = Boolean(config?.enabled);
    this.schedule = config?.cronExpression ?? '5 * * * *';
    this.timezone = config?.timezone ?? 'Etc/UTC';
    this.runOnStartup = config?.runOnStartup !== false;
    this.recognitionWindowDays = ensurePositiveInteger(config?.recognitionWindowDays, 30);
    this.tenantAllowlist = Array.isArray(config?.tenants)
      ? Array.from(new Set(config.tenants.map(normaliseTenantScope).filter(Boolean)))
      : Array.isArray(config?.tenantAllowlist)
        ? Array.from(new Set(config.tenantAllowlist.map(normaliseTenantScope).filter(Boolean)))
        : null;
    const cacheMinutes = ensurePositiveInteger(config?.tenantCacheMinutes ?? config?.tenantCacheTtlMinutes, 10);
    this.tenantCacheMs = cacheMinutes * 60 * 1000;
    this.tenantCache = { value: null, expiresAt: null };
    this.task = null;
    this.consecutiveFailures = 0;
    this.pausedUntil = null;
    this.jobKey = 'monetization.reconciliation';
    this.alertNotifier = alertNotifier;
    const cooldownMinutes = ensurePositiveInteger(
      config?.notifications?.jobFailureCooldownMinutes ?? config?.alertCooldownMinutes ?? 60,
      60
    );
    this.failureAlertCooldownMinutes = cooldownMinutes;
    this.failureAlertCooldownMs = cooldownMinutes * 60 * 1000;
    this.lastFailureAlertAt = null;
    this.lastFailureDigest = null;
  }

  start() {
    if (!this.enabled) {
      this.logger.warn('Monetization reconciliation job disabled; skipping scheduler start');
      return;
    }

    if (this.task) {
      return;
    }

    const validate = this.scheduler.validate ?? (() => true);
    if (!validate(this.schedule)) {
      throw new Error(`Invalid monetization reconciliation cron expression: "${this.schedule}"`);
    }

    this.task = this.scheduler.schedule(
      this.schedule,
      () => {
        this.runCycle('scheduled').catch((error) => {
          this.logger.error({ err: error }, 'Unhandled monetization reconciliation error');
        });
      },
      { timezone: this.timezone }
    );

    if (typeof this.task.start === 'function') {
      this.task.start();
    }

    this.logger.info({ schedule: this.schedule, timezone: this.timezone }, 'Monetization reconciliation scheduled');

    if (this.runOnStartup) {
      this.runCycle('startup').catch((error) => {
        this.logger.error({ err: error }, 'Startup monetization reconciliation failed');
      });
    }
  }

  async runCycle(trigger = 'manual') {
    if (!this.enabled) {
      this.logger.warn({ trigger }, 'Monetization reconciliation invoked while disabled');
      return { status: 'disabled' };
    }

    if (this.pausedUntil && Date.now() < this.pausedUntil.getTime()) {
      this.logger.warn({ trigger, resumeAt: this.pausedUntil.toISOString() }, 'Monetization job paused');
      return { status: 'paused', resumeAt: this.pausedUntil.toISOString() };
    }

    const startTime = process.hrtime.bigint();
    let windowStartIso = null;
    let windowEndIso = null;
    const tenantSummaries = [];
    const failures = [];
    let attemptedTenants = [];

    try {
      const tenants = await this.resolveTenants();
      attemptedTenants = tenants;
      const windowEnd = new Date();
      const windowStart = new Date(windowEnd.getTime() - this.recognitionWindowDays * 24 * 60 * 60 * 1000);
      windowStartIso = windowStart.toISOString();
      windowEndIso = windowEnd.toISOString();

      for (const tenantId of tenants) {
        try {
          const recognition = await this.service.recognizeDeferredRevenue({ tenantId });
          const reconciliation = await this.service.runReconciliation({
            tenantId,
            start: windowStartIso,
            end: windowEndIso
          });

          const metadata = reconciliation?.metadata ?? {};
          const alerts = Array.isArray(metadata.alerts) ? metadata.alerts : [];
          const alertCount = alerts.length;
          const acknowledgementCount = Array.isArray(metadata.acknowledgements)
            ? metadata.acknowledgements.length
            : 0;
          const currencyBreakdown = Array.isArray(metadata.currencyBreakdown)
            ? metadata.currencyBreakdown
            : [];

          if (alertCount > 0) {
            this.logger.warn(
              {
                tenantId,
                alertCount,
                severity: metadata?.severity ?? 'unknown',
                alerts: alerts.slice(0, 3),
                acknowledgements: acknowledgementCount
              },
              'Monetization reconciliation surfaced finance alerts'
            );
          }

          tenantSummaries.push({
            tenantId,
            recognition,
            reconciliation: {
              id: reconciliation?.id ?? null,
              status: reconciliation?.status ?? 'unknown',
              severity: metadata?.severity ?? 'normal',
              alertCount,
              acknowledgementCount,
              varianceCents: reconciliation?.varianceCents ?? 0,
              varianceBps: metadata?.varianceBps ?? 0,
              windowStart: reconciliation?.windowStart ?? windowStartIso,
              windowEnd: reconciliation?.windowEnd ?? windowEndIso,
              currencyBreakdown
            }
          });
        } catch (error) {
          failures.push({ tenantId, error });
          this.logger.error({ err: error, tenantId, trigger }, 'Monetization reconciliation failed for tenant');
        }
      }

      if (failures.length > 0) {
        const aggregateError = new Error(
          `Monetization reconciliation failed for ${failures.length} tenant${failures.length > 1 ? 's' : ''}`
        );
        aggregateError.name = 'MonetizationReconciliationError';
        aggregateError.details = { trigger, failures, partialResults: tenantSummaries };
        await this.maybeNotifyFailure({
          trigger,
          error: aggregateError,
          windowStart: windowStartIso,
          windowEnd: windowEndIso,
          failures,
          attemptedTenants
        });
        aggregateError.monetizationNotificationDispatched = true;
        throw aggregateError;
      }

      this.consecutiveFailures = 0;
      this.pausedUntil = null;

      try {
        await this.appendVarianceHistory(tenantSummaries);
      } catch (historyError) {
        this.logger.error({ err: historyError }, 'Failed to append monetization variance history');
      }

      const durationMs = Number((process.hrtime.bigint() - startTime) / 1000000n);
      const totalAlerts = tenantSummaries.reduce(
        (count, tenant) => count + toInteger(tenant.reconciliation?.alertCount, 0),
        0
      );
      const hasSevere = tenantSummaries.some((tenant) =>
        ['high', 'critical'].includes(String(tenant.reconciliation?.severity ?? '').toLowerCase())
      );
      const outcome = hasSevere || totalAlerts > 0 ? 'partial' : 'succeeded';

      recordBackgroundJobRun({
        job: this.jobKey,
        trigger,
        outcome,
        durationMs,
        processed: tenantSummaries.length,
        succeeded: tenantSummaries.length,
        failed: 0
      });

      const summary = {
        trigger,
        windowStart: windowStartIso,
        windowEnd: windowEndIso,
        tenants: tenantSummaries,
        alerts: totalAlerts,
        durationMs,
        outcome
      };

      this.logger.info(summary, 'Monetization reconciliation cycle completed');
      return summary;
    } catch (error) {
      const durationMs = Number((process.hrtime.bigint() - startTime) / 1000000n);
      if (!error?.monetizationNotificationDispatched) {
        await this.maybeNotifyFailure({
          trigger,
          error,
          windowStart: windowStartIso,
          windowEnd: windowEndIso,
          failures,
          attemptedTenants
        });
      }
      this.consecutiveFailures += 1;
      this.logger.error({ err: error, trigger, consecutiveFailures: this.consecutiveFailures }, 'Monetization reconciliation failed');

      if (this.consecutiveFailures >= this.maxConsecutiveFailures) {
        const pauseMs = this.failureBackoffMinutes * 60 * 1000;
        this.pausedUntil = new Date(Date.now() + pauseMs);
        this.consecutiveFailures = 0;
        this.logger.warn(
          { trigger, resumeAt: this.pausedUntil.toISOString(), failureBackoffMinutes: this.failureBackoffMinutes },
          'Pausing monetization reconciliation after repeated failures'
        );
      }

      recordBackgroundJobRun({
        job: this.jobKey,
        trigger,
        outcome: 'failed',
        durationMs,
        processed: attemptedTenants.length,
        succeeded: Math.max(0, tenantSummaries.length - failures.length),
        failed: failures.length || (attemptedTenants.length && tenantSummaries.length < attemptedTenants.length)
          ? Math.max(failures.length, attemptedTenants.length - tenantSummaries.length)
          : failures.length
      });

      throw error;
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
      this.logger.info('Monetization reconciliation job stopped');
    }
  }

  async resolveTenants() {
    if (this.tenantAllowlist && this.tenantAllowlist.length > 0) {
      return this.tenantAllowlist;
    }

    const now = Date.now();
    if (this.tenantCache.value && this.tenantCache.expiresAt && now < this.tenantCache.expiresAt) {
      return this.tenantCache.value;
    }

    const tenants = await this.service.listActiveTenants();
    const normalized = tenants.map(normaliseTenantScope).filter(Boolean);
    const resolved = normalized.length > 0 ? normalized : ['global'];

    this.tenantCache = {
      value: resolved,
      expiresAt: new Date(now + this.tenantCacheMs)
    };

    this.logger.debug({ tenants: resolved }, 'Resolved monetization tenants for reconciliation');
    return resolved;
  }

  async appendVarianceHistory(tenantSummaries = []) {
    if (!Array.isArray(tenantSummaries) || tenantSummaries.length === 0) {
      return;
    }

    const updates = tenantSummaries
      .filter((tenant) => tenant?.reconciliation?.id)
      .map((tenant) =>
        MonetizationReconciliationRunModel.updateMetadata(
          tenant.reconciliation.id,
          (metadata = {}) => {
            const history = Array.isArray(metadata.varianceHistory)
              ? metadata.varianceHistory.slice(-11)
              : [];
            const breakdown = Array.isArray(tenant.reconciliation?.currencyBreakdown)
              ? tenant.reconciliation.currencyBreakdown.slice(0, 10)
              : [];

            history.push({
              recordedAt: new Date().toISOString(),
              windowStart: tenant.reconciliation?.windowStart ?? null,
              windowEnd: tenant.reconciliation?.windowEnd ?? null,
              varianceCents: toInteger(tenant.reconciliation?.varianceCents, 0),
              varianceBps: toInteger(tenant.reconciliation?.varianceBps, 0),
              severity: tenant.reconciliation?.severity ?? 'unknown',
              alertCount: toInteger(tenant.reconciliation?.alertCount, 0),
              acknowledgementCount: toInteger(tenant.reconciliation?.acknowledgementCount, 0),
              currencyBreakdown: breakdown
            });

            return {
              ...metadata,
              varianceHistory: history.slice(-12)
            };
          }
        )
      );

    if (updates.length === 0) {
      return;
    }

    await Promise.all(updates);
  }

  async maybeNotifyFailure({
    trigger,
    error,
    windowStart,
    windowEnd,
    failures = [],
    attemptedTenants = []
  } = {}) {
    if (!this.alertNotifier || typeof this.alertNotifier.hasChannels !== 'function') {
      return;
    }

    if (!this.alertNotifier.hasChannels()) {
      return;
    }

    const tenantIds = (Array.isArray(failures) && failures.length > 0
      ? failures.map((failure) => failure?.tenantId)
      : attemptedTenants
    )
      .filter(Boolean)
      .map((tenant) => String(tenant));

    const digest = computeFailureDigest({ trigger, windowStart, windowEnd, tenantIds });
    const now = Date.now();

    if (
      this.lastFailureDigest === digest &&
      this.lastFailureAlertAt &&
      now - this.lastFailureAlertAt < this.failureAlertCooldownMs
    ) {
      return;
    }

    const evaluation = {
      severity: 'high',
      alerts: [
        {
          type: 'job.failure',
          severity: 'critical',
          message: `Reconciliation job failed for ${tenantIds.length || 'one or more'} tenant(s)`,
          suggestedAction: 'Inspect finance reconciliation logs and rerun after remediation.',
          details: {
            trigger,
            windowStart,
            windowEnd,
            tenants: tenantIds,
            errorMessage: error?.message ?? 'Unknown error'
          }
        }
      ],
      varianceBps: 0,
      usageVarianceBps: 0,
      thresholds: {
        alertCooldownMinutes: this.failureAlertCooldownMinutes
      }
    };

    const run = {
      id: null,
      tenantId: tenantIds.length === 1 ? tenantIds[0] : 'global',
      windowStart,
      windowEnd,
      varianceCents: 0,
      metadata: {}
    };

    try {
      await this.alertNotifier.dispatch({ run, evaluation, digest });
      this.lastFailureAlertAt = now;
      this.lastFailureDigest = digest;
      if (error && typeof error === 'object') {
        error.monetizationNotificationDispatched = true;
      }
    } catch (notifyError) {
      this.logger.error({ err: notifyError }, 'Failed to dispatch monetization reconciliation failure alert');
    }
  }
}

const monetizationReconciliationJob = new MonetizationReconciliationJob();

export default monetizationReconciliationJob;

