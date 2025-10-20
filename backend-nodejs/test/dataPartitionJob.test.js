import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DataPartitionJob } from '../src/jobs/dataPartitionJob.js';

const createLogger = () => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  child: vi.fn().mockReturnThis()
});

describe('DataPartitionJob', () => {
  let logger;
  let scheduler;

  beforeEach(() => {
    vi.useFakeTimers();
    logger = createLogger();
    scheduler = {
      validate: vi.fn().mockReturnValue(true),
      schedule: vi.fn(() => ({ start: vi.fn(), stop: vi.fn(), destroy: vi.fn() }))
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('schedules cron execution when enabled', () => {
    const executor = vi.fn().mockResolvedValue({ results: [] });
    const job = new DataPartitionJob({
      enabled: true,
      schedule: '0 * * * *',
      timezone: 'Etc/UTC',
      scheduler,
      executor,
      loggerInstance: logger,
      runOnStartup: false
    });

    job.start();

    expect(scheduler.validate).toHaveBeenCalledWith('0 * * * *');
    expect(scheduler.schedule).toHaveBeenCalledTimes(1);
    const [, callback] = scheduler.schedule.mock.calls[0];
    callback();
    expect(executor).toHaveBeenCalledWith({ dryRun: false });
  });

  it('skips scheduling when disabled', () => {
    const job = new DataPartitionJob({
      enabled: false,
      schedule: '0 * * * *',
      timezone: 'Etc/UTC',
      scheduler,
      executor: vi.fn(),
      loggerInstance: logger
    });

    job.start();

    expect(scheduler.validate).not.toHaveBeenCalled();
    expect(scheduler.schedule).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith('Data partition job disabled; skipping scheduler start.');
  });

  it('pauses execution after consecutive failures', async () => {
    vi.setSystemTime(new Date('2024-08-01T00:00:00Z'));
    const executor = vi
      .fn()
      .mockRejectedValueOnce(new Error('first failure'))
      .mockRejectedValueOnce(new Error('second failure'))
      .mockResolvedValueOnce({ results: [{ archived: [] }] });

    const job = new DataPartitionJob({
      enabled: true,
      schedule: '*/5 * * * *',
      timezone: 'Etc/UTC',
      scheduler,
      executor,
      loggerInstance: logger,
      failureBackoffMinutes: 5,
      maxConsecutiveFailures: 2
    });

    await expect(job.runCycle('manual')).rejects.toThrow('first failure');
    await expect(job.runCycle('manual')).rejects.toThrow('second failure');

    const paused = await job.runCycle('manual');
    expect(paused).toBeNull();
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ trigger: 'manual', resumeAt: '2024-08-01T00:05:00.000Z' }),
      'Pausing data partition job after repeated failures'
    );

    vi.advanceTimersByTime(5 * 60 * 1000 + 1000);
    const summary = await job.runCycle('manual');
    expect(summary).toEqual({ results: [{ archived: [] }] });
  });
});
