import cron from 'node-cron';

import { env } from '../config/env.js';
import logger from '../config/logger.js';
import MonetizationFinanceService from '../services/MonetizationFinanceService.js';

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

export class MonetizationReconciliationJob {
  constructor({
    service = MonetizationFinanceService,
    scheduler = cron,
    config = env.monetization.reconciliation,
    loggerInstance = logger.child({ module: 'monetization-reconciliation-job' }),
    maxConsecutiveFailures = 3,
    failureBackoffMinutes = 10
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

    try {
      const tenants = await this.resolveTenants();
      const windowEnd = new Date();
      const windowStart = new Date(windowEnd.getTime() - this.recognitionWindowDays * 24 * 60 * 60 * 1000);
      const windowStartIso = windowStart.toISOString();
      const windowEndIso = windowEnd.toISOString();

      const tenantSummaries = [];
      const failures = [];

      for (const tenantId of tenants) {
        try {
          const recognition = await this.service.recognizeDeferredRevenue({ tenantId });
          const reconciliation = await this.service.runReconciliation({
            tenantId,
            start: windowStartIso,
            end: windowEndIso
          });

          tenantSummaries.push({ tenantId, recognition, reconciliation });
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
        throw aggregateError;
      }

      this.consecutiveFailures = 0;
      this.pausedUntil = null;

      const summary = {
        trigger,
        windowStart: windowStartIso,
        windowEnd: windowEndIso,
        tenants: tenantSummaries
      };

      this.logger.info(summary, 'Monetization reconciliation cycle completed');
      return summary;
    } catch (error) {
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
}

const monetizationReconciliationJob = new MonetizationReconciliationJob();

export default monetizationReconciliationJob;

