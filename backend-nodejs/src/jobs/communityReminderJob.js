import { randomUUID } from 'node:crypto';
import cron from 'node-cron';

import { env } from '../config/env.js';
import logger from '../config/logger.js';
import CommunityEventModel from '../models/CommunityEventModel.js';
import CommunityEventReminderModel from '../models/CommunityEventReminderModel.js';
import CommunityMemberModel from '../models/CommunityMemberModel.js';
import DomainEventModel from '../models/DomainEventModel.js';
import JobStateModel from '../models/JobStateModel.js';
import NotificationDispatchModel from '../models/NotificationDispatchModel.js';
import UserModel from '../models/UserModel.js';
import IntegrationProviderService from '../services/IntegrationProviderService.js';
import mailService from '../services/MailService.js';
import { recordBackgroundJobRun, recordIntegrationRequestAttempt } from '../observability/metrics.js';

function createLogger() {
  return logger.child({ module: 'community-reminder-job' });
}

function determinePersona(reminder, membership, user) {
  const metadataPersona = reminder?.metadata?.persona ?? reminder?.metadata?.audienceLabel;
  if (metadataPersona) {
    return String(metadataPersona).trim().toLowerCase();
  }

  const membershipPersona = membership?.metadata?.persona ?? membership?.role;
  if (membershipPersona) {
    return String(membershipPersona).trim().toLowerCase();
  }

  if (user?.role) {
    return `user:${String(user.role).trim().toLowerCase()}`;
  }

  return 'member';
}

function normaliseAllowedRoles(reminder) {
  const roles = reminder?.metadata?.allowedRoles ?? reminder?.metadata?.roles;
  if (!Array.isArray(roles) || roles.length === 0) {
    return null;
  }
  return roles
    .map((role) => String(role ?? '').trim().toLowerCase())
    .filter((role) => role.length > 0);
}

function buildManageUrl(event, reminder) {
  if (reminder?.metadata?.manageUrl) {
    return String(reminder.metadata.manageUrl);
  }

  const baseUrl = env.app?.baseUrl ?? process.env.APP_URL ?? '';
  if (!baseUrl) {
    return null;
  }

  const trimmed = baseUrl.replace(/\/+$/, '');
  return `${trimmed}/communities/${event.communityId}/events/${event.id}`;
}

function buildFormattedStart(event, locale) {
  if (!event.startAt) {
    return 'soon';
  }

  try {
    const formatter = new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: event.timezone ?? 'UTC'
    });
    return formatter.format(new Date(event.startAt));
  } catch (_error) {
    return 'soon';
  }
}

function buildMessage({ event, reminder, persona }) {
  const locale = reminder?.metadata?.locale ?? 'en-US';
  const formattedStart = buildFormattedStart(event, locale);
  const manageUrl = buildManageUrl(event, reminder);
  const defaultMessage = `Reminder: ${event.title ?? 'Edulure event'} starts ${formattedStart}.`;
  let message = reminder?.metadata?.message ? String(reminder.metadata.message) : defaultMessage;

  if (manageUrl && !message.includes(manageUrl)) {
    message = `${message} Manage your RSVP: ${manageUrl}`;
  }

  const greeting = reminder?.metadata?.greeting ?? `Hi ${persona === 'member' ? 'there' : persona},`;
  const textBody = `${greeting}\n\n${message}`;
  const htmlBody = `<!doctype html><html><body><p>${greeting}</p><p>${message}</p>${
    manageUrl ? `<p><a href="${manageUrl}">Manage your RSVP</a></p>` : ''
  }<p>See you soon!</p></body></html>`;

  return { message, textBody, htmlBody, manageUrl, formattedStart };
}

class AudienceAggregator {
  constructor() {
    this.events = new Map();
  }

  record({ eventId, communityId, title, persona, channel, status }) {
    const key = eventId ?? 'unknown';
    if (!this.events.has(key)) {
      this.events.set(key, {
        eventId,
        communityId: communityId ?? null,
        title: title ?? null,
        channels: new Map(),
        personas: new Map()
      });
    }

    const entry = this.events.get(key);
    const channelKey = (channel ?? 'unknown').toLowerCase();
    if (!entry.channels.has(channelKey)) {
      entry.channels.set(channelKey, {});
    }
    const channelStats = entry.channels.get(channelKey);
    channelStats[status] = (channelStats[status] ?? 0) + 1;

