import { setTimeout as delay } from 'node:timers/promises';
import CloudConvert from 'cloudconvert';

export default class CloudConvertClient {
  constructor({
    apiKey,
    sandboxApiKey,
    sandboxMode = false,
    baseUrl = 'https://api.cloudconvert.com/v2',
    timeoutMs = 15000,
    retry,
    circuitBreaker,
    logger
  } = {}) {
    this.apiKey = sandboxMode ? sandboxApiKey ?? apiKey : apiKey;
    this.baseUrl = sandboxMode ? 'https://api.sandbox.cloudconvert.com/v2' : baseUrl;
    this.timeoutMs = timeoutMs;
    this.retry = {
      maxAttempts: retry?.maxAttempts ?? 3,
      baseDelayMs: retry?.baseDelayMs ?? 500
    };
    this.circuitBreaker = circuitBreaker;
    this.logger = logger ?? console;
    this.client = this.apiKey
      ? new CloudConvert(this.apiKey, { apiUrl: this.baseUrl, timeout: this.timeoutMs })
      : null;
  }

  isConfigured() {
    return Boolean(this.client);
  }

  isRetryable(error) {
    const status = error?.status ?? error?.statusCode ?? error?.code;
    if (status === 429) {
      return true;
    }
    if (typeof status === 'number' && status >= 500) {
      return true;
    }
    return Boolean(error?.isNetworkError);
  }

  async execute(operation, handler) {
    const breaker = this.circuitBreaker;
    const { allowed } = breaker ? await breaker.allowRequest() : { allowed: true };
    if (!allowed) {
      const error = new Error(`CloudConvert circuit breaker open for ${operation}.`);
      error.code = 'CIRCUIT_OPEN';
      throw error;
    }

    let attempt = 0;
    let lastError;
    const maxAttempts = this.retry.maxAttempts;

    while (attempt <= maxAttempts) {
      attempt += 1;
      try {
        const result = await handler();
        if (breaker) {
          await breaker.recordSuccess();
        }
        return result;
      } catch (error) {
        lastError = error;
        if (breaker) {
          await breaker.recordFailure();
        }

        const shouldRetry = attempt <= maxAttempts && this.isRetryable(error);
        this.logger.warn({ err: error, attempt, operation }, 'CloudConvert operation failed');
        if (!shouldRetry) {
          throw error;
        }

        const delayMs = this.retry.baseDelayMs * attempt;
        await delay(delayMs);
      }
    }

    throw lastError;
  }

  async createJob(payload) {
    if (!this.isConfigured()) {
      throw new Error('CloudConvert client is not configured.');
    }

    return this.execute('jobs.create', () => this.client.jobs.create(payload));
  }

  async waitForJob(jobId) {
    if (!this.isConfigured()) {
      throw new Error('CloudConvert client is not configured.');
    }

    return this.execute('jobs.wait', () => this.client.jobs.wait(jobId));
  }
}
