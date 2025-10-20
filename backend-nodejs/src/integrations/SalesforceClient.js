import { setTimeout as delay } from 'node:timers/promises';

const SALESFORCE_API_VERSION = 'v58.0';
const SALESFORCE_BATCH_LIMIT = 25;

function normaliseLoginUrl(url) {
  if (!url) {
    return 'https://login.salesforce.com';
  }
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

export default class SalesforceClient {
  constructor({
    clientId,
    clientSecret,
    username,
    password,
    securityToken,
    loginUrl,
    timeoutMs = 10000,
    maxRetries = 3,
    externalIdField = 'Edulure_Project_Id__c',
    logger,
    fetchImpl,
    auditLogger,
    refreshSkewMs = 60000,
    sleep
  } = {}) {
    if (!clientId || !clientSecret || !username || !password) {
      throw new Error('SalesforceClient requires clientId, clientSecret, username, and password.');
    }

    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.username = username;
    this.password = password;
    this.securityToken = securityToken ?? '';
    this.loginUrl = normaliseLoginUrl(loginUrl);
    this.timeoutMs = timeoutMs;
    this.maxRetries = maxRetries;
    this.externalIdField = externalIdField;
    this.logger = logger ?? console;
    this.fetchImpl = fetchImpl ?? globalThis.fetch.bind(globalThis);
    this.auditLogger = typeof auditLogger === 'function' ? auditLogger : null;
    this.refreshSkewMs = Number.isFinite(refreshSkewMs) && refreshSkewMs >= 0 ? refreshSkewMs : 60000;
    this.sleep = typeof sleep === 'function' ? sleep : delay;

    this.accessToken = null;
    this.instanceUrl = null;
    this.tokenExpiresAt = null;
    this.authPromise = null;
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
        { module: 'salesforce-client', err: auditError },
        'Failed to record Salesforce integration audit entry'
      );
    }
  }

  async authenticate(force = false) {
    const now = Date.now();
    const hasValidToken =
      this.accessToken && this.tokenExpiresAt && now < this.tokenExpiresAt - this.refreshSkewMs;

    if (!force && hasValidToken) {
      return { accessToken: this.accessToken, instanceUrl: this.instanceUrl };
    }

    if (!force && this.authPromise) {
      return this.authPromise;
    }

    if (force && this.authPromise) {
      try {
        await this.authPromise.catch(() => {});
      } finally {
        this.authPromise = null;
      }
    }

    const performAuthentication = async () => {
      const body = new URLSearchParams({
        grant_type: 'password',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        username: this.username,
        password: `${this.password}${this.securityToken}`
      });

      const response = await this.fetchImpl(`${this.loginUrl}/services/oauth2/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body
      });

      if (!response.ok) {
        const errorBody = await response.text();
        const error = new Error(`Salesforce authentication failed with status ${response.status}`);
        error.details = errorBody;
        throw error;
      }

      const payload = await response.json();
      this.accessToken = payload.access_token;
      this.instanceUrl = payload.instance_url;
      const issuedAt = Number(payload.issued_at ?? Date.now());
      this.tokenExpiresAt = issuedAt + Number(payload.expires_in ?? 3600) * 1000;
      return { accessToken: this.accessToken, instanceUrl: this.instanceUrl };
    };

    this.authPromise = performAuthentication()
      .then((result) => {
        return result;
      })
      .catch((error) => {
        this.accessToken = null;
        this.instanceUrl = null;
        this.tokenExpiresAt = null;
        throw error;
      })
      .finally(() => {
        this.authPromise = null;
      });

    return this.authPromise;
  }

  async request(path, { method = 'GET', body, query, headers = {}, retryOnUnauthorized = true } = {}) {
    await this.authenticate();

    const url = new URL(`${this.instanceUrl}/services/data/${SALESFORCE_API_VERSION}/${path.replace(/^\/+/, '')}`);
    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, value);
        }
      });
    }

    const finalHeaders = {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      ...headers
    };

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
          queryKeys: Array.from(url.searchParams.keys())
        };

        if (response.status === 401 && retryOnUnauthorized) {
          this.logger.warn({ module: 'salesforce-client', attempt }, 'Salesforce token expired – refreshing');
          await this.recordAudit({
            requestMethod: method,
            requestPath: url.pathname,
            statusCode: response.status,
            outcome: 'degraded',
            durationMs,
            metadata: { ...metadata, reason: 'unauthorised', willRetry: true }
          });
          await this.authenticate(true);
          return this.request(path, { method, body, query, headers, retryOnUnauthorized: false });
        }

        if (response.status === 429 || response.status >= 500) {
          const retryAfterSeconds = Number(response.headers?.get?.('Retry-After') ?? 0);
          const retryAfterMs = Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0 ? retryAfterSeconds * 1000 : null;
          const backoff = retryAfterMs ?? Math.min(attempt * 600, 5000);
          lastError = new Error(`Salesforce request failed with status ${response.status}`);
          if (retryAfterMs) {
            lastError.retryAfterMs = retryAfterMs;
          }
          await this.recordAudit({
            requestMethod: method,
            requestPath: url.pathname,
            statusCode: response.status,
            outcome: response.status === 429 ? 'degraded' : 'failure',
            durationMs,
            metadata: { ...metadata, backoff, retryAfterMs }
          });
          if (attempt <= this.maxRetries) {
            await this.sleep(backoff);
            continue;
          }
        }

        if (!response.ok) {
          const errorBody = await response.text();
          const error = new Error(`Salesforce request failed with status ${response.status}`);
          error.details = errorBody;
          await this.recordAudit({
            requestMethod: method,
            requestPath: url.pathname,
            statusCode: response.status,
            outcome: 'failure',
            durationMs,
            metadata: { ...metadata, errorDetails: errorBody },
            error
          });
          throw error;
        }

        await this.recordAudit({
          requestMethod: method,
          requestPath: url.pathname,
          statusCode: response.status,
          outcome: 'success',
          durationMs,
          metadata
        });

        return this.safeJson(response);
      } catch (error) {
        clearTimeout(timeout);
        lastError = error;
        if (error.name === 'AbortError') {
          this.logger.warn({ module: 'salesforce-client', attempt, path }, 'Salesforce request timed out');
        } else {
          this.logger.error({ module: 'salesforce-client', err: error, attempt }, 'Salesforce request failed');
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
            queryKeys: Array.from(url.searchParams.keys()),
            timeout: error.name === 'AbortError'
          },
          error
        });

        if (attempt > this.maxRetries) {
          throw error;
        }

        await this.sleep(Math.min(attempt * 600, 4000));
      }
    }

    throw lastError ?? new Error('Salesforce request failed without response');
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

  async upsertLeads(leads = []) {
    if (!Array.isArray(leads) || leads.length === 0) {
      return { succeeded: 0, failed: 0, results: [] };
    }

    let succeeded = 0;
    let failed = 0;
    const results = [];

    for (let index = 0; index < leads.length; index += SALESFORCE_BATCH_LIMIT) {
      const batch = leads.slice(index, index + SALESFORCE_BATCH_LIMIT);

      await Promise.all(
        batch.map(async (lead) => {
          const externalId = encodeURIComponent(lead.externalId);
          try {
            const response = await this.request(`sobjects/Lead/${this.externalIdField}/${externalId}`, {
              method: 'PATCH',
              body: lead.payload,
              headers: { 'Sforce-Auto-Assign': 'FALSE' }
            });

            succeeded += 1;
            results.push({
              source: lead,
              payload: response,
              status: 'succeeded'
            });
          } catch (error) {
            failed += 1;
            results.push({
              source: lead,
              status: 'failed',
              message: error.message,
              error
            });
          }
        })
      );
    }

    return { succeeded, failed, results };
  }

  async queryLeadsUpdatedSince(updatedSince) {
    const fields = [
      'Id',
      this.externalIdField,
      'Email',
      'Status',
      'LastModifiedDate'
    ];
    const conditions = [`${this.externalIdField} != null`];
    if (updatedSince) {
      const iso = new Date(updatedSince).toISOString();
      conditions.push(`LastModifiedDate >= ${iso}`);
    }

    const soql = `SELECT ${fields.join(', ')} FROM Lead WHERE ${conditions.join(' AND ')} LIMIT 2000`;
    const response = await this.request('query', {
      query: { q: soql }
    });

    return Array.isArray(response.records) ? response.records : [];
  }
}
