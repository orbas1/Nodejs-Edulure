import { randomUUID } from 'node:crypto';

import { env } from '../config/env.js';
import logger from '../config/logger.js';
import { getRedisClient } from '../config/redisClient.js';

const RELEASE_LOCK_SCRIPT =
  'if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) else return 0 end';

function safeJsonParse(value) {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value);
    return typeof parsed === 'object' && parsed !== null ? parsed : null;
  } catch (_error) {
    return null;
  }
}

export class DistributedRuntimeCache {
  constructor({ redisClient, loggerInstance, keys, lockTtlMs }) {
    this.redis = redisClient;
    this.logger = loggerInstance;
    this.keys = keys;
    this.lockTtlMs = lockTtlMs;
  }

  async ensureConnected() {
    if (!this.redis) {
      return false;
    }

    if (this.redis.status === 'ready') {
      return true;
    }

    try {
      await this.redis.connect();
      return this.redis.status === 'ready';
    } catch (error) {
      this.logger.warn({ err: error }, 'Unable to establish Redis connection');
      return false;
    }
  }

  async readSnapshot(key) {
    if (!this.redis) {
      return null;
    }

    if (!(await this.ensureConnected())) {
      return null;
    }

    try {
      const raw = await this.redis.get(key);
      const payload = safeJsonParse(raw);
      return payload;
    } catch (error) {
      this.logger.warn({ err: error, key }, 'Failed to read distributed runtime snapshot');
      return null;
    }
  }

  async writeSnapshot(key, value) {
    if (!this.redis) {
      return null;
    }

    if (!(await this.ensureConnected())) {
      return null;
    }

    const payload = {
      version: Date.now(),
      updatedAt: new Date().toISOString(),
      value
    };

    try {
      await this.redis.set(key, JSON.stringify(payload));
      return payload;
    } catch (error) {
      this.logger.warn({ err: error, key }, 'Failed to write distributed runtime snapshot');
      return null;
    }
  }

  async acquireLock(key) {
    if (!this.redis) {
      return null;
    }

    if (!(await this.ensureConnected())) {
      return null;
    }

    const token = randomUUID();

    try {
      const result = await this.redis.set(key, token, 'PX', this.lockTtlMs, 'NX');
      if (result === 'OK') {
        return token;
      }
      return null;
    } catch (error) {
      this.logger.warn({ err: error, key }, 'Failed to acquire distributed runtime lock');
      return null;
    }
  }

  async releaseLock(key, token) {
    if (!this.redis || !token) {
      return false;
    }

    if (!(await this.ensureConnected())) {
      return false;
    }

    try {
      const result = await this.redis.eval(RELEASE_LOCK_SCRIPT, 1, key, token);
      return result === 1;
    } catch (error) {
      this.logger.warn({ err: error, key }, 'Failed to release distributed runtime lock');
      return false;
    }
  }

  async readFeatureFlags() {
    return this.readSnapshot(this.keys.featureFlags);
  }

  async writeFeatureFlags(flags) {
    return this.writeSnapshot(this.keys.featureFlags, flags);
  }

  async readRuntimeConfig() {
    return this.readSnapshot(this.keys.runtimeConfig);
  }

  async writeRuntimeConfig(entries) {
    return this.writeSnapshot(this.keys.runtimeConfig, entries);
  }

  async acquireFeatureFlagLock() {
    return this.acquireLock(this.keys.featureFlagLock);
  }

  async releaseFeatureFlagLock(token) {
    return this.releaseLock(this.keys.featureFlagLock, token);
  }

  async acquireRuntimeConfigLock() {
    return this.acquireLock(this.keys.runtimeConfigLock);
  }

  async releaseRuntimeConfigLock(token) {
    return this.releaseLock(this.keys.runtimeConfigLock, token);
  }
}

const runtimeCacheLogger = logger.child({ service: 'DistributedRuntimeCache' });

export const distributedRuntimeCache = env.redis.enabled
  ? new DistributedRuntimeCache({
      redisClient: getRedisClient(),
      loggerInstance: runtimeCacheLogger,
      keys: env.redis.keys,
      lockTtlMs: env.redis.lockTtlMs
    })
  : null;
