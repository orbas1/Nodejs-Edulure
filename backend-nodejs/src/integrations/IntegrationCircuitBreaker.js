import { setTimeout as delay } from 'node:timers/promises';

const DEFAULT_STATE = {
  mode: 'closed',
  failureCount: 0,
  openedAt: null,
  lastFailureAt: null,
  lastSuccessAt: null,
  halfOpenSuccesses: 0,
  halfOpenFailures: 0
};

export default class IntegrationCircuitBreaker {
  constructor({
    redisClient = null,
    key,
    failureThreshold = 5,
    cooldownMs = 60000,
    halfOpenSuccessThreshold = 2,
    logger
  } = {}) {
    if (!key || typeof key !== 'string') {
      throw new Error('IntegrationCircuitBreaker requires a Redis key identifier.');
    }

    this.redis = redisClient ?? null;
    this.key = key;
    this.failureThreshold = failureThreshold;
    this.cooldownMs = cooldownMs;
    this.halfOpenSuccessThreshold = halfOpenSuccessThreshold;
    this.logger = logger ?? console;
    this.memoryState = { ...DEFAULT_STATE };
  }

  async loadState() {
    if (this.redis) {
      try {
        const raw = await this.redis.get(this.key);
        if (raw) {
          const parsed = JSON.parse(raw);
          this.memoryState = { ...DEFAULT_STATE, ...parsed };
        }
      } catch (error) {
        this.logger.warn({ err: error }, 'Failed to read circuit breaker state from Redis');
      }
    }

    return this.memoryState;
  }

  async persistState(state) {
    this.memoryState = state;
    if (!this.redis) {
      return;
    }

    try {
      const ttl = Math.max(this.cooldownMs * 2, 10 * 60 * 1000);
      await this.redis.set(this.key, JSON.stringify(state), 'PX', ttl);
    } catch (error) {
      this.logger.warn({ err: error }, 'Failed to persist circuit breaker state to Redis');
    }
  }

  async allowRequest() {
    const state = await this.loadState();
    const now = Date.now();

    if (state.mode === 'open') {
      if (!state.openedAt || now - state.openedAt >= this.cooldownMs) {
        state.mode = 'half-open';
        state.halfOpenSuccesses = 0;
        state.halfOpenFailures = 0;
        await this.persistState(state);
        return { allowed: true, mode: 'half-open' };
      }

      return { allowed: false, mode: 'open' };
    }

    await this.persistState({ ...state, lastAttemptAt: now });
    return { allowed: true, mode: state.mode ?? 'closed' };
  }

  async recordSuccess() {
    const state = await this.loadState();
    state.lastSuccessAt = Date.now();

    if (state.mode === 'half-open') {
      state.halfOpenSuccesses += 1;
      if (state.halfOpenSuccesses >= this.halfOpenSuccessThreshold) {
        state.mode = 'closed';
        state.failureCount = 0;
        state.openedAt = null;
        state.halfOpenSuccesses = 0;
        state.halfOpenFailures = 0;
      }
    } else {
      state.failureCount = 0;
      state.openedAt = null;
    }

    await this.persistState(state);
  }

  async recordFailure() {
    const state = await this.loadState();
    const now = Date.now();
    state.lastFailureAt = now;

    if (state.mode === 'half-open') {
      state.halfOpenFailures += 1;
      state.mode = 'open';
      state.failureCount = this.failureThreshold;
      state.openedAt = now;
      await this.persistState(state);
      return;
    }

    state.failureCount += 1;
    if (state.failureCount >= this.failureThreshold) {
      state.mode = 'open';
      state.openedAt = now;
    }

    await this.persistState(state);
  }

  async close() {
    await this.persistState({ ...DEFAULT_STATE });
  }

  async pause(durationMs) {
    if (!durationMs || durationMs <= 0) {
      return;
    }

    const state = await this.loadState();
    state.mode = 'open';
    state.openedAt = Date.now();
    await this.persistState(state);
    await delay(durationMs);
  }
}
