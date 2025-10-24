import cron from 'node-cron';

import { env } from '../config/env.js';
import logger from '../config/logger.js';
import CommunityEventModel from '../models/CommunityEventModel.js';
import CommunityEventReminderModel from '../models/CommunityEventReminderModel.js';
import DomainEventModel from '../models/DomainEventModel.js';
import IntegrationProviderService from '../services/IntegrationProviderService.js';
import { recordBackgroundJobRun, recordIntegrationRequestAttempt } from '../observability/metrics.js';

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

  let deliveryMetadata = null;

  if (reminder.channel === 'sms') {
    const twilioClient = IntegrationProviderService.getTwilioClient();
    const twilioAttemptStartedAt = Date.now();
    const recordTwilioAttempt = (overrides = {}) => {
      recordIntegrationRequestAttempt({
        provider: 'twilio',
        operation: 'send_message',
        durationMs: Date.now() - twilioAttemptStartedAt,
        ...overrides
      });
    };
    if (!twilioClient || !twilioClient.isConfigured()) {
      recordTwilioAttempt({ outcome: 'skipped', statusCode: 'config_missing' });
      await CommunityEventReminderModel.markOutcome(reminder.id, {
        status: 'failed',
        failureReason: 'sms_not_configured'
      });
      log.error({ reminderId: reminder.id }, 'Twilio client not configured for SMS reminder');
      return { reminderId: reminder.id, status: 'failed', reason: 'sms_not_configured' };
    }

    const destination =
      reminder.metadata?.phoneNumber ??
      reminder.metadata?.phone_number ??
      reminder.metadata?.destination ??
      null;

    if (!destination) {
      recordTwilioAttempt({ outcome: 'failure', statusCode: 'invalid_destination' });
      await CommunityEventReminderModel.markOutcome(reminder.id, {
        status: 'failed',
        failureReason: 'sms_destination_missing'
      });
      log.warn({ reminderId: reminder.id }, 'Missing phone number for SMS reminder');
      return { reminderId: reminder.id, status: 'failed', reason: 'sms_destination_missing' };
    }

    const eventStart = event.startAt ? new Date(event.startAt) : null;
    const formatter = eventStart
      ? new Intl.DateTimeFormat('en-US', {
          dateStyle: 'medium',
          timeStyle: 'short',
          timeZone: event.timezone ?? 'UTC'
        })
      : null;
    const formattedStart = formatter && eventStart ? formatter.format(eventStart) : 'soon';
    const manageUrl =
      reminder.metadata?.manageUrl ??
      (process.env.APP_URL
        ? `${process.env.APP_URL.replace(/\/+$/, '')}/communities/${event.communityId}/events/${event.id}`
        : null);

    let messageBody = reminder.metadata?.message;
    if (!messageBody) {
      messageBody = `Reminder: ${event.title ?? 'Edulure event'} starts ${formattedStart}.`;
      if (manageUrl) {
        messageBody += ` Manage your RSVP: ${manageUrl}`;
      }
    }
    try {
      const message = await twilioClient.sendMessage({
        to: destination,
        body: messageBody,
        statusCallback: reminder.metadata?.statusCallbackUrl ?? null
      });
      recordTwilioAttempt({ outcome: 'success', statusCode: message?.status ?? 'accepted' });
      deliveryMetadata = {
        provider: 'twilio',
        channel: 'sms',
        to: destination,
        messageSid: message.sid
      };
    } catch (error) {
      recordTwilioAttempt({ outcome: 'failure', statusCode: error?.status ?? error?.code ?? 'error' });
      log.error({ err: error, reminderId: reminder.id }, 'Failed to deliver SMS reminder');
      await CommunityEventReminderModel.markOutcome(reminder.id, {
        status: 'failed',
        failureReason: 'sms_delivery_failed'
      });
      return { reminderId: reminder.id, status: 'failed', reason: 'sms_delivery_failed' };
    }
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
      remindAt: reminder.remindAt,
      delivery: deliveryMetadata
    },
    performedBy: reminder.userId
  });

  await CommunityEventReminderModel.markOutcome(reminder.id, {
    status: 'sent',
    sentAt: new Date(),
    lastAttemptAt: new Date()
  });

  return { reminderId: reminder.id, status: 'sent', delivery: deliveryMetadata };
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
    const jobKey = 'community_reminder';
    const startedAt = process.hrtime.bigint();

    if (!this.enabled) {
      this.logger.debug({ trigger }, 'Community reminder job invoked while disabled');
      recordBackgroundJobRun({ job: jobKey, trigger, outcome: 'skipped', durationMs: 0, processed: 0, succeeded: 0, failed: 0 });
      return { processed: 0, dispatched: [] };
    }

    try {
      const now = this.nowProvider();
      const reminders = await CommunityEventReminderModel.listDue({
        now,
        lookaheadMinutes: this.lookaheadMinutes,
        limit: this.batchSize
      });

      if (!reminders.length) {
        this.logger.debug({ trigger }, 'No community reminders due');
        const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
        recordBackgroundJobRun({ job: jobKey, trigger, outcome: 'idle', durationMs, processed: 0, succeeded: 0, failed: 0 });
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

      const summary = dispatched.reduce(
        (acc, item) => {
          if (item.status === 'sent') {
            acc.succeeded += 1;
          } else if (item.status === 'failed') {
            acc.failed += 1;
          }
          return acc;
        },
        { succeeded: 0, failed: 0 }
      );

      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
      const outcome = summary.failed > 0 ? 'partial' : 'success';
      recordBackgroundJobRun({
        job: jobKey,
        trigger,
        outcome,
        durationMs,
        processed: reminders.length,
        succeeded: summary.succeeded,
        failed: summary.failed
      });

      return { processed: reminders.length, dispatched };
    } catch (error) {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
      recordBackgroundJobRun({
        job: jobKey,
        trigger,
        outcome: 'failure',
        durationMs,
        processed: 0,
        succeeded: 0,
        failed: 0
      });
      throw error;
    }
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
