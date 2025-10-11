import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CommunityReminderJob } from '../src/jobs/communityReminderJob.js';

const logger = vi.hoisted(() => {
  const instance = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: vi.fn()
  };
  instance.child.mockReturnValue(instance);
  return instance;
});

const reminderModel = vi.hoisted(() => ({ listDue: vi.fn(), markProcessing: vi.fn(), markOutcome: vi.fn() }));
const eventModel = vi.hoisted(() => ({ findById: vi.fn() }));
const domainEventModel = vi.hoisted(() => ({ record: vi.fn() }));

vi.mock('../src/config/logger.js', () => ({
  default: logger
}));
vi.mock('../src/models/CommunityEventReminderModel.js', () => ({
  default: reminderModel
}));
vi.mock('../src/models/CommunityEventModel.js', () => ({
  default: eventModel
}));
vi.mock('../src/models/DomainEventModel.js', () => ({
  default: domainEventModel
}));

const scheduler = {
  validate: vi.fn().mockReturnValue(true),
  schedule: vi.fn()
};

function createJob(options = {}) {
  return new CommunityReminderJob({
    enabled: true,
    schedule: '*/5 * * * *',
    timezone: 'Etc/UTC',
    lookaheadMinutes: 30,
    batchSize: 10,
    scheduler,
    nowProvider: () => new Date('2024-11-20T12:00:00Z'),
    loggerInstance: logger,
    ...options
  });
}

const resetMocks = () => {
  logger.info.mockClear();
  logger.warn.mockClear();
  logger.error.mockClear();
  logger.debug.mockClear();
  scheduler.validate.mockClear();
  scheduler.schedule.mockClear();
  reminderModel.listDue.mockReset();
  reminderModel.markProcessing.mockReset();
  reminderModel.markOutcome.mockReset();
  eventModel.findById.mockReset();
  domainEventModel.record.mockReset();
};

describe('CommunityReminderJob', () => {
  beforeEach(() => {
    resetMocks();
  });

  it('dispatches due reminders and records outcomes', async () => {
    const reminders = [
      {
        id: 1,
        eventId: 33,
        userId: 77,
        channel: 'email',
        remindAt: '2024-11-20T11:55:00Z'
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
      .mockResolvedValueOnce({ id: 33, communityId: 5 })
      .mockResolvedValueOnce(null);

    const job = createJob();
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
    expect(result).toEqual(
      expect.objectContaining({ processed: 2, dispatched: expect.any(Array) })
    );
  });

  it('skips work when disabled', async () => {
    const job = createJob({ enabled: false });
    const summary = await job.runCycle('manual');
    expect(summary).toEqual({ processed: 0, dispatched: [] });
    expect(reminderModel.listDue).not.toHaveBeenCalled();
  });

  it('starts scheduler when enabled', () => {
    scheduler.schedule.mockReturnValue({ start: vi.fn(), stop: vi.fn(), destroy: vi.fn() });
    const job = createJob();
    job.start();
    expect(scheduler.validate).toHaveBeenCalledWith('*/5 * * * *');
    expect(scheduler.schedule).toHaveBeenCalledTimes(1);
  });
});
