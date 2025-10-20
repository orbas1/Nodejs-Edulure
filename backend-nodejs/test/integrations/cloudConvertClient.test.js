import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import CloudConvertClient from '../../src/integrations/CloudConvertClient.js';

const createResponse = ({ status = 200, body = '', headers = {} } = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  text: vi.fn().mockResolvedValue(body),
  headers: {
    get: (key) => headers[key.toLowerCase()] ?? headers[key] ?? null
  }
});

describe('CloudConvertClient', () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('signs requests with bearer token and parses JSON responses', async () => {
    globalThis.fetch.mockResolvedValue(
      createResponse({ status: 200, body: JSON.stringify({ data: { id: 'job-1' } }) })
    );

    const client = new CloudConvertClient({ apiKey: 'api-key-123', retry: { maxAttempts: 0 } });
    const response = await client.request({ method: 'POST', path: 'jobs', body: { foo: 'bar' } });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      new URL('jobs', 'https://api.cloudconvert.com/v2/'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer api-key-123' })
      })
    );
    expect(response).toEqual({ data: { id: 'job-1' } });
  });

  it('retries transient failures when creating jobs', async () => {
    globalThis.fetch
      .mockResolvedValueOnce(createResponse({ status: 500, body: JSON.stringify({ message: 'error' }) }))
      .mockResolvedValueOnce(createResponse({ status: 200, body: JSON.stringify({ data: { id: 'job-2' } }) }));

    const client = new CloudConvertClient({
      apiKey: 'retry-key',
      retry: { maxAttempts: 1, baseDelayMs: 0 }
    });

    const payload = await client.createJob({ tasks: [] });

    expect(payload).toEqual({ id: 'job-2' });
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });

  it('polls job status until completion', async () => {
    vi.useFakeTimers();
    const client = new CloudConvertClient({
      apiKey: 'poll',
      retry: { maxAttempts: 0 },
      poll: { intervalMs: 20, maxWaitMs: 200 }
    });
    const requestSpy = vi.spyOn(client, 'request');
    requestSpy
      .mockResolvedValueOnce({ data: { id: 'job-99', attributes: { status: 'processing' } } })
      .mockResolvedValueOnce({ data: { id: 'job-99', attributes: { status: 'finished' } } });

    const waitPromise = client.waitForJob('job-99');
    await vi.advanceTimersByTimeAsync(20);
    const result = await waitPromise;

    expect(result).toEqual({ data: { id: 'job-99', attributes: { status: 'finished' } } });
    expect(requestSpy).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it('extracts exported files from completed jobs', () => {
    const client = new CloudConvertClient({ apiKey: 'files' });
    const files = client.extractExportedFiles({
      data: {
        tasks: [
          {
            name: 'export-1',
            operation: 'export/url',
            result: { files: [{ url: 'https://file-1', filename: 'file-1.pdf' }] }
          },
          {
            name: 'convert',
            operation: 'convert',
            result: {}
          },
          {
            name: 'export-2',
            attributes: {
              operation: 'export/url',
              result: { files: [{ url: 'https://file-2', filename: 'file-2.pdf' }] }
            }
          }
        ]
      }
    });

    expect(files).toEqual([
      { url: 'https://file-1', filename: 'file-1.pdf' },
      { url: 'https://file-2', filename: 'file-2.pdf' }
    ]);
  });

  it('creates jobs and waits for completion, returning exported files', async () => {
    const client = new CloudConvertClient({ apiKey: 'combo' });
    const createSpy = vi.spyOn(client, 'createJob').mockResolvedValue({ id: 'job-123' });
    const waitSpy = vi.spyOn(client, 'waitForJob').mockResolvedValue({
      data: {
        id: 'job-123',
        tasks: [
          {
            operation: 'export/url',
            result: { files: [{ url: 'https://download', filename: 'archive.zip' }] }
          }
        ]
      }
    });

    const result = await client.createJobAndWait({ tasks: [] });

    expect(createSpy).toHaveBeenCalledWith({ tasks: [] });
    expect(waitSpy).toHaveBeenCalledWith('job-123', {});
    expect(result.files).toEqual([{ url: 'https://download', filename: 'archive.zip' }]);
    expect(result.job).toEqual({
      data: {
        id: 'job-123',
        tasks: [
          {
            operation: 'export/url',
            result: { files: [{ url: 'https://download', filename: 'archive.zip' }] }
          }
        ]
      }
    });
  });
});
