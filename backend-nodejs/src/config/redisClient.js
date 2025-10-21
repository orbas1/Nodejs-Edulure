import Redis from 'ioredis';

import { env } from './env.js';
import logger from './logger.js';

const redisLogger = logger.child({ module: 'redis' });
let client = null;
let lastErrorLoggedAt = 0;
const ERROR_LOG_THROTTLE_MS = 30000;

export function buildRedisOptions(configuration = env.redis) {
  const retryStrategy = (attempt) => Math.min(attempt * 200, 2000);

  const options = {
    lazyConnect: true,
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
    commandTimeout: configuration.commandTimeoutMs,
    keyPrefix: configuration.keyPrefix ?? undefined,
    retryStrategy,
    reconnectOnError: (error) => Boolean(error?.message?.includes('READONLY'))
  };

  if (!configuration.url) {
    options.host = configuration.host;
    options.port = configuration.port;
    options.username = configuration.username ?? undefined;
    options.password = configuration.password ?? undefined;

    if (configuration.tls?.enabled) {
      options.tls = {
        rejectUnauthorized: configuration.tls.ca ? true : false,
        ca: configuration.tls.ca ? [configuration.tls.ca] : undefined
      };
    }
  }

  return options;
}

export function createRedisClient(configuration = env.redis, log = redisLogger) {
  const options = buildRedisOptions(configuration);
  lastErrorLoggedAt = 0;
  const instance = configuration.url ? new Redis(configuration.url, options) : new Redis(options);

  instance.on('connect', () => {
    log.debug('Redis connection established');
  });

  instance.on('ready', () => {
    log.info('Redis client ready for commands');
    lastErrorLoggedAt = 0;
  });

  instance.on('error', (error) => {
    const now = Date.now();
    if (now - lastErrorLoggedAt > ERROR_LOG_THROTTLE_MS) {
      log.error({ err: error }, 'Redis connection error');
      lastErrorLoggedAt = now;
    } else {
      log.debug({ err: error }, 'Redis connection error (suppressed)');
    }
  });

  instance.on('end', () => {
    log.warn('Redis connection closed');
  });

  instance.on('reconnecting', (delay) => {
    log.warn({ delay }, 'Redis reconnecting');
  });

  return instance;
}

export function getRedisClient() {
  if (!env.redis.enabled) {
    return null;
  }

  if (!client) {
    client = createRedisClient();
  }

  return client;
}

export async function closeRedisClient() {
  if (client) {
    try {
      await client.quit();
    } catch (error) {
      redisLogger.warn({ err: error }, 'Failed to gracefully close Redis connection');
    }
    client = null;
  }
}
