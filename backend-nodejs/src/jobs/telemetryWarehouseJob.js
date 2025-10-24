import cron from 'node-cron';

import { env } from '../config/env.js';
import logger from '../config/logger.js';
import telemetryWarehouseService from '../services/TelemetryWarehouseService.js';
import { recordBackgroundJobRun } from '../observability/metrics.js';

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
    config = env.telemetry.export,
    enabled = config?.enabled,
    schedule = config?.cronExpression ?? '*/5 * * * *',
    timezone = config?.timezone ?? 'Etc/UTC',
    runOnStartup = config?.runOnStartup !== false,
    maxConsecutiveFailures = 3,
    failureBackoffMinutes = 5,
    loggerInstance = logger.child({ module: 'telemetry-warehouse-job' })
  } = {}) {
    this.service = service;
    this.scheduler = scheduler;
    this.exportConfig = config ?? env.telemetry.export ?? {};
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
    const backpressureSeconds = ensurePositiveInteger(this.exportConfig?.backpressureSeconds, 30);
    this.backpressureDelayMs = backpressureSeconds * 1000;
    this.maxBackpressureCycles = ensurePositiveInteger(this.exportConfig?.maxBackpressureCycles, 3);
    this.backpressureCycles = 0;
    this.backpressureTimer = null;
    this.jobKey = 'telemetry.warehouse.export';
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

    const startTime = process.hrtime.bigint();

    try {
      const summary = await this.service.exportPendingEvents({ trigger });
      this.consecutiveFailures = 0;
      this.pausedUntil = null;
      const durationMs = Number((process.hrtime.bigint() - startTime) / 1000000n);
      const exportedCount = summary?.exported ?? 0;
      const status = summary?.status ?? 'unknown';
      const outcome =
        status === 'exported'
          ? summary?.hasBacklog
            ? 'partial'
            : 'succeeded'
          : status === 'noop'
            ? 'idle'
            : status === 'disabled'
              ? 'skipped'
              : 'unknown';

      recordBackgroundJobRun({
        job: this.jobKey,
        trigger,
        outcome,
        durationMs,
        processed: exportedCount,
        succeeded: status === 'exported' ? exportedCount : 0,
        failed: 0
      });

      if (status === 'exported' && summary?.hasBacklog) {
        this.scheduleBackpressureFlush(trigger, summary);
      } else {
        this.resetBackpressureState();
      }

      this.logger.info({ trigger, summary, durationMs, outcome }, 'Telemetry export cycle completed');
      return summary;
    } catch (error) {
      const durationMs = Number((process.hrtime.bigint() - startTime) / 1000000n);
      this.consecutiveFailures += 1;
      this.logger.error({ err: error, trigger, consecutiveFailures: this.consecutiveFailures }, 'Telemetry export cycle failed');

      this.resetBackpressureState();

      if (this.consecutiveFailures >= this.maxConsecutiveFailures) {
        const pauseMs = this.failureBackoffMinutes * 60 * 1000;
        this.pausedUntil = new Date(Date.now() + pauseMs);
        this.consecutiveFailures = 0;
        this.logger.warn(
          { trigger, resumeAt: this.pausedUntil.toISOString(), failureBackoffMinutes: this.failureBackoffMinutes },
          'Pausing telemetry export job after repeated failures'
        );
      }

      recordBackgroundJobRun({
        job: this.jobKey,
        trigger,
        outcome: 'failed',
        durationMs,
        processed: 0,
        succeeded: 0,
        failed: 0
      });

      throw error;
    }
  }

  scheduleBackpressureFlush(trigger, summary) {
    if (!this.enabled || this.maxBackpressureCycles <= 0) {
      return;
    }

    if (this.backpressureCycles >= this.maxBackpressureCycles) {
      this.logger.warn(
        {
          trigger,
          cycle: this.backpressureCycles,
          maxCycles: this.maxBackpressureCycles
        },
        'Telemetry backlog flush limit reached; awaiting next scheduled run'
      );
      return;
    }

    this.backpressureCycles += 1;
    if (this.backpressureTimer) {
      clearTimeout(this.backpressureTimer);
      this.backpressureTimer = null;
    }

    this.backpressureTimer = setTimeout(() => {
      this.backpressureTimer = null;
      this.runCycle('backpressure').catch((error) => {
        this.logger.error({ err: error }, 'Backpressure telemetry export cycle failed');
      });
    }, this.backpressureDelayMs);

    this.logger.info(
      {
        trigger,
        delayMs: this.backpressureDelayMs,
        cycle: this.backpressureCycles,
        maxCycles: this.maxBackpressureCycles,
        exported: summary?.exported ?? 0
      },
      'Scheduled additional telemetry export to drain backlog'
    );
  }

  resetBackpressureState() {
    if (this.backpressureTimer) {
      clearTimeout(this.backpressureTimer);
      this.backpressureTimer = null;
    }
    this.backpressureCycles = 0;
  }

  async runOnce() {
    return this.runCycle('manual');
  }

  stop() {
    this.resetBackpressureState();
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
