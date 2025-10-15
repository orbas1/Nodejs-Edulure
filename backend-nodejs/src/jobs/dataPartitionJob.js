import cron from 'node-cron';

import { env } from '../config/env.js';
import logger from '../config/logger.js';
import dataPartitionService from '../services/DataPartitionService.js';

function ensurePositiveInteger(value, fallback) {
  const parsed = Number.isFinite(value) ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.floor(parsed);
}

export class DataPartitionJob {
  constructor({
    enabled = env.partitioning.enabled,
    schedule = env.partitioning.cronExpression,
    timezone = env.partitioning.timezone,
    dryRun = env.partitioning.dryRun,
    runOnStartup = env.partitioning.runOnStartup,
    maxConsecutiveFailures = 3,
    failureBackoffMinutes = 30,
    executor = (options) => dataPartitionService.rotate(options),
    scheduler = cron,
    loggerInstance = logger.child({ module: 'data-partition-job' })
  } = {}) {
    if (!schedule || typeof schedule !== 'string') {
      throw new Error('DataPartitionJob requires a cron schedule string.');
    }

    if (!timezone || typeof timezone !== 'string') {
      throw new Error('DataPartitionJob requires a valid timezone identifier.');
    }

    if (typeof executor !== 'function') {
      throw new Error('DataPartitionJob requires an executor function.');
    }

    this.enabled = Boolean(enabled);
    this.schedule = schedule;
    this.timezone = timezone;
    this.dryRun = Boolean(dryRun);
    this.runOnStartup = Boolean(runOnStartup);
    this.executor = executor;
    this.scheduler = scheduler;
    this.logger = loggerInstance;
    this.maxConsecutiveFailures = ensurePositiveInteger(maxConsecutiveFailures, 3);
    this.failureBackoffMinutes = ensurePositiveInteger(failureBackoffMinutes, 30);
    this.task = null;
    this.consecutiveFailures = 0;
    this.pausedUntil = null;
    this.lastSummary = null;
  }

  start() {
    if (!this.enabled) {
      this.logger.warn('Data partition job disabled; skipping scheduler start.');
      return;
    }

    if (this.task) {
      return;
    }

    const validate = this.scheduler.validate ?? (() => true);
    if (!validate(this.schedule)) {
      throw new Error(`Invalid data partition cron expression: "${this.schedule}"`);
    }

    this.task = this.scheduler.schedule(
      this.schedule,
      () => {
        this.runCycle('scheduled').catch((error) => {
          this.logger.error({ err: error }, 'Unhandled data partition job error');
        });
      },
      { timezone: this.timezone }
    );

    if (typeof this.task.start === 'function') {
      this.task.start();
    }

    this.logger.info(
      { schedule: this.schedule, timezone: this.timezone, dryRun: this.dryRun },
      'Data partition job scheduled'
    );

    if (this.runOnStartup) {
      this.runCycle('startup').catch((error) => {
        this.logger.error({ err: error }, 'Startup data partition cycle failed');
      });
    }
  }

  async runCycle(trigger = 'manual') {
    if (!this.enabled) {
      this.logger.warn({ trigger }, 'Data partition job invoked while disabled');
      return null;
    }

    if (this.pausedUntil && Date.now() < this.pausedUntil.getTime()) {
      this.logger.warn(
        { trigger, resumeAt: this.pausedUntil.toISOString() },
        'Data partition job paused after repeated failures'
      );
      return null;
    }

    try {
      const summary = await this.executor({ dryRun: this.dryRun });
      this.lastSummary = summary;
      this.consecutiveFailures = 0;
      this.pausedUntil = null;

      const archived = summary?.results
        ?.flatMap((result) => result.archived ?? [])
        ?.filter((entry) => entry.status === 'archived')
        ?.length ?? 0;

      const planned = summary?.results
        ?.flatMap((result) => result.archived ?? [])
        ?.filter((entry) => entry.status === 'planned-archive')
        ?.length ?? 0;

      this.logger.info(
        { trigger, dryRun: this.dryRun, archivedPartitions: archived, plannedPartitions: planned },
        'Data partition job completed'
      );

      return summary;
    } catch (error) {
      this.consecutiveFailures += 1;
      this.logger.error(
        { err: error, trigger, consecutiveFailures: this.consecutiveFailures },
        'Data partition execution failed'
      );

      if (this.consecutiveFailures >= this.maxConsecutiveFailures) {
        const pauseMs = this.failureBackoffMinutes * 60 * 1000;
        this.pausedUntil = new Date(Date.now() + pauseMs);
        this.consecutiveFailures = 0;
        this.logger.warn(
          { trigger, resumeAt: this.pausedUntil.toISOString(), failureBackoffMinutes: this.failureBackoffMinutes },
          'Pausing data partition job after repeated failures'
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
      this.logger.info('Data partition job stopped');
    }
  }
}

export function createDataPartitionJob(options = {}) {
  return new DataPartitionJob(options);
}

const dataPartitionJob = createDataPartitionJob({
  maxConsecutiveFailures: env.partitioning?.maxConsecutiveFailures ?? 3,
  failureBackoffMinutes: env.partitioning?.failureBackoffMinutes ?? 30
});

export default dataPartitionJob;
