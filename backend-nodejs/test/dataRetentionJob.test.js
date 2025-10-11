import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { DataRetentionJob } from '../src/jobs/dataRetentionJob.js';

function createLogger() {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn().mockReturnThis()
  };
}

describe('DataRetentionJob', () => {
  let logger;
  let scheduler;

  beforeEach(() => {
    logger = createLogger();
    scheduler = {
      validate: vi.fn().mockReturnValue(true),
      schedule: vi.fn(() => ({
        start: vi.fn(),
        stop: vi.fn(),
        destroy: vi.fn()
      }))
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('schedules a cron task when enabled', async () => {
    const executor = vi.fn().mockResolvedValue({ results: [] });
    const job = new DataRetentionJob({
      enabled: true,
      schedule: '*/5 * * * *',
      timezone: 'Etc/UTC',
      dryRun: false,
      runOnStartup: false,
      scheduler,
      executor,
      loggerInstance: logger,
      maxConsecutiveFailures: 3,
      failureBackoffMinutes: 10
    });

    job.start();

    expect(scheduler.validate).toHaveBeenCalledWith('*/5 * * * *');
    expect(scheduler.schedule).toHaveBeenCalledTimes(1);

    const [, scheduledCallback, options] = scheduler.schedule.mock.calls[0];
    expect(options).toMatchObject({ timezone: 'Etc/UTC' });

    scheduledCallback();
    await Promise.resolve();

    expect(executor).toHaveBeenCalledTimes(1);
  });

  it('skips scheduling when disabled', () => {
    const executor = vi.fn();
    const job = new DataRetentionJob({
      enabled: false,
      scheduler,
      executor,
      loggerInstance: logger
    });

    job.start();

    expect(scheduler.validate).not.toHaveBeenCalled();
    expect(scheduler.schedule).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith('Data retention job disabled; skipping scheduler start.');
  });

  it('throws on invalid cron expressions', () => {
    scheduler.validate.mockReturnValue(false);
    const executor = vi.fn();
    const job = new DataRetentionJob({
      enabled: true,
      schedule: 'bad expression',
      scheduler,
      executor,
      loggerInstance: logger
    });

    expect(() => job.start()).toThrow('Invalid data retention cron expression');
    expect(scheduler.schedule).not.toHaveBeenCalled();
  });

  it('backs off after repeated failures', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-05-01T00:00:00Z'));

    const executor = vi
      .fn()
      .mockRejectedValueOnce(new Error('db down'))
      .mockRejectedValueOnce(new Error('db still down'))
      .mockResolvedValueOnce({ results: [] });

    const job = new DataRetentionJob({
      enabled: true,
      scheduler,
      executor,
      loggerInstance: logger,
      failureBackoffMinutes: 10,
      maxConsecutiveFailures: 2
    });

    await expect(job.runCycle('manual')).rejects.toThrow('db down');
    expect(job.pausedUntil).toBeNull();

    await expect(job.runCycle('manual')).rejects.toThrow('db still down');
    expect(job.pausedUntil).toBeInstanceOf(Date);
    expect(job.pausedUntil?.toISOString()).toBe('2024-05-01T00:10:00.000Z');

    const executorCallsAfterPause = executor.mock.calls.length;
    const pausedResult = await job.runCycle('manual');
    expect(pausedResult).toBeNull();
    expect(executor).toHaveBeenCalledTimes(executorCallsAfterPause);

    vi.setSystemTime(new Date('2024-05-01T00:11:00Z'));
    const resumeSummary = await job.runCycle('manual');
    expect(resumeSummary).toMatchObject({ results: [] });
    expect(executor).toHaveBeenCalledTimes(executorCallsAfterPause + 1);
  });
});
