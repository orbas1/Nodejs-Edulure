import cron from 'node-cron';

import { env } from '../config/env.js';
import logger from '../config/logger.js';
import CommunityEventModel from '../models/CommunityEventModel.js';
import CommunityEventReminderModel from '../models/CommunityEventReminderModel.js';
import DomainEventModel from '../models/DomainEventModel.js';

function createLogger() {
  return logger.child({ module: 'community-reminder-job' });
}

async function dispatchReminder(reminder, log) {
  const event = await CommunityEventModel.findById(reminder.eventId);
  if (!event) {
    await CommunityEventReminderModel.markOutcome(reminder.id, {
      status: 'failed',
      failureReason: 'event_not_found'
    });
    log.warn(
      { reminderId: reminder.id, eventId: reminder.eventId },
      'Skipping reminder because event no longer exists'
    );
    return { reminderId: reminder.id, status: 'failed', reason: 'event_not_found' };
  }

  await DomainEventModel.record({
    entityType: 'community_event',
    entityId: event.id,
    eventType: 'community.event.reminder.dispatch',
    payload: {
      communityId: event.communityId,
      eventId: event.id,
      userId: reminder.userId,
      channel: reminder.channel,
      remindAt: reminder.remindAt
    },
    performedBy: reminder.userId
  });

  await CommunityEventReminderModel.markOutcome(reminder.id, {
    status: 'sent',
    sentAt: new Date(),
    lastAttemptAt: new Date()
  });

  return { reminderId: reminder.id, status: 'sent' };
}

export class CommunityReminderJob {
  constructor({
    enabled = env.engagement.reminders.enabled,
    schedule = env.engagement.reminders.cronExpression,
    timezone = env.engagement.reminders.timezone,
    lookaheadMinutes = env.engagement.reminders.lookaheadMinutes,
    batchSize = env.engagement.reminders.batchSize,
    scheduler = cron,
    nowProvider = () => new Date(),
    loggerInstance = createLogger()
  } = {}) {
    this.enabled = Boolean(enabled);
    this.schedule = schedule;
    this.timezone = timezone;
    this.lookaheadMinutes = lookaheadMinutes;
    this.batchSize = batchSize;
    this.scheduler = scheduler;
    this.nowProvider = nowProvider;
    this.logger = loggerInstance;
    this.task = null;

    if (typeof this.lookaheadMinutes !== 'number' || this.lookaheadMinutes <= 0) {
      throw new Error('CommunityReminderJob requires a positive lookahead window.');
    }

    if (typeof this.batchSize !== 'number' || this.batchSize <= 0) {
      throw new Error('CommunityReminderJob requires a positive batch size.');
    }
  }

  start() {
    if (!this.enabled) {
      this.logger.info('Community reminder job disabled; skipping start.');
      return;
    }

    if (this.task) {
      return;
    }

    const validate = this.scheduler.validate ?? (() => true);
    if (!validate(this.schedule)) {
      throw new Error(`Invalid community reminder cron expression: "${this.schedule}"`);
    }

    this.task = this.scheduler.schedule(
      this.schedule,
      () => {
        this.runCycle('scheduled').catch((error) => {
          this.logger.error({ err: error }, 'Unhandled reminder dispatch error');
        });
      },
      { timezone: this.timezone }
    );

    if (typeof this.task.start === 'function') {
      this.task.start();
    }

    this.logger.info(
      { schedule: this.schedule, timezone: this.timezone },
      'Community reminder job scheduled'
    );
  }

  async runCycle(trigger = 'manual') {
    if (!this.enabled) {
      this.logger.debug({ trigger }, 'Community reminder job invoked while disabled');
      return { processed: 0, dispatched: [] };
    }

    const now = this.nowProvider();
    const reminders = await CommunityEventReminderModel.listDue({
      now,
      lookaheadMinutes: this.lookaheadMinutes,
      limit: this.batchSize
    });

    if (!reminders.length) {
      this.logger.debug({ trigger }, 'No community reminders due');
      return { processed: 0, dispatched: [] };
    }

    const ids = reminders.map((reminder) => reminder.id);
    await CommunityEventReminderModel.markProcessing(ids);

    const dispatched = [];
    for (const reminder of reminders) {
      try {
        const result = await dispatchReminder(reminder, this.logger);
        dispatched.push(result);
      } catch (error) {
        this.logger.error(
          { err: error, reminderId: reminder.id },
          'Failed to dispatch community reminder'
        );
        await CommunityEventReminderModel.markOutcome(reminder.id, {
          status: 'failed',
          failureReason: error.message ?? 'dispatch_failed'
        });
        dispatched.push({ reminderId: reminder.id, status: 'failed' });
      }
    }

    this.logger.info(
      { trigger, processed: reminders.length, dispatched: dispatched.length },
      'Community reminders dispatched'
    );

    return { processed: reminders.length, dispatched };
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
      this.logger.info('Community reminder job stopped');
    }
  }
}

export function createCommunityReminderJob(options = {}) {
  return new CommunityReminderJob(options);
}

const communityReminderJob = createCommunityReminderJob();

export default communityReminderJob;
