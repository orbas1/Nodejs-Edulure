import Redis from 'ioredis';

import { env } from './env.js';
import logger from './logger.js';

const redisLogger = logger.child({ module: 'redis' });
let client = null;
let lastErrorLoggedAt = 0;
const ERROR_LOG_THROTTLE_MS = 30000;

function createRedisClient() {
  const commonOptions = {
    lazyConnect: true,
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
    commandTimeout: env.redis.commandTimeoutMs,
    retryStrategy: (attempt) => {
      const delay = Math.min(attempt * 200, 2000);
      return delay;
    },
    reconnectOnError: (error) => {
      if (!error) {
        return false;
      }

      if (error.message?.includes('READONLY')) {
        return true;
      }

      return false;
    }
  };

  let instance;
  if (env.redis.url) {
    instance = new Redis(env.redis.url, commonOptions);
  } else {
    const tlsOptions = env.redis.tls.enabled
      ? {
          rejectUnauthorized: true,
          ca: env.redis.tls.ca ? [env.redis.tls.ca] : undefined
        }
      : undefined;

    instance = new Redis({
      ...commonOptions,
      host: env.redis.host,
      port: env.redis.port,
      username: env.redis.username ?? undefined,
      password: env.redis.password ?? undefined,
      tls: tlsOptions
    });
  }

  instance.on('connect', () => {
    redisLogger.debug('Redis connection established');
  });

  instance.on('ready', () => {
    redisLogger.info('Redis client ready for commands');
    lastErrorLoggedAt = 0;
  });

  instance.on('error', (error) => {
    const now = Date.now();
    if (now - lastErrorLoggedAt > ERROR_LOG_THROTTLE_MS) {
      redisLogger.error({ err: error }, 'Redis connection error');
      lastErrorLoggedAt = now;
    } else {
      redisLogger.debug({ err: error }, 'Redis connection error (suppressed)');
    }
  });

  instance.on('end', () => {
    redisLogger.warn('Redis connection closed');
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
