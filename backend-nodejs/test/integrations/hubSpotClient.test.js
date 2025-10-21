import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import HubSpotClient from '../../src/integrations/HubSpotClient.js';

const createResponse = ({ status = 200, body = '{}', headers = {} } = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  text: vi.fn().mockResolvedValue(body),
  headers: {
    get: (key) => headers[key] ?? headers[key.toLowerCase()] ?? null
  }
});

describe('HubSpotClient', () => {
  let auditLogger;
  let logger;

  beforeEach(() => {
    vi.useFakeTimers();
    auditLogger = vi.fn().mockResolvedValue();
    logger = { warn: vi.fn(), error: vi.fn(), info: vi.fn(), child: vi.fn().mockReturnThis() };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('sends authorised requests with idempotency header', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(createResponse({ status: 200, body: JSON.stringify({ results: [] }) }));
    const client = new HubSpotClient({
      accessToken: 'secret-token',
      fetchImpl,
      auditLogger,
      logger,
      timeoutMs: 1000,
      maxRetries: 0,
      random: () => 0.5
    });

    const response = await client.request('crm/v3/objects/contacts/batch/upsert', {
      method: 'POST',
      body: { inputs: [] },
      idempotencyKey: 'abc-123'
    });

    const [url, options] = fetchImpl.mock.calls[0];
    expect(url).toBeInstanceOf(URL);
    expect(url.pathname).toBe('/crm/v3/objects/contacts/batch/upsert');
    expect(options.headers.Authorization).toBe('Bearer secret-token');
    expect(options.headers['Idempotency-Key']).toBe('abc-123');
    expect(JSON.parse(options.body)).toEqual({ inputs: [] });
    expect(response).toEqual({ results: [] });
    expect(auditLogger).toHaveBeenCalledWith(
      expect.objectContaining({
        requestMethod: 'POST',
        requestPath: '/crm/v3/objects/contacts/batch/upsert',
        outcome: 'success'
      })
    );
  });

  it('retries transient failures and records degraded outcome', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        createResponse({ status: 429, body: JSON.stringify({ message: 'retry later' }), headers: { 'Retry-After': '1' } })
      )
      .mockResolvedValueOnce(createResponse({ status: 200, body: JSON.stringify({ results: [{ id: '1' }] }) }));

    const client = new HubSpotClient({
      accessToken: 'secret-token',
      fetchImpl,
      auditLogger,
      logger,
      maxRetries: 1,
      timeoutMs: 1000,
      random: () => 0.5
    });

    const requestPromise = client.request('crm/v3/objects/contacts/search', {
      method: 'POST',
      body: { filterGroups: [] }
    });

    await vi.advanceTimersByTimeAsync(1000);
    const payload = await requestPromise;

    expect(payload).toEqual({ results: [{ id: '1' }] });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    const calls = auditLogger.mock.calls.map(([entry]) => entry);
    expect(calls.some((entry) => entry?.outcome === 'degraded')).toBe(true);
    expect(calls.some((entry) => entry?.outcome === 'success' && entry.statusCode === 200)).toBe(
      true
    );
    const degradedEntry = calls.find((entry) => entry?.outcome === 'degraded');
    expect(degradedEntry?.metadata?.retryAfterMs).toBe(1000);
    expect(degradedEntry?.metadata?.backoffMs).toBe(1000);
  });

  it('summarises batch upsert outcomes including failures', async () => {
    const client = new HubSpotClient({
      accessToken: 'token',
      fetchImpl: vi.fn(),
      auditLogger,
      logger,
      maxRetries: 0,
      random: () => 0.5
    });

    const contacts = [
      { id: '1', properties: { email: 'one@example.com' }, idempotencyKey: 'batch-1' },
      { id: '2', properties: { email: 'two@example.com' } },
      { id: '3', properties: { email: 'three@example.com' } }
    ];

    client.request = vi.fn().mockResolvedValueOnce({
      results: [
        { id: '101', status: 'CREATED' },
        { id: '102', status: 'FAILED', reason: 'duplicate email' },
        { id: '103', status: 'UPDATED' }
      ]
    });

    const summary = await client.upsertContacts(contacts);

    expect(client.request).toHaveBeenCalledTimes(1);
    expect(client.request).toHaveBeenCalledWith(
      'crm/v3/objects/contacts/batch/upsert',
      expect.objectContaining({
        method: 'POST',
        idempotencyKey: 'batch-1',
        body: expect.objectContaining({ inputs: expect.any(Array) })
      })
    );
    expect(summary).toMatchObject({ succeeded: 2, failed: 1 });
    expect(summary.results).toHaveLength(3);
    expect(summary.results.find((entry) => entry.status === 'FAILED').message).toBe(
      'duplicate email'
    );
  });

  it('marks entire batch as failed when hubspot request rejects', async () => {
    const client = new HubSpotClient({
      accessToken: 'token',
      fetchImpl: vi.fn(),
      auditLogger,
      logger,
      maxRetries: 0,
      random: () => 0.5
    });

    const contacts = [
      { id: '1', properties: { email: 'fail@example.com' } },
      { id: '2', properties: { email: 'fail2@example.com' } }
    ];

    const error = new Error('api unavailable');
    client.request = vi.fn().mockRejectedValueOnce(error);

    const summary = await client.upsertContacts(contacts);

    expect(summary).toMatchObject({ succeeded: 0, failed: 2 });
    expect(summary.results).toHaveLength(2);
    expect(summary.results.every((entry) => entry.status === 'FAILED')).toBe(true);
    expect(summary.results[0].error).toBe(error);
  });

  it('builds filter payload when searching contacts with updatedSince', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(createResponse({ status: 200, body: JSON.stringify({ results: [] }) }));
    const client = new HubSpotClient({
      accessToken: 'token',
      fetchImpl,
      auditLogger,
      logger,
      maxRetries: 0,
      random: () => 0.5
    });

    const updatedSince = '2024-03-01T00:00:00.000Z';
    const response = await client.searchContacts({ updatedSince, limit: 5 });

    expect(response).toEqual({ results: [], paging: null });
    const [, options] = fetchImpl.mock.calls[0];
    const parsed = JSON.parse(options.body);
    expect(parsed.filterGroups[0].filters[0]).toMatchObject({ operator: 'GTE' });
    expect(parsed.filterGroups[0].filters[0].value).toBe(new Date(updatedSince).getTime());
    expect(parsed.limit).toBe(5);
  });
});
