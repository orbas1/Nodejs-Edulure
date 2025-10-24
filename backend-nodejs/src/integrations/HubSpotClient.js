import crypto from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';

import { recordIntegrationRequestAttempt } from '../observability/metrics.js';

const HUBSPOT_BATCH_LIMIT = 100;
const DEFAULT_RETRY_BASE_DELAY_MS = 500;
const DEFAULT_RETRY_MAX_DELAY_MS = 5000;

function normaliseBaseUrl(baseUrl) {
  if (!baseUrl) {
    return 'https://api.hubapi.com/';
  }
  return baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
}

function buildUserAgent() {
  return `Edulure-Platform-Integration/${process.env.npm_package_version ?? '1.50.0'}`;
}

export default class HubSpotClient {
  constructor({
    accessToken,
    baseUrl,
    timeoutMs = 10000,
    maxRetries = 3,
    logger,
    fetchImpl,
    auditLogger,
    sleep = delay,
    random = Math.random,
    retryBaseDelayMs = DEFAULT_RETRY_BASE_DELAY_MS,
    retryMaxDelayMs = DEFAULT_RETRY_MAX_DELAY_MS
  } = {}) {
    if (!accessToken) {
      throw new Error('HubSpotClient requires a private app access token.');
    }

    this.accessToken = accessToken;
    this.baseUrl = normaliseBaseUrl(baseUrl);
    this.timeoutMs = timeoutMs;
    this.maxRetries = maxRetries;
    this.logger = logger ?? console;
    this.fetchImpl = fetchImpl ?? globalThis.fetch.bind(globalThis);
    this.sleep = typeof sleep === 'function' ? sleep : delay;
    this.random = typeof random === 'function' ? random : Math.random;
    this.auditLogger = typeof auditLogger === 'function' ? auditLogger : null;
    this.retryBaseDelayMs = Number.isFinite(retryBaseDelayMs) && retryBaseDelayMs > 0
      ? retryBaseDelayMs
      : DEFAULT_RETRY_BASE_DELAY_MS;
    const normalisedMaxDelay = Number.isFinite(retryMaxDelayMs) && retryMaxDelayMs > 0
      ? retryMaxDelayMs
      : DEFAULT_RETRY_MAX_DELAY_MS;
    this.retryMaxDelayMs = Math.max(this.retryBaseDelayMs, normalisedMaxDelay);
  }

  async recordAudit({ requestMethod, requestPath, statusCode, outcome, durationMs, metadata, error }) {
    if (!this.auditLogger) {
      return;
    }

    try {
      await this.auditLogger({
        requestMethod,
        requestPath,
        statusCode,
        outcome,
        durationMs,
        metadata,
        errorCode: error?.code ?? error?.name ?? null,
        errorMessage: error?.message ?? null
      });
    } catch (auditError) {
      this.logger.warn(
        { module: 'hubspot-client', err: auditError },
        'Failed to record HubSpot integration audit entry'
      );
    }
  }

