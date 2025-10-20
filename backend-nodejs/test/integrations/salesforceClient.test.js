import { describe, it, expect, vi, afterEach } from 'vitest';

import SalesforceClient from '../../src/integrations/SalesforceClient.js';

function createResponse({ status = 200, body, jsonBody, ok } = {}) {
  const payload = body ?? (jsonBody ? JSON.stringify(jsonBody) : '');
  return {
    ok: typeof ok === 'boolean' ? ok : status >= 200 && status < 300,
    status,
    headers: new Map(),
    text: async () => payload,
    json: async () => {
      if (jsonBody) {
        return jsonBody;
      }
      return payload ? JSON.parse(payload) : {};
    }
  };
}

function createClient({ fetchImpl, auditLogger, logger } = {}) {
  return new SalesforceClient({
    clientId: 'id',
    clientSecret: 'secret',
    username: 'user',
    password: 'pass',
    fetchImpl,
    auditLogger,
    logger
  });
}

describe('SalesforceClient', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reuses cached tokens until the expiry window is reached', async () => {
    const now = Date.now();
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        createResponse({
          jsonBody: {
            access_token: 'token-1',
            instance_url: 'https://example.salesforce.com',
            issued_at: `${now}`,
            expires_in: 3600
          }
        })
      )
      .mockResolvedValueOnce(createResponse({ jsonBody: { records: [] } }))
      .mockResolvedValueOnce(createResponse({ jsonBody: { records: [] } }));

    const client = createClient({ fetchImpl, auditLogger: vi.fn().mockResolvedValue(null) });

    await client.request('query', { query: { q: 'SELECT Id FROM Lead' } });
    await client.request('query', { query: { q: 'SELECT Id FROM Lead' } });

    expect(fetchImpl).toHaveBeenCalledTimes(3);
    const loginCalls = fetchImpl.mock.calls.filter(([url]) => `${url}`.includes('/oauth2/token'));
    expect(loginCalls).toHaveLength(1);
  });

  it('forces token refresh and retries once when a request returns 401', async () => {
    const now = Date.now();
    const auditLogger = vi.fn().mockResolvedValue();
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        createResponse({
          jsonBody: {
            access_token: 'token-1',
            instance_url: 'https://example.salesforce.com',
            issued_at: `${now}`,
            expires_in: 3600
          }
        })
      )
      .mockResolvedValueOnce(createResponse({ status: 401, body: 'unauthorised' }))
      .mockResolvedValueOnce(
        createResponse({
          jsonBody: {
            access_token: 'token-2',
            instance_url: 'https://example.salesforce.com',
            issued_at: `${now + 1000}`,
            expires_in: 3600
          }
        })
      )
      .mockResolvedValueOnce(createResponse({ jsonBody: { success: true } }));

    const client = createClient({
      fetchImpl,
      auditLogger,
      logger: { warn: vi.fn(), error: vi.fn() }
    });

    const response = await client.request('sobjects/Lead', { method: 'GET' });

    expect(response).toEqual({ success: true });
    expect(fetchImpl).toHaveBeenCalledTimes(4);

    const authCalls = fetchImpl.mock.calls.filter(([url]) => `${url}`.includes('/oauth2/token'));
    expect(authCalls).toHaveLength(2);

    const retryCall = fetchImpl.mock.calls[3];
    expect(retryCall[1].headers.Authorization).toBe('Bearer token-2');

    expect(auditLogger).toHaveBeenCalledWith(
      expect.objectContaining({
        requestMethod: 'GET',
        outcome: 'degraded',
        statusCode: 401
      })
    );
  });

  it('coalesces concurrent authentication requests', async () => {
    const now = Date.now();
    let resolveAuth;
    const authResponse = new Promise((resolve) => {
      resolveAuth = () =>
        resolve(
          createResponse({
            jsonBody: {
              access_token: 'token-shared',
              instance_url: 'https://example.salesforce.com',
              issued_at: `${now}`,
              expires_in: 3600
            }
          })
        );
    });

    const fetchImpl = vi
      .fn()
      .mockReturnValueOnce(authResponse)
      .mockResolvedValue(createResponse({ jsonBody: { records: [] } }));

    const client = createClient({ fetchImpl });

    const pending = Promise.all([client.authenticate(), client.authenticate()]);
    resolveAuth();
    const [first, second] = await pending;

    expect(first).toEqual(second);
    expect(first.accessToken).toBe('token-shared');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('clears cached credentials when authentication fails', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      createResponse({ status: 500, body: JSON.stringify({ error: 'invalid_client' }) })
    );

    const client = createClient({ fetchImpl });

    await expect(client.authenticate()).rejects.toThrow('Salesforce authentication failed');
    expect(client.accessToken).toBeNull();
    expect(client.instanceUrl).toBeNull();
    expect(client.tokenExpiresAt).toBeNull();
  });

  it('aggregates results when upserting batches of leads', async () => {
    const client = createClient();
    const error = Object.assign(new Error('invalid lead'), { code: 'INVALID_FIELD' });
    client.request = vi
      .fn()
      .mockResolvedValueOnce({ id: 'sf1' })
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce({ id: 'sf3' });

    const leads = [
      { externalId: 'lead-1', payload: { Email: 'lead1@example.com' } },
      { externalId: 'lead-2', payload: { Email: 'lead2@example.com' } },
      { externalId: 'lead-3', payload: { Email: 'lead3@example.com' } }
    ];

    const result = await client.upsertLeads(leads);

    expect(client.request).toHaveBeenCalledTimes(3);
    expect(result.succeeded).toBe(2);
    expect(result.failed).toBe(1);
    expect(result.results).toHaveLength(3);
    expect(result.results.filter((entry) => entry.status === 'failed')).toHaveLength(1);
  });

  it('builds SOQL queries that filter by updated timestamp', async () => {
    const updatedSince = '2023-01-01T00:00:00.000Z';
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        createResponse({
          jsonBody: {
            access_token: 'token-1',
            instance_url: 'https://example.salesforce.com',
            issued_at: `${Date.now()}`,
            expires_in: 3600
          }
        })
      )
      .mockResolvedValueOnce(
        createResponse({ jsonBody: { records: [{ Id: '123', Email: 'lead@example.com' }] } })
      );

    const client = createClient({ fetchImpl, auditLogger: vi.fn().mockResolvedValue() });
    const records = await client.queryLeadsUpdatedSince(updatedSince);

    expect(records).toEqual([{ Id: '123', Email: 'lead@example.com' }]);
    const [, requestArgs] = fetchImpl.mock.calls[1];
    const requestUrl = fetchImpl.mock.calls[1][0];
    const soql = decodeURIComponent(requestUrl.searchParams.get('q'));
    expect(soql).toContain('FROM Lead');
    expect(soql).toContain(`LastModifiedDate >= ${updatedSince}`);
    expect(requestArgs.method).toBe('GET');
  });
});
