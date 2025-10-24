import logger from '../config/logger.js';
import { fetchActivePolicies } from './dataRetentionService.js';

function defaultNow() {
  return Date.now();
}

export class RetentionPolicyRegistry {
  constructor({
    loader = fetchActivePolicies,
    refreshIntervalMs = 5 * 60 * 1000,
    now = defaultNow,
    loggerInstance = logger.child({ module: 'retention-policy-registry' })
  } = {}) {
    if (typeof loader !== 'function') {
      throw new Error('RetentionPolicyRegistry requires a loader function.');
    }

    this.loader = loader;
    this.refreshIntervalMs = refreshIntervalMs;
    this.now = typeof now === 'function' ? now : defaultNow;
    this.logger = loggerInstance;
    this.cache = [];
    this.cacheTimestamp = 0;
    this.loadingPromise = null;
  }

  async refresh({ force = false } = {}) {
    if (this.loadingPromise) {
      return this.loadingPromise;
    }

    if (!force && this.cache.length > 0 && this.now() - this.cacheTimestamp < this.refreshIntervalMs) {
      return this.cache;
    }

    this.loadingPromise = (async () => {
      try {
        const policies = await this.loader();
        this.cache = Array.isArray(policies) ? policies : [];
        this.cacheTimestamp = this.now();
        return this.cache;
      } catch (error) {
        this.logger.error({ err: error }, 'Failed to refresh retention policy cache');
        throw error;
      } finally {
        this.loadingPromise = null;
      }
    })();

    return this.loadingPromise;
  }

  async listActivePolicies({ forceRefresh = false } = {}) {
    await this.refresh({ force: forceRefresh });
    return this.cache;
  }

  async getPolicyById(id, { forceRefresh = false } = {}) {
    if (forceRefresh || !this.cache.find((policy) => String(policy.id) === String(id))) {
      await this.refresh({ force: forceRefresh });
    }

    return this.cache.find((policy) => String(policy.id) === String(id)) ?? null;
  }

  invalidate() {
    this.cache = [];
    this.cacheTimestamp = 0;
  }
}

const defaultRegistry = new RetentionPolicyRegistry();

export default defaultRegistry;
