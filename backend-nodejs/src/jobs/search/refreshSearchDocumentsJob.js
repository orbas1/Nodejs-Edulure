import cron from 'node-cron';

import { env } from '../../config/env.js';
import logger from '../../config/logger.js';
import searchIngestionService from '../../services/SearchIngestionService.js';
import { recordSearchIngestionRun } from '../../observability/metrics.js';

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
    loggerInstance = jobLogger
  } = {}) {
    this.enabled = enabled;
    this.ingestionService = ingestionService;
    this.scheduler = scheduler;
    this.logger = loggerInstance;
    this.task = null;
    this.running = false;
  }

  start() {
    if (!this.enabled) {
      this.logger.warn('Search documents refresh job disabled');
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

    this.logger.info({ schedule, timezone }, 'Search documents refresh job scheduled');
  }

  async runCycle(trigger = 'manual') {
    if (!this.enabled) {
      this.logger.warn({ trigger }, 'Search documents refresh invoked while disabled');
      return;
    }

    if (this.running) {
      this.logger.warn({ trigger }, 'Search documents refresh already running');
      return;
    }

    this.running = true;
    const start = Date.now();

    try {
      await this.ingestionService.fullReindex();
      const durationSeconds = (Date.now() - start) / 1000;
      recordSearchIngestionRun({ index: 'all', documentCount: 0, durationSeconds, status: 'success' });
      this.logger.info({ trigger, durationSeconds }, 'Search documents refresh completed');
    } catch (error) {
      const durationSeconds = (Date.now() - start) / 1000;
      recordSearchIngestionRun({ index: 'all', documentCount: 0, durationSeconds, status: 'error', error });
      this.logger.error({ err: error, trigger }, 'Search documents refresh failed');
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
      this.logger.info('Search documents refresh job stopped');
    }
  }
}

const refreshSearchDocumentsJob = new RefreshSearchDocumentsJob({ enabled: true });

export default refreshSearchDocumentsJob;
