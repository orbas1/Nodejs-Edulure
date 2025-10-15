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
    fetchImpl
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

    this.accessToken = null;
    this.instanceUrl = null;
    this.tokenExpiresAt = null;
  }

  async authenticate(force = false) {
    if (!force && this.accessToken && this.tokenExpiresAt && Date.now() < this.tokenExpiresAt - 60000) {
      return { accessToken: this.accessToken, instanceUrl: this.instanceUrl };
    }

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

      try {
        const response = await this.fetchImpl(url, {
          method,
          headers: finalHeaders,
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal
        });
        clearTimeout(timeout);

        if (response.status === 401 && retryOnUnauthorized) {
          this.logger.warn({ module: 'salesforce-client', attempt }, 'Salesforce token expired – refreshing');
          await this.authenticate(true);
          return this.request(path, { method, body, query, headers, retryOnUnauthorized: false });
        }

        if (response.status === 429 || response.status >= 500) {
          const backoff = Math.min(attempt * 600, 5000);
          lastError = new Error(`Salesforce request failed with status ${response.status}`);
          if (attempt <= this.maxRetries) {
            await delay(backoff);
            continue;
          }
        }

        if (!response.ok) {
          const errorBody = await response.text();
          const error = new Error(`Salesforce request failed with status ${response.status}`);
          error.details = errorBody;
          throw error;
        }

        return this.safeJson(response);
      } catch (error) {
        clearTimeout(timeout);
        lastError = error;
        if (error.name === 'AbortError') {
          this.logger.warn({ module: 'salesforce-client', attempt, path }, 'Salesforce request timed out');
        } else {
          this.logger.error({ module: 'salesforce-client', err: error, attempt }, 'Salesforce request failed');
        }

        if (attempt > this.maxRetries) {
          throw error;
        }

        await delay(Math.min(attempt * 600, 4000));
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
