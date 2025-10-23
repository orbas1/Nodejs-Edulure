import cron from 'node-cron';

import { env } from '../../config/env.js';
import logger from '../../config/logger.js';
import searchIngestionService from '../../services/SearchIngestionService.js';
import { recordSearchIngestionRun } from '../../observability/metrics.js';
import { schedulerCheckpointModel } from '../../models/SchedulerCheckpointModel.js';
import { LOG_PREFIXES } from '../../servers/runtimeOptions.js';

const JOB_PREFIX = LOG_PREFIXES.jobs;
const annotate = (message) => (JOB_PREFIX ? `${JOB_PREFIX} ${message}` : message);
const jobLogger = logger.child({ job: 'search-documents-refresh' });

function resolveSchedule() {
  const schedule = env.search?.ingestion?.schedule ?? '*/30 * * * *';
  const timezone = env.search?.ingestion?.timezone ?? 'UTC';
  return { schedule, timezone };
}

export class RefreshSearchDocumentsJob {
  constructor({
    enabled = true,
    ingestionService = searchIngestionService,
    scheduler = cron,
    loggerInstance = jobLogger,
    checkpointStore = schedulerCheckpointModel
  } = {}) {
    this.enabled = enabled;
    this.ingestionService = ingestionService;
    this.scheduler = scheduler;
    this.logger = loggerInstance;
    this.task = null;
    this.running = false;
    this.checkpoints = checkpointStore;
  }

  start() {
    if (!this.enabled) {
      this.logger.warn(annotate('Search documents refresh job disabled'));
      return;
    }

    if (this.task) {
      return;
    }

    const { schedule, timezone } = resolveSchedule();
    const validate = this.scheduler.validate ?? (() => true);
    if (!validate(schedule)) {
      throw new Error(`Invalid search documents refresh cron expression: "${schedule}"`);
    }

    this.task = this.scheduler.schedule(
      schedule,
      () => {
        this.runCycle('scheduled').catch((error) => {
          this.logger.error({ err: error }, 'Unhandled search documents refresh error');
        });
      },
      { timezone }
    );

    if (typeof this.task.start === 'function') {
      this.task.start();
    }

    this.logger.info({ schedule, timezone }, annotate('Search documents refresh job scheduled'));
  }

  async runCycle(trigger = 'manual') {
    if (!this.enabled) {
      this.logger.warn({ trigger }, annotate('Search documents refresh invoked while disabled'));
      return;
    }

    if (this.running) {
      this.logger.warn({ trigger }, annotate('Search documents refresh already running'));
      return;
    }

    this.running = true;
    const start = Date.now();

    try {
      const results = await this.ingestionService.fullReindex();
      const documentCount = Array.isArray(results)
        ? results.reduce((total, entry) => total + Number(entry?.documentCount ?? 0), 0)
        : 0;
      const entities = Array.isArray(results) ? results.map((entry) => entry.entity).filter(Boolean) : [];
      const durationSeconds = (Date.now() - start) / 1000;
      recordSearchIngestionRun({ index: 'all', documentCount: 0, durationSeconds, status: 'success' });
      await this.checkpoints.recordRun('search.refresh', {
        status: 'success',
        ranAt: new Date(),
        metadata: {
          trigger,
          durationSeconds,
          documentCount,
          entities
        }
      });
      this.logger.info({ trigger, durationSeconds, documentCount }, annotate('Search documents refresh completed'));
    } catch (error) {
      const durationSeconds = (Date.now() - start) / 1000;
      recordSearchIngestionRun({ index: 'all', documentCount: 0, durationSeconds, status: 'error', error });
      await this.checkpoints.recordRun('search.refresh', {
        status: 'error',
        ranAt: new Date(),
        metadata: {
          trigger,
          durationSeconds
        },
        errorMessage: error.message ?? String(error)
      });
      this.logger.error({ err: error, trigger }, annotate('Search documents refresh failed'));
      throw error;
    } finally {
      this.running = false;
    }
  }

  async stop() {
    if (this.task) {
      if (typeof this.task.stop === 'function') {
        this.task.stop();
      }
      if (typeof this.task.destroy === 'function') {
        this.task.destroy();
      }
      this.task = null;
      this.logger.info(annotate('Search documents refresh job stopped'));
    }
  }
}

const refreshSearchDocumentsJob = new RefreshSearchDocumentsJob({ enabled: true });

export default refreshSearchDocumentsJob;
