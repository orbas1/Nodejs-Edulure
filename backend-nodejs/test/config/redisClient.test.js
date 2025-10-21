import { afterEach, describe, expect, it, vi } from 'vitest';

const redisInstances = [];
const baseRedisConfig = {
  enabled: true,
  url: null,
  host: '127.0.0.1',
  port: 6379,
  username: null,
  password: null,
  tls: { enabled: false, ca: null },
  commandTimeoutMs: 5000,
  keyPrefix: 'edulure:test'
};

vi.mock('ioredis', () => ({
  default: class FakeRedis {
    constructor(...args) {
      this.args = args;
      this.quit = vi.fn().mockResolvedValue();
      this.handlers = {};
      redisInstances.push(this);
    }

    on(event, handler) {
      this.handlers[event] = handler;
      return this;
    }

    emit(event, payload) {
      this.handlers[event]?.(payload);
    }
  }
}));

vi.mock('../../src/config/logger.js', () => ({
  default: {
    child: () => ({
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    })
  }
}));

vi.mock('../../src/config/env.js', () => ({
  env: {
    redis: baseRedisConfig
  }
}));

async function loadModule() {
  vi.resetModules();
  return import('../../src/config/redisClient.js');
}

afterEach(() => {
  Object.assign(baseRedisConfig, {
    enabled: true,
    url: null,
    host: '127.0.0.1',
    port: 6379,
    username: null,
    password: null,
    tls: { enabled: false, ca: null },
    commandTimeoutMs: 5000,
    keyPrefix: 'edulure:test'
  });
  redisInstances.length = 0;
});

describe('redis client configuration', () => {
  it('builds connection options for direct host connections', async () => {
    const { buildRedisOptions } = await loadModule();
    const options = buildRedisOptions();
    expect(options).toMatchObject({
      host: '127.0.0.1',
      port: 6379,
      keyPrefix: 'edulure:test',
      commandTimeout: 5000
    });
  });

  it('prefers URL-based connections when provided', async () => {
    baseRedisConfig.url = 'rediss://:secret@cache.internal:6380/0';
    baseRedisConfig.tls = { enabled: true, ca: 'cert' };

    const { createRedisClient } = await loadModule();
    const instance = createRedisClient();

    expect(redisInstances).toHaveLength(1);
    expect(instance.args[0]).toBe(baseRedisConfig.url);
    expect(instance.args[1]).toMatchObject({ commandTimeout: 5000 });
  });

  it('shares a singleton client and supports graceful shutdown', async () => {
    const { getRedisClient, closeRedisClient } = await loadModule();
    const first = getRedisClient();
    const second = getRedisClient();

    expect(first).toBe(second);
    expect(redisInstances).toHaveLength(1);

    await closeRedisClient();
    expect(first.quit).toHaveBeenCalledTimes(1);
  });
});
