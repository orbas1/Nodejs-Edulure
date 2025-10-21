import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const requestMock = vi.fn();
const interceptorUseMock = vi.fn();
const axiosInstance = {
  request: requestMock,
  interceptors: {
    response: {
      use: interceptorUseMock
    }
  }
};

const axiosCreateMock = vi.fn(() => axiosInstance);

vi.mock('axios', () => ({
  default: {
    create: axiosCreateMock
  }
}));

async function loadHttpClient() {
  vi.resetModules();
  requestMock.mockReset();
  interceptorUseMock.mockReset();
  axiosCreateMock.mockClear();
  vi.unstubAllEnvs();
  vi.stubEnv('VITE_API_URL', 'https://api.example.com');
  requestMock.mockResolvedValue({ data: { ok: true } });
  return import('../../src/api/httpClient.js');
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('httpClient request utilities', () => {
  it('supports providing request bodies via the data alias', async () => {
    const { httpClient } = await loadHttpClient();

    await httpClient.delete('/resources/123', {
      data: { reason: 'no-longer-needed' },
      cache: false
    });

    expect(requestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'DELETE',
        url: '/resources/123',
        data: { reason: 'no-longer-needed' }
      })
    );
  });

  it('applies bearer tokens to outgoing requests', async () => {
    const { httpClient } = await loadHttpClient();

    await httpClient.get('/me', { token: 'secure-token', cache: false });

    const config = requestMock.mock.calls.at(-1)[0];
    expect(config.headers.Authorization).toBe('Bearer secure-token');
  });

  it('passes through download progress and response type hints', async () => {
    const { httpClient } = await loadHttpClient();
    const downloadSpy = vi.fn();

    await httpClient.get('/reports/export', {
      responseType: 'blob',
      onDownloadProgress: downloadSpy,
      cache: false
    });

    expect(requestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        responseType: 'blob',
        onDownloadProgress: downloadSpy
      })
    );
  });

  it('throws when no request path is provided', async () => {
    const { httpClient } = await loadHttpClient();

    await expect(httpClient.get('')).rejects.toThrow('request path');
  });

  it('uses a configured token resolver when explicit tokens are missing', async () => {
    const { httpClient, setAuthTokenResolver, clearAuthTokenResolver } = await loadHttpClient();
    const resolver = vi.fn().mockResolvedValue('resolved-token');
    setAuthTokenResolver(resolver);

    await httpClient.get('/secure', { cache: false });

    expect(resolver).toHaveBeenCalled();
    expect(requestMock.mock.calls.at(-1)[0].headers.Authorization).toBe('Bearer resolved-token');

    clearAuthTokenResolver();
  });

  it('removes explicit content-type headers when sending FormData bodies', async () => {
    global.FormData = class FormDataMock {};
    const { httpClient } = await loadHttpClient();
    const formData = new FormData();

    await httpClient.post('/upload', formData, {
      headers: { 'Content-Type': 'application/json' },
      cache: false
    });

    expect(requestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/upload',
        data: formData
      })
    );
    expect(requestMock.mock.calls.at(-1)[0].headers['Content-Type']).toBeUndefined();

    delete global.FormData;
  });

  it('invalidates merged tag sets after mutating requests', async () => {
    const { httpClient, responseCache } = await loadHttpClient();
    const invalidateSpy = vi.spyOn(responseCache, 'invalidateTags');

    requestMock.mockResolvedValueOnce({ data: { saved: true } });

    await httpClient.post('/resources', { name: 'demo' }, {
      cache: { invalidateTags: ['tag-a'] },
      invalidateTags: ['tag-b']
    });

    expect(invalidateSpy).toHaveBeenCalledWith(['tag-a', 'tag-b']);

    invalidateSpy.mockRestore();
  });
});
