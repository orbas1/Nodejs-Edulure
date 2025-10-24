import { randomUUID } from 'crypto';
import cron from 'node-cron';

import { env } from '../config/env.js';
import logger from '../config/logger.js';
import JobStateModel from '../models/JobStateModel.js';
import { recordBackgroundJobRun, recordDataPartitionOutcome } from '../observability/metrics.js';
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
    loggerInstance = logger.child({ module: 'data-partition-job' }),
    jobStateModel = JobStateModel,
    jobName = 'data-partition-job'
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
    this.jobStateModel = jobStateModel;
    this.jobName = jobName;
    this.maxConsecutiveFailures = ensurePositiveInteger(maxConsecutiveFailures, 3);
    this.failureBackoffMinutes = ensurePositiveInteger(failureBackoffMinutes, 30);
    this.task = null;
    this.consecutiveFailures = 0;
    this.pausedUntil = null;
    this.lastSummary = null;
    this.stateInitialised = false;
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
    await this.hydrateStateFromStore();

    if (!this.enabled) {
      this.logger.warn({ trigger }, 'Data partition job invoked while disabled');
      return null;
    }

    if (this.pausedUntil && Date.now() < this.pausedUntil.getTime()) {
      this.logger.warn(
        { trigger, resumeAt: this.pausedUntil.toISOString() },
        'Data partition job paused after repeated failures'
      );
      recordBackgroundJobRun({
        jobName: this.jobName,
        trigger,
        status: 'paused',
        durationSeconds: 0,
        processed: 0
      });
      return null;
    }

    const cycleStart = process.hrtime.bigint();
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

      const durationSeconds = Number(process.hrtime.bigint() - cycleStart) / 1_000_000_000;
      await this.persistSuccessState({ trigger, summary, durationSeconds });

      recordBackgroundJobRun({
        jobName: this.jobName,
        trigger,
        status: 'completed',
        durationSeconds: Number.isFinite(durationSeconds) ? durationSeconds : 0,
        processed: summary?.results?.length ?? 0
      });

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

      const durationSeconds = Number(process.hrtime.bigint() - cycleStart) / 1_000_000_000;
      await this.persistFailureState({ trigger, error, durationSeconds });

      recordBackgroundJobRun({
        jobName: this.jobName,
        trigger,
        status: 'failed',
        durationSeconds: Number.isFinite(durationSeconds) ? durationSeconds : 0,
        processed: 0
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
      this.logger.info('Data partition job stopped');
    }
  }

  async hydrateStateFromStore() {
    if (!this.jobStateModel?.get || this.stateInitialised) {
      return;
    }

    try {
      const record = await this.jobStateModel.get(this.jobName);
      const state = record?.state ?? {};

      if (Number.isFinite(Number(state.consecutiveFailures))) {
        this.consecutiveFailures = Number(state.consecutiveFailures);
      }

      if (state.pausedUntil) {
        const paused = new Date(state.pausedUntil);
        if (!Number.isNaN(paused.getTime())) {
          this.pausedUntil = paused;
        }
      }

      this.stateInitialised = true;
    } catch (error) {
      this.logger.error({ err: error }, 'Failed to hydrate data partition job state');
    }
  }

  async persistSuccessState({ trigger, summary, durationSeconds }) {
    if (!this.jobStateModel?.update) {
      return;
    }

    const runId = summary?.runId ?? randomUUID();
    const executedAt = summary?.executedAt ? new Date(summary.executedAt) : new Date();

    const aggregates = (summary?.results ?? []).map((result) => {
      const tableName = result?.tableName ?? 'unknown';
      const archivedEntries = Array.isArray(result?.archived) ? result.archived : [];
      const ensuredEntries = Array.isArray(result?.ensured) ? result.ensured : [];

      const stats = {
        tableName,
        archived: 0,
        plannedArchive: 0,
        failed: 0,
        dropped: 0,
        skipped: 0,
        ensured: 0
      };

      for (const entry of archivedEntries) {
        const outcome = entry?.status ?? 'unknown';
        if (outcome === 'archived') {
          stats.archived += 1;
        } else if (outcome === 'planned-archive' || outcome === 'planned') {
          stats.plannedArchive += 1;
        } else if (outcome === 'failed') {
          stats.failed += 1;
        } else if (outcome === 'dropped') {
          stats.dropped += 1;
        } else if (outcome === 'skipped') {
          stats.skipped += 1;
        }

        recordDataPartitionOutcome({
          table: tableName,
          outcome,
          count: 1,
          bytes: Number(entry?.byteSize ?? 0)
        });
      }

      for (const entry of ensuredEntries) {
        const outcome = entry?.status ?? 'created';
        stats.ensured += 1;
        recordDataPartitionOutcome({ table: tableName, outcome: `ensure_${outcome}`, count: 1 });
      }

      return stats;
    });

    const totals = aggregates.reduce(
      (acc, entry) => ({
        archived: acc.archived + entry.archived,
        plannedArchive: acc.plannedArchive + entry.plannedArchive,
        failed: acc.failed + entry.failed,
        dropped: acc.dropped + entry.dropped,
        skipped: acc.skipped + entry.skipped,
        ensured: acc.ensured + entry.ensured
      }),
      { archived: 0, plannedArchive: 0, failed: 0, dropped: 0, skipped: 0, ensured: 0 }
    );

    try {
      await this.jobStateModel.update(this.jobName, (current = {}) => {
        const previousRuns = Array.isArray(current.recentRuns) ? current.recentRuns : [];
        const runRecord = {
          runId,
          trigger,
          runAt: executedAt.toISOString(),
          status: 'completed',
          dryRun: Boolean(summary?.dryRun),
          durationSeconds: Number.isFinite(durationSeconds) ? Number(durationSeconds.toFixed(3)) : null,
          archived: totals.archived,
          planned: totals.plannedArchive,
          failed: totals.failed
        };

        return {
          ...current,
          lastRunId: runId,
          lastRunAt: runRecord.runAt,
          lastTrigger: trigger,
          lastStatus: 'completed',
          consecutiveFailures: 0,
          pausedUntil: null,
          lastSummary: {
            dryRun: Boolean(summary?.dryRun),
            archived: totals.archived,
            planned: totals.plannedArchive,
            failed: totals.failed,
            dropped: totals.dropped,
            skipped: totals.skipped,
            ensured: totals.ensured,
            tables: aggregates
          },
          recentRuns: [runRecord, ...previousRuns].slice(0, 20)
        };
      });
    } catch (error) {
      this.logger.error({ err: error }, 'Failed to persist data partition job success state');
    }
  }

  async persistFailureState({ trigger, error, durationSeconds }) {
    if (!this.jobStateModel?.update) {
      return;
    }

    const runId = randomUUID();
    const now = new Date();

    try {
      await this.jobStateModel.update(this.jobName, (current = {}) => {
        const previousRuns = Array.isArray(current.recentRuns) ? current.recentRuns : [];
        const previousFailures = Number.isFinite(Number(current.consecutiveFailures))
          ? Number(current.consecutiveFailures)
          : 0;
        const nextFailures = this.pausedUntil ? 0 : previousFailures + 1;

        return {
          ...current,
          lastRunId: runId,
          lastRunAt: now.toISOString(),
          lastTrigger: trigger,
          lastStatus: 'failed',
          consecutiveFailures: nextFailures,
          pausedUntil: this.pausedUntil ? this.pausedUntil.toISOString() : current.pausedUntil ?? null,
          lastError: {
            message: error.message ?? 'unknown',
            stack: error.stack ?? null,
            occurredAt: now.toISOString()
          },
          recentRuns: [
            {
              runId,
              trigger,
              runAt: now.toISOString(),
              status: 'failed',
              durationSeconds: Number.isFinite(durationSeconds) ? Number(durationSeconds.toFixed(3)) : null,
              error: error.message ?? 'unknown'
            },
            ...previousRuns
          ].slice(0, 20)
        };
      });
    } catch (stateError) {
      this.logger.error({ err: stateError }, 'Failed to persist data partition job failure state');
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
