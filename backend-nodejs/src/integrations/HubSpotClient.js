import { setTimeout as delay } from 'node:timers/promises';

const HUBSPOT_BATCH_LIMIT = 100;

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
  constructor({ accessToken, baseUrl, timeoutMs = 10000, maxRetries = 3, logger, fetchImpl, auditLogger } = {}) {
    if (!accessToken) {
      throw new Error('HubSpotClient requires a private app access token.');
    }

    this.accessToken = accessToken;
    this.baseUrl = normaliseBaseUrl(baseUrl);
    this.timeoutMs = timeoutMs;
    this.maxRetries = maxRetries;
    this.logger = logger ?? console;
    this.fetchImpl = fetchImpl ?? globalThis.fetch.bind(globalThis);
    this.auditLogger = typeof auditLogger === 'function' ? auditLogger : null;
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

      try {
        const response = await this.fetchImpl(url, {
          method,
          headers: finalHeaders,
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal
        });
        clearTimeout(timeout);

        const durationMs = Date.now() - attemptStartedAt;
        const metadata = {
          attempt,
          maxRetries: this.maxRetries,
          hasBody: Boolean(body),
          idempotencyKey: idempotencyKey ?? null,
          queryKeys: Array.from(url.searchParams.keys())
        };

        if (!response.ok) {
          const errorBody = await this.safeJson(response);
          const error = new Error(`HubSpot request failed with status ${response.status}`);
          error.details = errorBody;

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

        let outcome = 'success';
        if (response.status === 429) {
          outcome = 'degraded';
          metadata.retryAfterSeconds = Number(response.headers.get('Retry-After') ?? 0);
        } else if (response.status >= 500) {
          outcome = 'failure';
        }

        await this.recordAudit({
          requestMethod: method,
          requestPath: url.pathname,
          statusCode: response.status,
          outcome,
          durationMs,
          metadata
        });

        if (response.status === 429 || response.status >= 500) {
          const retryAfter = Number(response.headers.get('Retry-After') ?? 0) * 1000;
          const backoff = Math.min(retryAfter || attempt * 500, 5000);
          lastError = new Error(`HubSpot request failed with status ${response.status}`);
          this.logger.warn(
            {
              module: 'hubspot-client',
              status: response.status,
              attempt,
              path: url.pathname,
              backoff
            },
            'HubSpot responded with retryable error'
          );

          if (attempt <= this.maxRetries) {
            await delay(backoff);
            continue;
          }
        }

        if (!response.ok) {
          // already handled above
          throw lastError ?? new Error(`HubSpot request failed with status ${response.status}`);
        }

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

        const durationMs = Date.now() - attemptStartedAt;
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
            timeout: error.name === 'AbortError'
          },
          error
        });

        if (attempt > this.maxRetries) {
          throw error;
        }

        await delay(Math.min(attempt * 500, 3000));
      }
    }

    throw lastError ?? new Error('HubSpot request failed without response');
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
      const body = {
        inputs: batch.map((contact) => ({
          idProperty: contact.idProperty ?? 'email',
          id: contact.id ?? contact.email,
          properties: contact.properties ?? {}
        }))
      };

      try {
        const response = await this.request('crm/v3/objects/contacts/batch/upsert', {
          method: 'POST',
          body,
          idempotencyKey: batch[0]?.idempotencyKey
        });

        const processed = Array.isArray(response?.results) ? response.results : [];
        processed.forEach((item, resultIndex) => {
          const source = batch[resultIndex];
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
          ...batch.map((source) => ({
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
