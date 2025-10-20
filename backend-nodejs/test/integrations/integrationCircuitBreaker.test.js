import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import IntegrationCircuitBreaker from '../../src/integrations/IntegrationCircuitBreaker.js';

const createLogger = () => ({
  warn: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  child: vi.fn().mockReturnThis()
});

const flushMicrotasks = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

describe('IntegrationCircuitBreaker', () => {
  let redis;
  let logger;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
    redis = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(null)
    };
    logger = createLogger();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('opens after repeated failures and transitions to half-open after cooldown', async () => {
    const breaker = new IntegrationCircuitBreaker({
      redisClient: redis,
      key: 'test:breaker',
      failureThreshold: 2,
      cooldownMs: 1000,
      logger
    });

    const first = await breaker.allowRequest();
    expect(first).toEqual({ allowed: true, mode: 'closed' });

    await breaker.recordFailure();
    await breaker.recordFailure();

    const blocked = await breaker.allowRequest();
    expect(blocked).toEqual({
      allowed: false,
      mode: 'open',
      resumeAt: '2024-01-01T00:00:01.000Z'
    });

    vi.advanceTimersByTime(1000);
    const halfOpen = await breaker.allowRequest();
    expect(halfOpen).toEqual({ allowed: true, mode: 'half-open' });

    await breaker.recordSuccess();
    await breaker.recordSuccess();

    const reopened = await breaker.allowRequest();
    expect(reopened).toEqual({ allowed: true, mode: 'closed' });
  });

  it('honours manual pauses before allowing traffic', async () => {
    const breaker = new IntegrationCircuitBreaker({
      redisClient: redis,
      key: 'test:pause',
      failureThreshold: 2,
      cooldownMs: 1000,
      logger
    });

    const pausePromise = breaker.pause(2000);
    await flushMicrotasks();

    const duringPause = await breaker.allowRequest();
    expect(duringPause.allowed).toBe(false);
    expect(duringPause.mode).toBe('paused');
    expect(duringPause.resumeAt).toBe('2024-01-01T00:00:02.000Z');

    await vi.advanceTimersByTimeAsync(2000);
    await pausePromise;

    const afterPause = await breaker.allowRequest();
    expect(afterPause.allowed).toBe(true);
  });

  it('reports resumeAt when circuit is still cooling down', async () => {
    const openedAt = Date.now();
    redis.get.mockResolvedValueOnce(
      JSON.stringify({
        mode: 'open',
        openedAt,
        failureCount: 3
      })
    );

    const breaker = new IntegrationCircuitBreaker({
      redisClient: redis,
      key: 'test:resume',
      failureThreshold: 3,
      cooldownMs: 60000,
      logger
    });

    const response = await breaker.allowRequest();
    expect(response).toEqual({
      allowed: false,
      mode: 'open',
      resumeAt: '2024-01-01T00:01:00.000Z'
    });
  });

  it('persists state snapshots to redis with ISO timestamps', async () => {
    const breaker = new IntegrationCircuitBreaker({
      redisClient: redis,
      key: 'test:persist',
      cooldownMs: 5000,
      logger
    });

    const pausedUntil = new Date('2024-01-01T00:02:00Z');
    const lastAttemptAt = new Date('2024-01-01T00:00:30Z');

    await breaker.persistState({
      mode: 'open',
      pausedUntil,
      lastAttemptAt
    });

    expect(redis.set).toHaveBeenCalledWith(
      'test:persist',
      expect.stringContaining('2024-01-01T00:02:00.000Z'),
      'PX',
      10 * 60 * 1000
    );

    const [, payload] = redis.set.mock.calls[0];
    const parsed = JSON.parse(payload);
    expect(parsed).toMatchObject({
      mode: 'open',
      pausedUntil: '2024-01-01T00:02:00.000Z',
      lastAttemptAt: '2024-01-01T00:00:30.000Z'
    });
  });

  it('exposes a state snapshot with computed resume hints', async () => {
    const breaker = new IntegrationCircuitBreaker({
      redisClient: redis,
      key: 'test:snapshot',
      cooldownMs: 5000,
      logger
    });

    const openedAt = Date.now();
    await breaker.persistState({
      mode: 'open',
      openedAt,
      lastAttemptAt: new Date('2024-01-01T00:00:10Z')
    });

    const snapshot = await breaker.getState();
    expect(snapshot.mode).toBe('open');
    expect(snapshot.resumeAt).toBe(new Date(openedAt + 5000).toISOString());
    expect(snapshot.lastAttemptAt).toBe('2024-01-01T00:00:10.000Z');
    expect(snapshot.pausedUntil).toBeNull();
  });

  it('prioritises manual pauses when reporting resume hints', async () => {
    const breaker = new IntegrationCircuitBreaker({
      redisClient: redis,
      key: 'test:snapshot-pause',
      cooldownMs: 5000,
      logger
    });

    await breaker.persistState({
      mode: 'open',
      openedAt: Date.now(),
      pausedUntil: new Date('2024-01-01T00:05:00Z')
    });

    const snapshot = await breaker.getState();
    expect(snapshot.mode).toBe('open');
    expect(snapshot.resumeAt).toBe('2024-01-01T00:05:00.000Z');
    expect(snapshot.pausedUntil).toBe('2024-01-01T00:05:00.000Z');
  });
});
