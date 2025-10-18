import { setTimeout as delay } from 'node:timers/promises';

import db from '../config/database.js';
import { env } from '../config/env.js';
import logger from '../config/logger.js';
import { featureFlagService, runtimeConfigService } from '../services/FeatureFlagService.js';
import { featureFlagGovernanceService } from '../services/FeatureFlagGovernanceService.js';
import { searchClusterService } from '../services/SearchClusterService.js';

const bootstrapLogger = logger.child({ module: 'bootstrap' });

function resolveAttempts(attempts) {
  if (typeof attempts === 'number' && attempts > 0) {
    return Math.min(Math.floor(attempts), env.bootstrap.maxAttempts);
  }
  return env.bootstrap.maxAttempts;
}

function resolveDelay(delayMs) {
  if (typeof delayMs === 'number' && delayMs > 0) {
    return Math.min(Math.floor(delayMs), 60000);
  }
  return env.bootstrap.retryDelayMs;
}

export async function executeWithRetry(name, handler, { attempts, delayMs, readiness, component } = {}) {
  const totalAttempts = resolveAttempts(attempts);
  const backoffBase = resolveDelay(delayMs);
  let lastError;

  for (let attempt = 1; attempt <= totalAttempts; attempt += 1) {
    try {
      return await handler(attempt, totalAttempts);
    } catch (error) {
      lastError = error;
      bootstrapLogger.error({ err: error, attempt, attempts: totalAttempts, scope: name }, `${name} failed`);
      readiness?.markPending(component ?? name, `Retrying ${name} (${attempt} of ${totalAttempts})`);
      if (attempt < totalAttempts) {
        const backoffMs = backoffBase * attempt;
        await delay(backoffMs);
      }
    }
  }

  throw lastError;
}

export async function ensureDatabaseConnection({ runMigrations = true, readiness } = {}) {
  const component = 'database';
  readiness?.markPending(component, 'Connecting to database');

  await executeWithRetry(
    'database connection',
    async () => {
      await db.raw('select 1 as health_check');
    },
    { readiness, component }
  );

  if (runMigrations) {
    readiness?.markPending(component, 'Applying migrations');
    await executeWithRetry(
      'database migrations',
      async () => {
        await db.migrate.latest();
      },
      { readiness, component }
    );
  }

  readiness?.markReady(component, 'Database connection established');

  return {
    async close() {
      readiness?.markDegraded(component, 'Closing connection pool');
      await db.destroy();
    }
  };
}

const INFRASTRUCTURE_SERVICES = {
  'feature-flags': {
    start: async () => {
      await featureFlagGovernanceService.ensureBootstrapSync({ actor: env.featureFlags?.bootstrapActor });
      await featureFlagService.start();
    },
    stop: () => featureFlagService.stop(),
    readyMessage: 'Feature flag cache online'
  },
  'runtime-config': {
    start: () => runtimeConfigService.start(),
    stop: () => runtimeConfigService.stop(),
    readyMessage: 'Runtime configuration cache online'
  },
  'search-cluster': {
    start: () => searchClusterService.start(),
    stop: () => searchClusterService.stop(),
    readyMessage: 'Search cluster polling active'
  }
};

export async function startCoreInfrastructure({ services = Object.keys(INFRASTRUCTURE_SERVICES), readiness } = {}) {
  const started = [];

  for (const name of services) {
    const descriptor = INFRASTRUCTURE_SERVICES[name];
    if (!descriptor) {
      continue;
    }

    readiness?.markPending(name, 'Initialising');

    try {
      await executeWithRetry(
        `${name} bootstrap`,
        async () => {
          await descriptor.start();
        },
        { readiness, component: name }
      );
      readiness?.markReady(name, descriptor.readyMessage ?? 'Ready');
      started.push({ name, stop: descriptor.stop });
    } catch (error) {
      readiness?.markFailed(name, error);
      bootstrapLogger.error({ err: error, service: name }, 'Infrastructure service failed to start');
    }
  }

  return {
    async stop() {
      while (started.length) {
        const entry = started.pop();
        try {
          await entry.stop();
          readiness?.markDegraded(entry.name, 'Stopped');
        } catch (error) {
          bootstrapLogger.error({ err: error, service: entry.name }, 'Failed to stop infrastructure service');
        }
      }
    }
  };
}
