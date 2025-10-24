import { randomUUID } from 'crypto';
import cron from 'node-cron';

import { env } from '../config/env.js';
import logger from '../config/logger.js';
import CommunityEventModel from '../models/CommunityEventModel.js';
import CommunityEventReminderModel from '../models/CommunityEventReminderModel.js';
import DomainEventModel from '../models/DomainEventModel.js';
import JobStateModel from '../models/JobStateModel.js';
import { recordBackgroundJobRun, recordCommunityReminderDispatch } from '../observability/metrics.js';
import IntegrationProviderService from '../services/IntegrationProviderService.js';

const JOB_NAME = 'community-reminder-job';

const DEFAULT_PERSONA_COPY = {
  host: 'You are hosting {eventTitle}.',
  speaker: 'You are presenting at {eventTitle}.',
  facilitator: 'You are facilitating {eventTitle}.',
  volunteer: 'You are volunteering at {eventTitle}.',
  sponsor: 'Your sponsored session {eventTitle} is approaching.',
  attendee: 'You are attending {eventTitle}.',
  default: 'Your upcoming community event {eventTitle} is starting soon.'
};

const sleep = (ms) =>
  ms > 0
    ? new Promise((resolve) => {
        setTimeout(resolve, ms);
      })
    : Promise.resolve();

function createReminderKey(reminder) {
  const remindAt = reminder?.remindAt ? new Date(reminder.remindAt) : null;
  const remindIso = remindAt && !Number.isNaN(remindAt.getTime()) ? remindAt.toISOString() : 'unspecified';
  return `${reminder?.id ?? 'unknown'}:${reminder?.eventId ?? 'unknown'}:${remindIso}:${reminder?.channel ?? 'unknown'}`;
}

function resolvePersona(reminder) {
  const metadata = reminder?.metadata ?? {};
  const persona =
    metadata.persona ??
    metadata.role ??
    metadata.segment ??
    metadata.audience ??
    metadata.memberRole ??
    'attendee';
  return String(persona).toLowerCase();
}

function buildPersonaCopy(persona, eventTitle, personaCopyMap = DEFAULT_PERSONA_COPY) {
  const template = personaCopyMap?.[persona] ?? personaCopyMap?.default ?? DEFAULT_PERSONA_COPY.default;
  const title = eventTitle ? String(eventTitle) : 'your event';
  return template.replace('{eventTitle}', title);
}

function createLogger() {
  return logger.child({ module: 'community-reminder-job' });
}

async function dispatchReminder(reminder, log, { persona, personaCopyMap } = {}) {
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
    if (!twilioClient || !twilioClient.isConfigured()) {
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
      const personaLine = buildPersonaCopy(persona ?? 'attendee', event.title, personaCopyMap);
      const timingLine = formattedStart ? ` It starts ${formattedStart}.` : ' It starts soon.';
      messageBody = `${personaLine}${timingLine}`;
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
      deliveryMetadata = {
        provider: 'twilio',
        channel: 'sms',
        to: destination,
        messageSid: message.sid
      };
    } catch (error) {
      log.error({ err: error, reminderId: reminder.id }, 'Failed to deliver SMS reminder');
      await CommunityEventReminderModel.markOutcome(reminder.id, {
        status: 'failed',
        failureReason: 'sms_delivery_failed'
      });
      return { reminderId: reminder.id, status: 'failed', reason: 'sms_delivery_failed' };
    }
  }

  const domainEvent = await DomainEventModel.record({
    entityType: 'community_event',
    entityId: event.id,
    eventType: 'community.event.reminder.dispatch',
    payload: {
      communityId: event.communityId,
      eventId: event.id,
      userId: reminder.userId,
      channel: reminder.channel,
      remindAt: reminder.remindAt,
      delivery: deliveryMetadata,
      persona: persona ?? null
    },
    performedBy: reminder.userId
  });

  const updatedReminder = await CommunityEventReminderModel.markOutcome(reminder.id, {
    status: 'sent',
    sentAt: new Date(),
    lastAttemptAt: new Date()
  });

  return {
    reminderId: reminder.id,
    status: 'sent',
    delivery: deliveryMetadata,
    persona: persona ?? null,
    domainEventId: domainEvent?.id ?? null,
    sentAt: updatedReminder?.sentAt ?? new Date()
  };
}

