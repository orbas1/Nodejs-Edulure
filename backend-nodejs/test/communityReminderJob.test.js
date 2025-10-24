import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CommunityReminderJob } from '../src/jobs/communityReminderJob.js';

const metrics = {
  recordBackgroundJobRun: vi.fn(),
  recordIntegrationRequestAttempt: vi.fn()
};

vi.mock('../src/observability/metrics.js', () => metrics);

const scheduler = {
  validate: vi.fn().mockReturnValue(true),
  schedule: vi.fn()
};

function createLogger() {
  const instance = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: vi.fn()
  };
  instance.child.mockReturnValue(instance);
  return instance;
}

describe('CommunityReminderJob', () => {
  let logger;
  let reminderModel;
  let eventModel;
  let memberModel;
  let userModel;
  let domainEventModel;
  let integrationProviderService;
  let notificationModel;
  let jobStateModel;
  let mailer;

  function buildJob(overrides = {}) {
    return new CommunityReminderJob({
      enabled: true,
      schedule: '*/5 * * * *',
      timezone: 'Etc/UTC',
      lookaheadMinutes: 30,
      batchSize: 10,
      scheduler,
      nowProvider: () => new Date('2024-11-20T12:00:00Z'),
      loggerInstance: logger,
      reminderModel,
      eventModel,
      memberModel,
      userModel,
      domainEventModel,
      integrationProviderService,
      notificationModel,
      jobStateModel,
      mailer,
      ...overrides
    });
  }

  beforeEach(() => {
    logger = createLogger();
    reminderModel = {
      listDue: vi.fn(),
      markProcessing: vi.fn(),
      markOutcome: vi.fn()
    };
    eventModel = { findById: vi.fn() };
    memberModel = { findMembership: vi.fn().mockResolvedValue({ role: 'member', metadata: {} }) };
    userModel = { findById: vi.fn().mockResolvedValue({ id: 77, email: 'user@example.com' }) };
    domainEventModel = { record: vi.fn() };
    integrationProviderService = { getTwilioClient: vi.fn(() => null) };
    notificationModel = { enqueue: vi.fn().mockResolvedValue({ id: 501 }) };
    jobStateModel = { get: vi.fn().mockResolvedValue(null), save: vi.fn().mockResolvedValue(null) };
    mailer = { sendMail: vi.fn().mockResolvedValue({ messageId: 'msg-1' }) };

    scheduler.validate.mockClear();
    scheduler.schedule.mockClear();
    metrics.recordBackgroundJobRun.mockClear();
    metrics.recordIntegrationRequestAttempt.mockClear();
  });

  it('dispatches due reminders and records outcomes', async () => {
    const reminders = [
      {
        id: 1,
        eventId: 33,
        userId: 77,
        channel: 'email',
        remindAt: '2024-11-20T11:55:00Z',
        metadata: {}
      },
      {
        id: 2,
        eventId: 34,
        userId: 88,
        channel: 'push',
        remindAt: '2024-11-20T11:58:00Z'
      }
    ];
    reminderModel.listDue.mockResolvedValue(reminders);
    reminderModel.markProcessing.mockResolvedValue(2);
    eventModel.findById
      .mockResolvedValueOnce({ id: 33, communityId: 5, title: 'Town Hall' })
      .mockResolvedValueOnce(null);

    const job = buildJob();
    const result = await job.runCycle('manual');

    expect(reminderModel.markProcessing).toHaveBeenCalledWith([1, 2]);
    expect(domainEventModel.record).toHaveBeenCalledWith(
      expect.objectContaining({
        entityId: 33,
        eventType: 'community.event.reminder.dispatch'
      })
    );
    expect(reminderModel.markOutcome).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ status: 'sent' })
    );
    expect(reminderModel.markOutcome).toHaveBeenCalledWith(
      2,
      expect.objectContaining({ status: 'failed' })
    );
    expect(notificationModel.enqueue).not.toHaveBeenCalled();
    expect(jobStateModel.save).toHaveBeenCalled();
    expect(result).toEqual(
      expect.objectContaining({ processed: 2, dispatched: expect.any(Array), audience: expect.any(Array) })
    );
    expect(metrics.recordBackgroundJobRun).toHaveBeenCalledWith(
      expect.objectContaining({ job: 'community_reminder', outcome: 'partial', processed: 2 })
    );
    expect(metrics.recordIntegrationRequestAttempt).not.toHaveBeenCalled();
  });

  it('skips work when disabled', async () => {
    const job = buildJob({ enabled: false });
    const summary = await job.runCycle('manual');
    expect(summary).toEqual({ processed: 0, dispatched: [], audience: [] });
    expect(reminderModel.listDue).not.toHaveBeenCalled();
    expect(metrics.recordBackgroundJobRun).toHaveBeenCalledWith(
      expect.objectContaining({ job: 'community_reminder', outcome: 'skipped' })
    );
  });

  it('starts scheduler when enabled', () => {
    scheduler.schedule.mockReturnValue({ start: vi.fn(), stop: vi.fn(), destroy: vi.fn() });
    const job = buildJob();
    job.start();
    expect(scheduler.validate).toHaveBeenCalledWith('*/5 * * * *');
    expect(scheduler.schedule).toHaveBeenCalledTimes(1);
  });

  it('records integration metrics when sms configuration is missing', async () => {
    const reminders = [
      {
        id: 9,
        eventId: 99,
        userId: 104,
        channel: 'sms',
        remindAt: '2024-11-20T11:55:00Z',
        metadata: { phoneNumber: '+15550009999' }
      }
    ];
    reminderModel.listDue.mockResolvedValue(reminders);
    reminderModel.markProcessing.mockResolvedValue(1);
    eventModel.findById.mockResolvedValue({ id: 99, communityId: 5, startAt: '2024-11-20T12:30:00Z' });
    integrationProviderService.getTwilioClient.mockReturnValue({ isConfigured: () => false });

    const job = buildJob();
    const summary = await job.runCycle('manual');

    expect(reminderModel.markOutcome).toHaveBeenCalledWith(
      9,
      expect.objectContaining({ status: 'failed', failureReason: 'sms_not_configured' })
    );
    expect(metrics.recordIntegrationRequestAttempt).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'twilio', outcome: 'skipped', statusCode: 'config_missing' })
    );
    expect(metrics.recordBackgroundJobRun).toHaveBeenCalledWith(
      expect.objectContaining({ job: 'community_reminder', outcome: 'partial', processed: 1 })
    );
    expect(summary.processed).toBe(1);
    expect(summary.dispatched).toHaveLength(1);
  });

  it('enqueues push reminders into the notification queue', async () => {
    const reminderVersion = '2024-11-20T11:58:00Z';
    const reminders = [
      {
        id: 3,
        eventId: 40,
        userId: 200,
        channel: 'push',
        remindAt: reminderVersion,
        metadata: { templateId: 'community-event-reminder' }
      }
    ];
    reminderModel.listDue.mockResolvedValue(reminders);
    reminderModel.markProcessing.mockResolvedValue(1);
    eventModel.findById.mockResolvedValue({ id: 40, communityId: 9, title: 'Ops Summit' });
    notificationModel.enqueue.mockResolvedValue({ id: 701, dedupeKey: 'community:40:user:200:remind' });

    const job = buildJob();
    const result = await job.runCycle('manual');

    expect(notificationModel.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 200,
        channel: 'push',
        dedupeKey: expect.stringContaining('community:40:user:200'),
        metadata: expect.objectContaining({ channel: 'push' })
      })
    );
    expect(reminderModel.markOutcome).toHaveBeenCalledWith(
      3,
      expect.objectContaining({ status: 'sent' })
    );
    expect(jobStateModel.save).toHaveBeenCalledWith(
      'community_reminder',
      'reminder:3',
      expect.objectContaining({
        state: expect.objectContaining({ status: 'sent', channel: 'push' })
      })
    );
    expect(metrics.recordBackgroundJobRun).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: 'success', processed: 1 })
    );
    expect(result.dispatched[0]).toEqual(expect.objectContaining({ status: 'queued' }));
  });

  it('skips duplicate reminders when job state already recorded a send', async () => {
    const reminder = {
      id: 5,
      eventId: 33,
      userId: 77,
      channel: 'email',
      remindAt: '2024-11-20T11:55:00Z',
      metadata: {}
    };
    reminderModel.listDue.mockResolvedValue([reminder]);
    reminderModel.markProcessing.mockResolvedValue(1);
    eventModel.findById.mockResolvedValue({ id: 33, communityId: 5, title: 'Town Hall' });
    const existingVersion = new Date(reminder.remindAt).toISOString();
    jobStateModel.get.mockResolvedValueOnce({
      version: existingVersion,
      state: { status: 'sent', sentAt: '2024-11-20T11:00:00.000Z', delivery: { provider: 'smtp' } },
      metadata: { seeded: true }
    });

    const job = buildJob();
    const summary = await job.runCycle('manual');

    expect(mailer.sendMail).not.toHaveBeenCalled();
    expect(notificationModel.enqueue).not.toHaveBeenCalled();
    expect(reminderModel.markOutcome).toHaveBeenCalledWith(
      5,
      expect.objectContaining({ status: 'sent' })
    );
    expect(jobStateModel.save).toHaveBeenCalledWith(
      'community_reminder',
      'reminder:5',
      expect.objectContaining({
        metadata: expect.objectContaining({ deduped: true }),
        state: expect.objectContaining({ status: 'sent', dedupedAt: expect.any(String) })
      })
    );
    expect(metrics.recordBackgroundJobRun).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: 'success', processed: 1 })
    );
    expect(summary.dispatched[0]).toEqual(expect.objectContaining({ status: 'deduped' }));
  });
});
