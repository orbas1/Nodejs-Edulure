import cron from 'node-cron';

import { env } from '../config/env.js';
import logger from '../config/logger.js';
import { runCreationWorkspaceMaintenance } from '../services/CreationWorkspaceMaintenanceService.js';

export class CreationWorkspaceMaintenanceJob {
  constructor({
    enabled = env.creationWorkspace.scheduler.enabled,
    schedule = env.creationWorkspace.scheduler.cronExpression,
    timezone = env.creationWorkspace.scheduler.timezone,
    runOnStartup = env.creationWorkspace.scheduler.runOnStartup,
    warningThresholdHours = env.creationWorkspace.checklist.warningThresholdHours,
    escalationThresholdHours = env.creationWorkspace.checklist.escalationThresholdHours,
    executor = runCreationWorkspaceMaintenance,
    scheduler = cron,
    loggerInstance = logger.child({ module: 'creation-workspace-maintenance-job' })
  } = {}) {
    this.enabled = Boolean(enabled);
    this.schedule = schedule;
    this.timezone = timezone;
    this.runOnStartup = Boolean(runOnStartup);
    this.warningThresholdHours = warningThresholdHours;
    this.escalationThresholdHours = escalationThresholdHours;
    this.executor = executor;
    this.scheduler = scheduler;
    this.logger = loggerInstance;
    this.task = null;

    if (typeof this.executor !== 'function') {
      throw new Error('CreationWorkspaceMaintenanceJob requires an executor function.');
    }

    if (!this.schedule || typeof this.schedule !== 'string') {
      throw new Error('CreationWorkspaceMaintenanceJob requires a cron schedule string.');
    }

    if (!this.timezone || typeof this.timezone !== 'string') {
      throw new Error('CreationWorkspaceMaintenanceJob requires a valid timezone identifier.');
    }
  }

  start() {
    if (!this.enabled) {
      this.logger.warn('Creation workspace maintenance job disabled; skipping scheduler start.');
      return;
    }

    if (this.task) {
      return;
    }

    const validate = this.scheduler.validate ?? (() => true);
    if (!validate(this.schedule)) {
      throw new Error(`Invalid creation workspace cron expression: "${this.schedule}"`);
    }

    this.task = this.scheduler.schedule(
      this.schedule,
      () => {
        this.runCycle('scheduled').catch((error) => {
          this.logger.error({ err: error }, 'Unhandled creation workspace maintenance error');
        });
      },
      { timezone: this.timezone }
    );

    if (typeof this.task.start === 'function') {
      this.task.start();
    }

    this.logger.info(
      {
        schedule: this.schedule,
        timezone: this.timezone,
        warningThresholdHours: this.warningThresholdHours,
        escalationThresholdHours: this.escalationThresholdHours
      },
      'Creation workspace maintenance job scheduled'
    );

    if (this.runOnStartup) {
      this.runCycle('startup').catch((error) => {
        this.logger.error({ err: error }, 'Startup creation workspace maintenance run failed');
      });
    }
  }

  async runCycle(trigger = 'manual') {
    if (!this.enabled) {
      this.logger.warn({ trigger }, 'Creation workspace maintenance invoked while disabled');
      return null;
    }

    try {
      const summary = await this.executor({
        warningThresholdHours: this.warningThresholdHours,
        escalationThresholdHours: this.escalationThresholdHours
      });

      this.logger.info({ trigger, ...summary }, 'Creation workspace maintenance completed');
      return summary;
    } catch (error) {
      this.logger.error({ err: error, trigger }, 'Creation workspace maintenance failed');
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
      this.logger.info('Creation workspace maintenance job stopped');
    }
  }
}

export function createCreationWorkspaceMaintenanceJob(options = {}) {
  return new CreationWorkspaceMaintenanceJob(options);
}

const creationWorkspaceMaintenanceJob = createCreationWorkspaceMaintenanceJob();

export default creationWorkspaceMaintenanceJob;
