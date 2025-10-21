import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const configureSdkMock = vi.hoisted(() => vi.fn());
const httpClientExports = vi.hoisted(() => ({ API_BASE_URL: 'https://api.example.com/api' }));

vi.mock('@edulure/api-sdk', () => ({
  configureSdk: configureSdkMock
}));

vi.mock('../../src/api/httpClient.js', () => httpClientExports);

async function loadSdkClient() {
  vi.resetModules();
  configureSdkMock.mockReset();
  return import('../../src/api/sdkClient.js');
}

beforeEach(() => {
  httpClientExports.API_BASE_URL = 'https://api.example.com/api';
  vi.unstubAllEnvs();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('prepareApiSdk', () => {
  it('configures the SDK with resolved base URL and version', async () => {
    vi.stubEnv('VITE_APP_VERSION', '2.1.0');
    const { prepareApiSdk } = await loadSdkClient();

    prepareApiSdk({ token: 'token-123' });

    expect(configureSdkMock).toHaveBeenCalledTimes(1);
    const config = configureSdkMock.mock.calls[0][0];
    expect(config.baseUrl).toBe('https://api.example.com/api/v1');
    expect(config.version).toBe('2.1.0');
    expect(config.defaultHeaders['X-Client-App']).toBe('edulure-web');
    expect(config.getAccessToken()).toBe('token-123');
  });

  it('skips reconfiguration when parameters are unchanged', async () => {
    const { prepareApiSdk } = await loadSdkClient();

    prepareApiSdk({ token: 'alpha' });
    prepareApiSdk({ token: 'alpha' });

    expect(configureSdkMock).toHaveBeenCalledTimes(1);
  });

  it('reconfigures when the access token changes', async () => {
    const { prepareApiSdk } = await loadSdkClient();

    prepareApiSdk({ token: 'first' });
    prepareApiSdk({ token: 'second' });

    expect(configureSdkMock).toHaveBeenCalledTimes(2);
    const secondInvocation = configureSdkMock.mock.calls[1][0];
    expect(secondInvocation.getAccessToken()).toBe('second');
  });
});
