import cron from 'node-cron';

import { env } from '../config/env.js';
import logger from '../config/logger.js';
import { enforceRetentionPolicies } from '../services/dataRetentionService.js';

function ensurePositiveInteger(value, fallback) {
  const parsed = Number.isFinite(value) ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.floor(parsed);
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
    loggerInstance = logger.child({ module: 'data-retention-job' })
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
      const summary = await this.executor({ dryRun: this.dryRun });
      const executed = summary?.results?.filter((entry) => entry.status === 'executed') ?? [];
      const failed = summary?.results?.filter((entry) => entry.status === 'failed') ?? [];

      this.consecutiveFailures = 0;
      this.pausedUntil = null;
      this.lastSummary = summary;

      this.logger.info(
        { trigger, dryRun: this.dryRun, executedPolicies: executed.length, failedPolicies: failed.length },
        'Data retention execution completed'
      );

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