    const personaKey = (persona ?? 'unknown').toLowerCase();
    if (!entry.personas.has(personaKey)) {
      entry.personas.set(personaKey, {});
    }
    const personaStats = entry.personas.get(personaKey);
    personaStats[status] = (personaStats[status] ?? 0) + 1;
  }

  summarise() {
    return Array.from(this.events.values()).map((entry) => ({
      eventId: entry.eventId,
      communityId: entry.communityId,
      title: entry.title,
      channels: Array.from(entry.channels.entries()).map(([channel, stats]) => ({ channel, stats })),
      personas: Array.from(entry.personas.entries()).map(([persona, stats]) => ({ persona, stats }))
    }));
  }
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
    loggerInstance = createLogger(),
    reminderModel = CommunityEventReminderModel,
    eventModel = CommunityEventModel,
    memberModel = CommunityMemberModel,
    userModel = UserModel,
    jobStateModel = JobStateModel,
    notificationModel = NotificationDispatchModel,
    domainEventModel = DomainEventModel,
    integrationProviderService = IntegrationProviderService,
    mailer = mailService
  } = {}) {
    this.enabled = Boolean(enabled);
    this.schedule = schedule;
    this.timezone = timezone;
    this.lookaheadMinutes = lookaheadMinutes;
    this.batchSize = batchSize;
    this.scheduler = scheduler;
    this.nowProvider = nowProvider;
    this.logger = loggerInstance;
    this.reminderModel = reminderModel;
    this.eventModel = eventModel;
    this.memberModel = memberModel;
    this.userModel = userModel;
    this.jobStateModel = jobStateModel;
    this.notificationModel = notificationModel;
    this.domainEventModel = domainEventModel;
    this.integrationProviderService = integrationProviderService;
    this.mailer = mailer;
    this.task = null;
    this.jobKey = 'community_reminder';

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
    const startedAt = process.hrtime.bigint();

    if (!this.enabled) {
      this.logger.debug({ trigger }, 'Community reminder job invoked while disabled');
      recordBackgroundJobRun({
        job: this.jobKey,
        trigger,
        outcome: 'skipped',
        durationMs: 0,
        processed: 0,
        succeeded: 0,
        failed: 0
      });
      return { processed: 0, dispatched: [], audience: [] };
    }

    const runId = randomUUID();
    const aggregator = new AudienceAggregator();

    try {
      const now = this.nowProvider();
      const reminders = await this.reminderModel.listDue({
        now,
        lookaheadMinutes: this.lookaheadMinutes,
        limit: this.batchSize
      });

      if (!reminders.length) {
        this.logger.debug({ trigger }, 'No community reminders due');
        const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
        recordBackgroundJobRun({
          job: this.jobKey,
          trigger,
          outcome: 'idle',
          durationMs,
          processed: 0,
          succeeded: 0,
          failed: 0
        });
        return { processed: 0, dispatched: [], audience: aggregator.summarise() };
      }

      const ids = reminders.map((reminder) => reminder.id);
      await this.reminderModel.markProcessing(ids);

      const dispatched = [];
      for (const reminder of reminders) {
        try {
          const result = await this.processReminder(reminder, { trigger, runId, aggregator });
          dispatched.push(result);
        } catch (error) {
          this.logger.error(
            { err: error, reminderId: reminder.id },
            'Failed to dispatch community reminder'
          );
          await this.reminderModel.markOutcome(reminder.id, {
            status: 'failed',
            failureReason: error.message ?? 'dispatch_failed'
          });
          await this.jobStateModel.save(this.jobKey, `reminder:${reminder.id}`, {
            version: reminder.remindAt ?? null,
            state: {
              status: 'failed',
              reason: error.message ?? 'dispatch_failed',
              runId,
              channel: reminder.channel
            }
          });
          aggregator.record({
            eventId: reminder.eventId,
            communityId: null,
            title: null,
            persona: 'unknown',
            channel: reminder.channel,
            status: 'failed'
          });
          dispatched.push({ reminderId: reminder.id, status: 'failed' });
        }
      }

      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
      const summary = dispatched.reduce(
        (acc, item) => {
          if (['sent', 'queued', 'skipped', 'deduped'].includes(item.status)) {
            acc.succeeded += 1;
          } else if (item.status === 'failed') {
            acc.failed += 1;
          }
          return acc;
        },
        { succeeded: 0, failed: 0 }
      );

      const outcome = summary.failed > 0 ? 'partial' : 'success';
      recordBackgroundJobRun({
        job: this.jobKey,
        trigger,
        outcome,
        durationMs,
        processed: reminders.length,
        succeeded: summary.succeeded,
        failed: summary.failed
      });

      const audience = aggregator.summarise();
      this.logger.info(
        { trigger, processed: reminders.length, dispatched: dispatched.length, outcome, audience },
        'Community reminders dispatched'
      );

      return { processed: reminders.length, dispatched, audience };
    } catch (error) {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
      recordBackgroundJobRun({
        job: this.jobKey,
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

  async processReminder(reminder, { trigger, runId, aggregator }) {
    const event = await this.eventModel.findById(reminder.eventId);
    if (!event) {
      await this.reminderModel.markOutcome(reminder.id, {
        status: 'failed',
        failureReason: 'event_not_found'
      });
      await this.jobStateModel.save(this.jobKey, `reminder:${reminder.id}`, {
        version: reminder.remindAt ?? null,
        state: { status: 'failed', reason: 'event_not_found', runId, channel: reminder.channel }
      });
      aggregator.record({
        eventId: reminder.eventId,
        communityId: null,
        title: null,
        persona: 'unknown',
        channel: reminder.channel,
        status: 'failed'
      });
      this.logger.warn(
        { reminderId: reminder.id, eventId: reminder.eventId },
        'Skipping reminder because event no longer exists'
      );
      return { reminderId: reminder.id, status: 'failed', reason: 'event_not_found' };
    }

    const membership = await this.memberModel.findMembership(event.communityId, reminder.userId);
    const user = await this.userModel.findById(reminder.userId);
    const persona = determinePersona(reminder, membership, user);
    const allowedRoles = normaliseAllowedRoles(reminder);

    if (allowedRoles && allowedRoles.length) {
      const memberRole = membership?.role ? String(membership.role).toLowerCase() : null;
      if (!memberRole || !allowedRoles.includes(memberRole)) {
        await this.reminderModel.markOutcome(reminder.id, {
          status: 'cancelled',
          failureReason: 'role_filtered',
          lastAttemptAt: new Date()
        });
        await this.jobStateModel.save(this.jobKey, `reminder:${reminder.id}`, {
          version: reminder.remindAt ?? null,
          state: {
            status: 'skipped',
            reason: 'role_filtered',
            runId,
            channel: reminder.channel,
            persona
          }
        });
        aggregator.record({
          eventId: event.id,
          communityId: event.communityId,
          title: event.title,
          persona,
          channel: reminder.channel,
          status: 'skipped'
        });
        return { reminderId: reminder.id, status: 'skipped', reason: 'role_filtered', persona };
      }
    }

    const stateKey = `reminder:${reminder.id}`;
    const reminderVersion = reminder.remindAt ? new Date(reminder.remindAt).toISOString() : null;
    const existingState = await this.jobStateModel.get(this.jobKey, stateKey);

    if (
      existingState?.version === reminderVersion &&
      existingState?.state?.status === 'sent'
    ) {
      aggregator.record({
        eventId: event.id,
        communityId: event.communityId,
        title: event.title,
        persona,
        channel: reminder.channel,
        status: 'deduped'
      });
      await this.reminderModel.markOutcome(reminder.id, {
        status: 'sent',
        sentAt: existingState.state?.sentAt ? new Date(existingState.state.sentAt) : new Date(),
        lastAttemptAt: new Date()
      });
      return { reminderId: reminder.id, status: 'deduped', persona };
    }

    await this.jobStateModel.save(this.jobKey, stateKey, {
      version: reminderVersion,
      state: {
        status: 'processing',
        runId,
        attemptAt: new Date().toISOString(),
        channel: reminder.channel,
        persona,
        trigger
      }
    });

    const { message, textBody, htmlBody, manageUrl } = buildMessage({ event, reminder, persona });
    let deliveryMetadata = null;
    let status = 'sent';

    if (reminder.channel === 'sms') {
      const twilioClient = this.integrationProviderService.getTwilioClient();
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
        await this.reminderModel.markOutcome(reminder.id, {
          status: 'failed',
          failureReason: 'sms_not_configured'
        });
        await this.jobStateModel.save(this.jobKey, stateKey, {
          version: reminderVersion,
          state: {
            status: 'failed',
            reason: 'sms_not_configured',
            runId,
            channel: 'sms',
            persona
          }
        });
        aggregator.record({
          eventId: event.id,
          communityId: event.communityId,
          title: event.title,
          persona,
          channel: 'sms',
          status: 'failed'
        });
        this.logger.error({ reminderId: reminder.id }, 'Twilio client not configured for SMS reminder');
        return { reminderId: reminder.id, status: 'failed', reason: 'sms_not_configured', persona };
      }

      const destination =
        reminder.metadata?.phoneNumber ??
        reminder.metadata?.phone_number ??
        reminder.metadata?.destination ??
        null;

      if (!destination) {
        recordTwilioAttempt({ outcome: 'failure', statusCode: 'invalid_destination' });
        await this.reminderModel.markOutcome(reminder.id, {
          status: 'failed',
          failureReason: 'sms_destination_missing'
        });
        await this.jobStateModel.save(this.jobKey, stateKey, {
          version: reminderVersion,
          state: {
            status: 'failed',
            reason: 'sms_destination_missing',
            runId,
            channel: 'sms',
            persona
          }
        });
        aggregator.record({
          eventId: event.id,
          communityId: event.communityId,
          title: event.title,
          persona,
          channel: 'sms',
          status: 'failed'
        });
        this.logger.warn({ reminderId: reminder.id }, 'Missing phone number for SMS reminder');
        return { reminderId: reminder.id, status: 'failed', reason: 'sms_destination_missing', persona };
      }

      try {
        const messageResult = await twilioClient.sendMessage({
          to: destination,
          body: message,
          statusCallback: reminder.metadata?.statusCallbackUrl ?? null
        });
        recordTwilioAttempt({ outcome: 'success', statusCode: messageResult?.status ?? 'accepted' });
        deliveryMetadata = {
          provider: 'twilio',
          channel: 'sms',
          to: destination,
          messageSid: messageResult.sid
        };
      } catch (error) {
        recordTwilioAttempt({ outcome: 'failure', statusCode: error?.status ?? error?.code ?? 'error' });
        this.logger.error({ err: error, reminderId: reminder.id }, 'Failed to deliver SMS reminder');
        await this.reminderModel.markOutcome(reminder.id, {
          status: 'failed',
          failureReason: 'sms_delivery_failed'
        });
        await this.jobStateModel.save(this.jobKey, stateKey, {
          version: reminderVersion,
          state: {
            status: 'failed',
            reason: 'sms_delivery_failed',
            runId,
            channel: 'sms',
            persona
          }
        });
        aggregator.record({
          eventId: event.id,
          communityId: event.communityId,
          title: event.title,
          persona,
          channel: 'sms',
          status: 'failed'
        });
        return { reminderId: reminder.id, status: 'failed', reason: 'sms_delivery_failed', persona };
      }
    } else if (reminder.channel === 'email') {
      const destination = reminder.metadata?.email ?? user?.email ?? null;
      if (!destination) {
        await this.reminderModel.markOutcome(reminder.id, {
          status: 'failed',
          failureReason: 'email_missing'
        });
        await this.jobStateModel.save(this.jobKey, stateKey, {
          version: reminderVersion,
          state: {
            status: 'failed',
            reason: 'email_missing',
            runId,
            channel: 'email',
            persona
          }
        });
        aggregator.record({
          eventId: event.id,
          communityId: event.communityId,
          title: event.title,
          persona,
          channel: 'email',
          status: 'failed'
        });
        this.logger.warn({ reminderId: reminder.id }, 'Missing email address for reminder');
        return { reminderId: reminder.id, status: 'failed', reason: 'email_missing', persona };
      }

      try {
        const subject =
          reminder.metadata?.subject ??
          `Reminder: ${event.title ?? 'Edulure event'} starts ${buildFormattedStart(
            event,
            reminder.metadata?.locale ?? 'en-US'
          )}`;
        const response = await this.mailer.sendMail({
          to: destination,
          subject,
          text: textBody,
          html: htmlBody,
          headers: { 'X-Edulure-Template': reminder.metadata?.templateId ?? 'community-event-reminder' }
        });
        deliveryMetadata = {
          provider: 'smtp',
          channel: 'email',
          to: destination,
          messageId: response?.messageId ?? null
        };
      } catch (error) {
        this.logger.error({ err: error, reminderId: reminder.id }, 'Failed to send reminder email');
        await this.reminderModel.markOutcome(reminder.id, {
          status: 'failed',
          failureReason: 'email_delivery_failed'
        });
        await this.jobStateModel.save(this.jobKey, stateKey, {
          version: reminderVersion,
          state: {
            status: 'failed',
            reason: 'email_delivery_failed',
            runId,
            channel: 'email',
            persona
          }
        });
        aggregator.record({
          eventId: event.id,
          communityId: event.communityId,
          title: event.title,
          persona,
          channel: 'email',
          status: 'failed'
        });
        return { reminderId: reminder.id, status: 'failed', reason: 'email_delivery_failed', persona };
      }
    } else if (reminder.channel === 'push' || reminder.channel === 'in_app') {
      const dedupeKey = `community:${event.id}:user:${reminder.userId}:remind:${reminderVersion}:${reminder.channel}`;
      try {
        const queueEntry = await this.notificationModel.enqueue({
          userId: reminder.userId,
          channel: reminder.channel,
          dedupeKey,
          templateId: reminder.metadata?.templateId ?? 'community-event-reminder',
          title: reminder.metadata?.title ?? event.title ?? 'Community event reminder',
          body: textBody,
          payload: {
            eventId: event.id,
            communityId: event.communityId,
            manageUrl,
            remindAt: reminder.remindAt,
            persona
          },
          metadata: {
            trigger,
            runId,
            persona,
            channel: reminder.channel
          }
        });
        deliveryMetadata = {
          provider: 'internal_queue',
          channel: reminder.channel,
          queueId: queueEntry?.id ?? null,
          dedupeKey
        };
        status = 'queued';
      } catch (error) {
        this.logger.error({ err: error, reminderId: reminder.id }, 'Failed to enqueue reminder notification');
        await this.reminderModel.markOutcome(reminder.id, {
          status: 'failed',
          failureReason: 'queue_enqueue_failed'
        });
        await this.jobStateModel.save(this.jobKey, stateKey, {
          version: reminderVersion,
          state: {
            status: 'failed',
            reason: 'queue_enqueue_failed',
            runId,
            channel: reminder.channel,
            persona
          }
        });
        aggregator.record({
          eventId: event.id,
          communityId: event.communityId,
          title: event.title,
          persona,
          channel: reminder.channel,
          status: 'failed'
        });
        return { reminderId: reminder.id, status: 'failed', reason: 'queue_enqueue_failed', persona };
      }
    } else {
      await this.reminderModel.markOutcome(reminder.id, {
        status: 'failed',
        failureReason: 'unsupported_channel'
      });
      await this.jobStateModel.save(this.jobKey, stateKey, {
        version: reminderVersion,
        state: {
          status: 'failed',
          reason: 'unsupported_channel',
          runId,
          channel: reminder.channel,
          persona
        }
      });
      aggregator.record({
        eventId: event.id,
        communityId: event.communityId,
        title: event.title,
        persona,
        channel: reminder.channel,
        status: 'failed'
      });
      return { reminderId: reminder.id, status: 'failed', reason: 'unsupported_channel', persona };
    }

    await this.domainEventModel.record({
      entityType: 'community_event',
      entityId: event.id,
      eventType: 'community.event.reminder.dispatch',
      payload: {
        communityId: event.communityId,
        eventId: event.id,
        userId: reminder.userId,
        channel: reminder.channel,
        remindAt: reminder.remindAt,
        persona,
        delivery: deliveryMetadata,
        runId
      },
      performedBy: reminder.userId
    });

    await this.reminderModel.markOutcome(reminder.id, {
      status: 'sent',
      sentAt: new Date(),
      lastAttemptAt: new Date()
    });

    await this.jobStateModel.save(this.jobKey, stateKey, {
      version: reminderVersion,
      state: {
        status: 'sent',
        runId,
        channel: reminder.channel,
        persona,
        sentAt: new Date().toISOString(),
        delivery: deliveryMetadata
      }
    });

    aggregator.record({
      eventId: event.id,
      communityId: event.communityId,
      title: event.title,
      persona,
      channel: reminder.channel,
      status
    });

    return { reminderId: reminder.id, status, delivery: deliveryMetadata, persona };
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
