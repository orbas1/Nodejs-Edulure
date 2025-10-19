import cron from 'node-cron';

import { env } from '../config/env.js';
import logger from '../config/logger.js';
import telemetryWarehouseService from '../services/TelemetryWarehouseService.js';

function ensurePositiveInteger(value, fallback) {
  const parsed = Number.isFinite(value) ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.floor(parsed);
}

export class TelemetryWarehouseJob {
  constructor({
    service = telemetryWarehouseService,
    scheduler = cron,
    enabled = env.telemetry.export.enabled,
    schedule = env.telemetry.export.cronExpression ?? '*/5 * * * *',
    timezone = env.telemetry.export.timezone ?? 'Etc/UTC',
    runOnStartup = env.telemetry.export.runOnStartup !== false,
    maxConsecutiveFailures = 3,
    failureBackoffMinutes = 5,
    loggerInstance = logger.child({ module: 'telemetry-warehouse-job' })
  } = {}) {
    this.service = service;
    this.scheduler = scheduler;
    this.enabled = Boolean(enabled);
    this.schedule = schedule;
    this.timezone = timezone;
    this.runOnStartup = Boolean(runOnStartup);
    this.logger = loggerInstance;
    this.maxConsecutiveFailures = ensurePositiveInteger(maxConsecutiveFailures, 3);
    this.failureBackoffMinutes = ensurePositiveInteger(failureBackoffMinutes, 5);
    this.task = null;
    this.consecutiveFailures = 0;
    this.pausedUntil = null;
  }

  start() {
    if (!this.enabled) {
      this.logger.warn('Telemetry warehouse job disabled; skipping scheduler start.');
      return;
    }

    if (this.task) {
      return;
    }

    const validate = this.scheduler.validate ?? (() => true);
    if (!validate(this.schedule)) {
      throw new Error(`Invalid telemetry export cron expression: "${this.schedule}"`);
    }

    this.task = this.scheduler.schedule(
      this.schedule,
      () => {
        this.runCycle('scheduled').catch((error) => {
          this.logger.error({ err: error }, 'Unhandled telemetry export job error');
        });
      },
      { timezone: this.timezone }
    );

    if (typeof this.task.start === 'function') {
      this.task.start();
    }

    this.logger.info({ schedule: this.schedule, timezone: this.timezone }, 'Telemetry warehouse job scheduled');

    if (this.runOnStartup) {
      this.runCycle('startup').catch((error) => {
        this.logger.error({ err: error }, 'Startup telemetry export run failed');
      });
    }
  }

  async runCycle(trigger = 'manual') {
    if (!this.enabled) {
      this.logger.warn({ trigger }, 'Telemetry warehouse job invoked while disabled');
      return null;
    }

    if (this.pausedUntil && Date.now() < this.pausedUntil.getTime()) {
      this.logger.warn({ trigger, resumeAt: this.pausedUntil.toISOString() }, 'Telemetry export job paused after failures');
      return null;
    }

    try {
      const summary = await this.service.exportPendingEvents({ trigger });
      this.consecutiveFailures = 0;
      this.pausedUntil = null;
      this.logger.info({ trigger, summary }, 'Telemetry export cycle completed');
      return summary;
    } catch (error) {
      this.consecutiveFailures += 1;
      this.logger.error({ err: error, trigger, consecutiveFailures: this.consecutiveFailures }, 'Telemetry export cycle failed');

      if (this.consecutiveFailures >= this.maxConsecutiveFailures) {
        const pauseMs = this.failureBackoffMinutes * 60 * 1000;
        this.pausedUntil = new Date(Date.now() + pauseMs);
        this.consecutiveFailures = 0;
        this.logger.warn(
          { trigger, resumeAt: this.pausedUntil.toISOString(), failureBackoffMinutes: this.failureBackoffMinutes },
          'Pausing telemetry export job after repeated failures'
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
      this.logger.info('Telemetry warehouse job stopped');
    }
  }
}

const telemetryWarehouseJob = new TelemetryWarehouseJob();

export default telemetryWarehouseJob;
