import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DataPartitionJob } from '../src/jobs/dataPartitionJob.js';

const metrics = {
  recordBackgroundJobRun: vi.fn(),
  recordDataPartitionSummary: vi.fn()
};

vi.mock('../src/observability/metrics.js', () => metrics);

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
    metrics.recordBackgroundJobRun.mockClear();
    metrics.recordDataPartitionSummary.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('schedules cron execution when enabled', async () => {
    const executor = vi.fn().mockResolvedValue({ results: [], executedAt: '2024-06-01T00:00:00Z', runId: 'run-1' });
    const jobStateModel = { save: vi.fn(), get: vi.fn() };
    const job = new DataPartitionJob({
      enabled: true,
      schedule: '0 * * * *',
      timezone: 'Etc/UTC',
      scheduler,
      executor,
      loggerInstance: logger,
      runOnStartup: false,
      jobStateModel
    });

    job.start();

    expect(scheduler.validate).toHaveBeenCalledWith('0 * * * *');
    expect(scheduler.schedule).toHaveBeenCalledTimes(1);
    const [, callback] = scheduler.schedule.mock.calls[0];
    await callback();
    expect(executor).toHaveBeenCalledWith({ dryRun: false });
    expect(metrics.recordBackgroundJobRun).toHaveBeenCalledWith(
      expect.objectContaining({ job: 'data_partition', outcome: 'success', processed: 0 })
    );
    expect(metrics.recordDataPartitionSummary).toHaveBeenCalledWith(
      expect.objectContaining({ summary: expect.any(Object), outcome: 'success' })
    );
    expect(jobStateModel.save).toHaveBeenCalledWith(
      'data_partition',
      'last_summary',
      expect.objectContaining({ state: expect.any(Object) })
    );
  });

  it('skips scheduling when disabled', () => {
    const job = new DataPartitionJob({
      enabled: false,
      schedule: '0 * * * *',
      timezone: 'Etc/UTC',
      scheduler,
      executor: vi.fn(),
      loggerInstance: logger,
      jobStateModel: { save: vi.fn(), get: vi.fn() }
    });

    job.start();

    expect(scheduler.validate).not.toHaveBeenCalled();
    expect(scheduler.schedule).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith('Data partition job disabled; skipping scheduler start.');
  });

  it('pauses execution after consecutive failures and resumes', async () => {
    vi.setSystemTime(new Date('2024-08-01T00:00:00Z'));
    const executor = vi
      .fn()
      .mockRejectedValueOnce(new Error('first failure'))
      .mockRejectedValueOnce(new Error('second failure'))
      .mockResolvedValueOnce({ results: [{ archived: [] }], executedAt: '2024-08-01T00:05:01Z', runId: 'run-3' });
    const jobStateModel = { save: vi.fn(), get: vi.fn() };

    const job = new DataPartitionJob({
      enabled: true,
      schedule: '*/5 * * * *',
      timezone: 'Etc/UTC',
      scheduler,
      executor,
      loggerInstance: logger,
      failureBackoffMinutes: 5,
      maxConsecutiveFailures: 2,
      jobStateModel
    });

    await expect(job.runCycle('manual')).rejects.toThrow('first failure');
    await expect(job.runCycle('manual')).rejects.toThrow('second failure');

    const paused = await job.runCycle('manual');
    expect(paused).toBeNull();
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ trigger: 'manual', resumeAt: '2024-08-01T00:05:00.000Z' }),
      'Pausing data partition job after repeated failures'
    );
    expect(metrics.recordBackgroundJobRun).toHaveBeenCalledWith(
      expect.objectContaining({ job: 'data_partition', outcome: 'failure' })
    );

    vi.advanceTimersByTime(5 * 60 * 1000 + 1000);
    const summary = await job.runCycle('manual');
    expect(summary).toEqual({ results: [{ archived: [] }], executedAt: '2024-08-01T00:05:01Z', runId: 'run-3' });
    expect(metrics.recordBackgroundJobRun).toHaveBeenCalledWith(
      expect.objectContaining({ job: 'data_partition', outcome: 'success' })
    );
    expect(metrics.recordDataPartitionSummary).toHaveBeenCalled();
    expect(jobStateModel.save).toHaveBeenCalledWith(
      'data_partition',
      'last_summary',
      expect.objectContaining({ state: expect.any(Object) })
    );
  });
});
