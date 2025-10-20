import { setTimeout as delay } from 'node:timers/promises';

const DEFAULT_POLL_INTERVAL_MS = 2000;
const DEFAULT_MAX_WAIT_MS = 5 * 60 * 1000;

export default class CloudConvertClient {
  constructor({
    apiKey,
    sandboxApiKey,
    sandboxMode = false,
    baseUrl = 'https://api.cloudconvert.com/v2',
    timeoutMs = 15000,
    retry,
    circuitBreaker,
    logger,
    poll
  } = {}) {
    this.apiKey = sandboxMode ? sandboxApiKey ?? apiKey : apiKey;
    this.baseUrl = sandboxMode ? 'https://api.sandbox.cloudconvert.com/v2' : baseUrl;
    this.timeoutMs = timeoutMs;
    this.retry = {
      maxAttempts: retry?.maxAttempts ?? 3,
      baseDelayMs: retry?.baseDelayMs ?? 500
    };
    this.poll = {
      intervalMs: poll?.intervalMs ?? DEFAULT_POLL_INTERVAL_MS,
      maxWaitMs: poll?.maxWaitMs ?? DEFAULT_MAX_WAIT_MS
    };
    this.circuitBreaker = circuitBreaker;
    this.logger = logger ?? console;
  }

  isConfigured() {
    return Boolean(this.apiKey);
  }

  isRetryable(error) {
    const status = error?.status ?? error?.statusCode ?? error?.code;
    if (status === 'CIRCUIT_OPEN') {
      return false;
    }
    if (status === 429) {
      return true;
    }
    if (typeof status === 'number' && status >= 500) {
      return true;
    }
    if (error?.name === 'AbortError' || error?.code === 'ETIMEDOUT') {
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

  buildUrl(path, searchParams) {
    const normalisedBase = this.baseUrl.endsWith('/') ? this.baseUrl : `${this.baseUrl}/`;
    const url = new URL(path, normalisedBase);
    if (searchParams) {
      Object.entries(searchParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, value);
        }
      });
    }
    return url;
  }

  async request({ method = 'GET', path, body, searchParams }) {
    if (!this.isConfigured()) {
      throw new Error('CloudConvert client is not configured.');
    }

    const url = this.buildUrl(path, searchParams);
    const signal = AbortSignal.timeout(this.timeoutMs);
    const headers = {
      Authorization: `Bearer ${this.apiKey}`,
      Accept: 'application/json'
    };

    let payload;
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
      payload = JSON.stringify(body);
    }

    let response;
    try {
      response = await fetch(url, {
        method,
        headers,
        body: payload,
        signal
      });
    } catch (error) {
      if (error.name === 'TimeoutError' || error.name === 'AbortError') {
        const timeoutError = new Error(`CloudConvert request to ${url.pathname} timed out after ${this.timeoutMs} ms`);
        timeoutError.code = 'ETIMEDOUT';
        throw timeoutError;
      }
      error.isNetworkError = true;
      throw error;
    }

    const text = await response.text();
    let data;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch (error) {
        const parseError = new Error('Failed to parse CloudConvert response.');
        parseError.cause = error;
        parseError.status = response.status;
        parseError.body = text;
        throw parseError;
      }
    }

    if (!response.ok) {
      const error = new Error(`CloudConvert request failed with status ${response.status}`);
      error.status = response.status;
      error.body = data ?? text;
      throw error;
    }

    return data ?? null;
  }

  async createJob(payload) {
    return this.execute('jobs.create', async () => {
      const response = await this.request({ method: 'POST', path: 'jobs', body: payload });
      return response?.data ?? response;
    });
  }

  async waitForJob(jobId, options = {}) {
    const { intervalMs = this.poll.intervalMs, maxWaitMs = this.poll.maxWaitMs } = options;
    const start = Date.now();
    let attempts = 0;

    return this.execute('jobs.wait', async () => {
      while (Date.now() - start < maxWaitMs) {
        const jobResponse = await this.request({ method: 'GET', path: `jobs/${jobId}` });
        const job = jobResponse?.data ?? jobResponse;
        const status = job?.status ?? job?.attributes?.status;

        if (!status) {
          throw new Error('CloudConvert job payload did not include a status field.');
        }

        if (status === 'finished') {
          return jobResponse;
        }

        if (status === 'error') {
          const error = new Error('CloudConvert job failed.');
          error.status = status;
          error.job = jobResponse;
          throw error;
        }

        attempts += 1;
        const backoff = Math.min(intervalMs * Math.max(1, attempts), 10000);
        await delay(backoff);
      }

      const timeoutError = new Error(`Timed out waiting for CloudConvert job ${jobId}.`);
      timeoutError.code = 'ETIMEDOUT';
      throw timeoutError;
    });
  }

  extractExportedFiles(jobResponse) {
    if (!jobResponse) {
      return [];
    }

    const tasks = jobResponse?.data?.tasks ?? jobResponse?.tasks ?? [];
    return tasks
      .filter((task) => {
        const operation = task?.operation ?? task?.attributes?.operation ?? '';
        return typeof operation === 'string' && operation.startsWith('export/');
      })
      .flatMap((task) => {
        const result = task?.result ?? task?.attributes?.result;
        return Array.isArray(result?.files) ? result.files : [];
      })
      .filter(Boolean);
  }

  async createJobAndWait(payload, options = {}) {
    const job = await this.createJob(payload);
    const jobId = job?.id ?? job?.data?.id;
    if (!jobId) {
      throw new Error('CloudConvert createJob did not return a job identifier.');
    }

    const finalJob = await this.waitForJob(jobId, options);
    return { job: finalJob, files: this.extractExportedFiles(finalJob) };
  }
}