export class CommunityReminderJob {
  constructor({
    enabled = env.engagement.reminders.enabled,
    schedule = env.engagement.reminders.cronExpression,
    timezone = env.engagement.reminders.timezone,
    lookaheadMinutes = env.engagement.reminders.lookaheadMinutes,
    batchSize = env.engagement.reminders.batchSize,
    idempotencyWindowMinutes = env.engagement.reminders.idempotencyWindowMinutes ?? 24 * 60,
    stateRetentionLimit = env.engagement.reminders.stateRetentionLimit ?? 1000,
    dispatchIntervalMs = env.engagement.reminders.dispatchIntervalMs ?? 0,
    scheduler = cron,
    nowProvider = () => new Date(),
    loggerInstance = createLogger(),
    jobStateModel = JobStateModel,
    personaCopyMap = DEFAULT_PERSONA_COPY,
    jobName = JOB_NAME
  } = {}) {
    this.enabled = Boolean(enabled);
    this.schedule = schedule;
    this.timezone = timezone;
    this.lookaheadMinutes = lookaheadMinutes;
    this.batchSize = batchSize;
    this.scheduler = scheduler;
    this.nowProvider = nowProvider;
    this.logger = loggerInstance;
    this.jobStateModel = jobStateModel;
    this.jobName = jobName;
    this.personaCopy = personaCopyMap ?? DEFAULT_PERSONA_COPY;
    this.task = null;
    this.consecutiveFailures = 0;
    this.idempotencyWindowMs = Math.max(Number(idempotencyWindowMinutes) || 0, 0) * 60 * 1000;
    const retention = Number(stateRetentionLimit);
    this.stateRetentionLimit = Number.isFinite(retention)
      ? Math.max(50, Math.min(retention, 5000))
      : 1000;
    this.dispatchIntervalMs = Math.max(Number(dispatchIntervalMs) || 0, 0);

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

    const runId = randomUUID();
    const cycleStart = process.hrtime.bigint();
    const startTimestamp = this.nowProvider();
    let reminders = [];

    const stateRecord = this.jobStateModel?.get
      ? await this.jobStateModel
          .get(this.jobName)
          .catch((error) => {
            this.logger.error({ err: error }, 'Failed to load community reminder job state');
            return null;
          })
      : null;

    const persistedEntries = Array.isArray(stateRecord?.state?.processedReminders)
      ? stateRecord.state.processedReminders
      : [];
    const dedupeMap = new Map();
    for (const entry of persistedEntries) {
      if (entry?.key) {
        dedupeMap.set(entry.key, entry);
      }
    }

    const computeProcessedEntries = (referenceDate) => {
      const items = Array.from(dedupeMap.values());
      const cutoff =
        this.idempotencyWindowMs > 0 && referenceDate instanceof Date
          ? referenceDate.getTime() - this.idempotencyWindowMs
          : null;

      return items
        .filter((entry) => {
          if (!entry?.sentAt || !cutoff) {
            return true;
          }
          const sentTime = new Date(entry.sentAt).getTime();
          return Number.isFinite(sentTime) && sentTime >= cutoff;
        })
        .sort((a, b) => {
          const aTime = new Date(a.sentAt ?? 0).getTime();
          const bTime = new Date(b.sentAt ?? 0).getTime();
          return bTime - aTime;
        })
        .slice(0, this.stateRetentionLimit);
    };

    try {
      reminders = await CommunityEventReminderModel.listDue({
        now: startTimestamp,
        lookaheadMinutes: this.lookaheadMinutes,
        limit: this.batchSize
      });

      if (!reminders.length) {
        const durationSeconds = Number(process.hrtime.bigint() - cycleStart) / 1_000_000_000;

        if (this.jobStateModel?.update) {
          try {
            const now = this.nowProvider();
            await this.jobStateModel.update(this.jobName, (current = {}) => {
              const previousRuns = Array.isArray(current.recentRuns) ? current.recentRuns : [];
              const runRecord = {
                runId,
                trigger,
                runAt: now.toISOString(),
                status: 'idle',
                durationSeconds: Number.isFinite(durationSeconds) ? Number(durationSeconds.toFixed(3)) : null
              };
              return {
                ...current,
                lastRunId: runId,
                lastRunAt: runRecord.runAt,
                lastTrigger: trigger,
                lastStatus: 'idle',
                consecutiveFailures: 0,
                processedReminders: computeProcessedEntries(now),
                recentRuns: [runRecord, ...previousRuns].slice(0, 20)
              };
            });
          } catch (stateError) {
            this.logger.error({ err: stateError }, 'Failed to persist idle community reminder state');
          }
        }

        recordBackgroundJobRun({
          jobName: this.jobName,
          trigger,
          status: 'idle',
          durationSeconds: Number.isFinite(durationSeconds) ? durationSeconds : 0,
          processed: 0
        });

        this.logger.debug({ trigger, runId }, 'No community reminders due');
        return { processed: 0, dispatched: [] };
      }

      const ids = reminders.map((reminder) => reminder.id);
      await CommunityEventReminderModel.markProcessing(ids);

      const dispatched = [];
      const personaStats = {};
      let failedCount = 0;
      let duplicateCount = 0;

      for (let index = 0; index < reminders.length; index += 1) {
        const reminder = reminders[index];
        const persona = resolvePersona(reminder);
        const dedupeKey = createReminderKey(reminder);
        const existingEntry = dedupeMap.get(dedupeKey);

        if (existingEntry) {
          const existingSentAt = existingEntry.sentAt ? new Date(existingEntry.sentAt) : null;
          await CommunityEventReminderModel.markOutcome(reminder.id, {
            status: 'sent',
            sentAt:
              existingSentAt && !Number.isNaN(existingSentAt.getTime()) ? existingSentAt : undefined,
            lastAttemptAt: new Date()
          });
          dispatched.push({ reminderId: reminder.id, status: 'duplicate', persona });
          duplicateCount += 1;
          recordCommunityReminderDispatch({ channel: reminder.channel ?? 'unknown', persona, status: 'duplicate' });
          continue;
        }

        if (this.dispatchIntervalMs > 0 && index > 0) {
          await sleep(this.dispatchIntervalMs);
        }

        try {
          const result = await dispatchReminder(reminder, this.logger, {
            persona,
            personaCopyMap: this.personaCopy
          });
          dispatched.push(result);
          personaStats[persona] = (personaStats[persona] ?? 0) + 1;
          recordCommunityReminderDispatch({ channel: reminder.channel ?? 'unknown', persona, status: 'sent' });

          const sentAtIso =
            result?.sentAt instanceof Date
              ? result.sentAt.toISOString()
              : result?.sentAt
              ? String(result.sentAt)
              : new Date().toISOString();
          const entry = {
            key: dedupeKey,
            reminderId: reminder.id,
            eventId: reminder.eventId,
            persona,
            channel: reminder.channel ?? 'unknown',
            sentAt: sentAtIso
          };
          dedupeMap.set(dedupeKey, entry);
        } catch (error) {
          this.logger.error(
            { err: error, reminderId: reminder.id },
            'Failed to dispatch community reminder'
          );
          await CommunityEventReminderModel.markOutcome(reminder.id, {
            status: 'failed',
            failureReason: error.message ?? 'dispatch_failed'
          });
          dispatched.push({ reminderId: reminder.id, status: 'failed', persona });
          failedCount += 1;
          recordCommunityReminderDispatch({ channel: reminder.channel ?? 'unknown', persona, status: 'failed' });
        }
      }

      const durationSeconds = Number(process.hrtime.bigint() - cycleStart) / 1_000_000_000;
      const completedAt = this.nowProvider();

      if (this.jobStateModel?.update) {
        try {
          await this.jobStateModel.update(this.jobName, (current = {}) => {
            const previousRuns = Array.isArray(current.recentRuns) ? current.recentRuns : [];
            const runRecord = {
              runId,
              trigger,
              runAt: completedAt.toISOString(),
              status: failedCount > 0 ? 'completed_with_errors' : 'completed',
              durationSeconds: Number.isFinite(durationSeconds) ? Number(durationSeconds.toFixed(3)) : null,
              processed: reminders.length,
              sent: reminders.length - failedCount - duplicateCount,
              failed: failedCount,
              duplicates: duplicateCount
            };

            return {
              ...current,
              lastRunId: runId,
              lastRunAt: runRecord.runAt,
              lastTrigger: trigger,
              lastStatus: runRecord.status,
              consecutiveFailures: 0,
              processedReminders: computeProcessedEntries(completedAt),
              recentRuns: [runRecord, ...previousRuns].slice(0, 20),
              personaSnapshot: personaStats
            };
          });
        } catch (stateError) {
          this.logger.error({ err: stateError }, 'Failed to persist community reminder job state');
        }
      }

      this.consecutiveFailures = 0;

      this.logger.info(
        {
          trigger,
          runId,
          processed: reminders.length,
          sent: reminders.length - failedCount - duplicateCount,
          failed: failedCount,
          duplicates: duplicateCount,
          durationSeconds
        },
        'Community reminders dispatched'
      );

      recordBackgroundJobRun({
        jobName: this.jobName,
        trigger,
        status: failedCount > 0 ? 'completed_with_errors' : 'completed',
        durationSeconds: Number.isFinite(durationSeconds) ? durationSeconds : 0,
        processed: reminders.length
      });

      return { processed: reminders.length, dispatched };
    } catch (error) {
      this.consecutiveFailures += 1;
      const durationSeconds = Number(process.hrtime.bigint() - cycleStart) / 1_000_000_000;

      recordBackgroundJobRun({
        jobName: this.jobName,
        trigger,
        status: 'failed',
        durationSeconds: Number.isFinite(durationSeconds) ? durationSeconds : 0,
        processed: reminders?.length ?? 0
      });

      if (this.jobStateModel?.update) {
        try {
          const now = this.nowProvider();
          await this.jobStateModel.update(this.jobName, (current = {}) => {
            const previousRuns = Array.isArray(current.recentRuns) ? current.recentRuns : [];
            const runRecord = {
              runId,
              trigger,
              runAt: now.toISOString(),
              status: 'failed',
              error: error.message ?? 'unknown'
            };

            return {
              ...current,
              lastRunId: runId,
              lastRunAt: runRecord.runAt,
              lastTrigger: trigger,
              lastStatus: 'failed',
              consecutiveFailures: (current.consecutiveFailures ?? 0) + 1,
              processedReminders: computeProcessedEntries(now),
              recentRuns: [runRecord, ...previousRuns].slice(0, 20)
            };
          });
        } catch (stateError) {
          this.logger.error({ err: stateError }, 'Failed to persist failed community reminder state');
        }
      }

      this.logger.error({ err: error, trigger, runId }, 'Community reminder cycle failed');
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
