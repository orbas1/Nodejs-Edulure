import { configureSdk } from '@edulure/api-sdk';

import { API_BASE_URL } from './httpClient.js';

let lastConfiguration = {
  baseUrl: null,
  token: null,
  version: null
};

function resolveSdkBaseUrl() {
  const base = (API_BASE_URL ?? '').replace(/\/$/, '');
  if (!base) {
    throw new Error('VITE_API_URL or VITE_API_BASE_URL must be defined to configure the API SDK.');
  }
  if (base.endsWith('/v1')) {
    return base;
  }
  return `${base}/v1`;
}

function resolveClientVersion() {
  return import.meta.env.VITE_APP_VERSION ?? '1.50.0';
}

export function prepareApiSdk({ token } = {}) {
  const baseUrl = resolveSdkBaseUrl();
  const version = resolveClientVersion();
  const normalisedToken = token ?? null;

  if (
    lastConfiguration.baseUrl === baseUrl &&
    lastConfiguration.token === normalisedToken &&
    lastConfiguration.version === version
  ) {
    return;
  }

  configureSdk({
    baseUrl,
    version,
    getAccessToken: normalisedToken
      ? () => normalisedToken
      : undefined,
    defaultHeaders: {
      'X-Client-App': 'edulure-web',
      'X-Client-Version': version
    },
    withCredentials: true
  });

  lastConfiguration = {
    baseUrl,
    token: normalisedToken,
    version
  };
}