  async request(path, { method = 'GET', body, searchParams, idempotencyKey, headers = {} } = {}) {
    const url = new URL(path, this.baseUrl);
    if (searchParams) {
      Object.entries(searchParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, value);
        }
      });
    }

    const finalHeaders = {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      'User-Agent': buildUserAgent(),
      ...headers
    };

    if (idempotencyKey) {
      finalHeaders['Idempotency-Key'] = idempotencyKey;
    }

    let lastError;

    for (let attempt = 1; attempt <= this.maxRetries + 1; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
      const attemptStartedAt = Date.now();

      const recordAttemptMetrics = (outcome, statusCode) => {
        const durationMs = Date.now() - attemptStartedAt;
        recordIntegrationRequestAttempt({
          provider: 'hubspot',
          operation: method,
          outcome,
          statusCode,
          durationMs,
          isRetry: attempt > 1
        });
        return durationMs;
      };

      try {
        const response = await this.fetchImpl(url, {
          method,
          headers: finalHeaders,
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal
        });
        clearTimeout(timeout);

        const metadata = {
          attempt,
          maxRetries: this.maxRetries,
          hasBody: Boolean(body),
          idempotencyKey: idempotencyKey ?? null,
          queryKeys: Array.from(url.searchParams.keys())
        };

        let outcome = 'success';
        let auditMetadata = metadata;
        let retryAfterMs = null;
        let backoffMs = null;
        if (response.status === 429 || response.status >= 500) {
          const errorBody = await this.safeJson(response);
          const retryAfterSeconds = Number(response.headers.get('Retry-After') ?? 0);
          retryAfterMs = Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
            ? retryAfterSeconds * 1000
            : null;
          backoffMs = this.computeRetryDelayMs(attempt, { retryAfterMs });
          outcome = response.status === 429 ? 'degraded' : 'failure';
          auditMetadata = {
            ...metadata,
            retryAfterMs,
            backoffMs,
            errorDetails: Array.isArray(errorBody?.errors)
              ? errorBody.errors.slice(0, 5)
              : errorBody
          };
          lastError = new Error(`HubSpot request failed with status ${response.status}`);
          lastError.details = errorBody;
          this.logger.warn(
            {
              module: 'hubspot-client',
              status: response.status,
              attempt,
              path: url.pathname,
              backoffMs
            },
            'HubSpot responded with retryable error'
          );

          const retryScheduled = attempt <= this.maxRetries;
          const durationMs = recordAttemptMetrics(retryScheduled ? 'retry' : 'failure', response.status);

          await this.recordAudit({
            requestMethod: method,
            requestPath: url.pathname,
            statusCode: response.status,
            outcome,
            durationMs,
            metadata: auditMetadata,
            error: lastError
          });

          if (retryScheduled) {
            await this.sleep(backoffMs);
            continue;
          }

          throw lastError;
        }

        if (!response.ok) {
          const errorBody = await this.safeJson(response);
          const error = new Error(`HubSpot request failed with status ${response.status}`);
          error.details = errorBody;

          const durationMs = recordAttemptMetrics('failure', response.status);

          await this.recordAudit({
            requestMethod: method,
            requestPath: url.pathname,
            statusCode: response.status,
            outcome: 'failure',
            durationMs,
            metadata: {
              ...metadata,
              errorDetails: Array.isArray(errorBody?.errors)
                ? errorBody.errors.slice(0, 5)
                : errorBody
            },
            error
          });

          throw error;
        }

        const durationMs = recordAttemptMetrics('success', response.status);

        await this.recordAudit({
          requestMethod: method,
          requestPath: url.pathname,
          statusCode: response.status,
          outcome,
          durationMs,
          metadata: auditMetadata
        });

        return this.safeJson(response);
      } catch (error) {
        clearTimeout(timeout);
        lastError = error;
        if (error.name === 'AbortError') {
          this.logger.warn(
            { module: 'hubspot-client', attempt, path: url.pathname },
            'HubSpot request aborted due to timeout'
          );
        } else {
          this.logger.error({ module: 'hubspot-client', err: error, attempt }, 'HubSpot request failed');
        }

        const shouldRetry = attempt <= this.maxRetries;
        const statusCode =
          error?.status ?? error?.statusCode ?? (error.name === 'AbortError' ? 'timeout' : 'error');
        const durationMs = recordAttemptMetrics(shouldRetry ? 'retry' : 'failure', statusCode);
        const backoffMs = shouldRetry ? this.computeRetryDelayMs(attempt) : null;
        await this.recordAudit({
          requestMethod: method,
          requestPath: url.pathname,
          statusCode: error?.status ?? error?.statusCode ?? null,
          outcome: attempt <= this.maxRetries ? 'degraded' : 'failure',
          durationMs,
          metadata: {
            attempt,
            maxRetries: this.maxRetries,
            hasBody: Boolean(body),
            idempotencyKey: idempotencyKey ?? null,
            queryKeys: Array.from(url.searchParams.keys()),
            timeout: error.name === 'AbortError',
            backoffMs
          },
          error
        });

        if (!shouldRetry) {
          throw error;
        }

        await this.sleep(backoffMs);
      }
    }

    throw lastError ?? new Error('HubSpot request failed without response');
  }

  computeRetryDelayMs(attempt, { retryAfterMs } = {}) {
    const safeAttempt = Math.max(1, Number(attempt) || 1);
    const exponent = Math.min(safeAttempt - 1, 6);
    const exponential = Math.min(this.retryBaseDelayMs * 2 ** exponent, this.retryMaxDelayMs);
    const candidate = Number.isFinite(retryAfterMs) && retryAfterMs > 0
      ? Math.min(retryAfterMs, this.retryMaxDelayMs)
      : exponential;
    const jitterFactor = 0.75 + this.random() * 0.5;
    const jittered = candidate * jitterFactor;
    return Math.max(100, Math.round(jittered));
  }

  ensureContactIdempotency(contact) {
    if (!contact || typeof contact !== 'object') {
      return {
        id: null,
        email: null,
        idProperty: 'email',
        properties: {},
        idempotencyKey: crypto.randomUUID()
      };
    }

    if (contact.idempotencyKey) {
      return contact;
    }

    const payload = {
      id: contact.id ?? null,
      email: contact.email ?? null,
      idProperty: contact.idProperty ?? 'email',
      properties: contact.properties ?? {}
    };

    const digest = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
    return { ...contact, idempotencyKey: digest };
  }

  async safeJson(response) {
    const text = await response.text();
    if (!text) {
      return {};
    }
    try {
      return JSON.parse(text);
    } catch (_error) {
      return { raw: text };
    }
  }

  async upsertContacts(contacts = []) {
    if (!Array.isArray(contacts) || contacts.length === 0) {
      return { succeeded: 0, failed: 0, results: [] };
    }

    let succeeded = 0;
    let failed = 0;
    const results = [];

    for (let index = 0; index < contacts.length; index += HUBSPOT_BATCH_LIMIT) {
      const batch = contacts.slice(index, index + HUBSPOT_BATCH_LIMIT);
      const normalisedBatch = batch.map((contact) => this.ensureContactIdempotency(contact));
      const body = {
        inputs: normalisedBatch.map((contact) => ({
          idProperty: contact.idProperty ?? 'email',
          id: contact.id ?? contact.email,
          properties: contact.properties ?? {}
        }))
      };

      try {
        const response = await this.request('crm/v3/objects/contacts/batch/upsert', {
          method: 'POST',
          body,
          idempotencyKey: normalisedBatch[0]?.idempotencyKey
        });

        const processed = Array.isArray(response?.results) ? response.results : [];
        processed.forEach((item, resultIndex) => {
          const source = normalisedBatch[resultIndex];
          const status = item.status ?? 'succeeded';
          if (status === 'FAILED') {
            failed += 1;
          } else {
            succeeded += 1;
          }
          results.push({
            source,
            hubspotId: item.id ?? null,
            status,
            message: item.reason ?? null
          });
        });
      } catch (error) {
        failed += batch.length;
        results.push(
          ...normalisedBatch.map((source) => ({
            source,
            status: 'FAILED',
            message: error.message,
            error
          }))
        );
      }
    }

    return { succeeded, failed, results };
  }

  async searchContacts({ updatedSince, properties = ['email', 'firstname', 'lastname'], limit = 100, after } = {}) {
    const filters = [];
    if (updatedSince) {
      filters.push({
        propertyName: 'hs_lastmodifieddate',
        operator: 'GTE',
        value: new Date(updatedSince).getTime()
      });
    }

    const body = {
      filterGroups: filters.length ? [{ filters }] : [],
      properties,
      limit,
      after
    };

    const response = await this.request('crm/v3/objects/contacts/search', {
      method: 'POST',
      body
    });

    return {
      results: Array.isArray(response.results) ? response.results : [],
      paging: response.paging ?? null
    };
  }
}
