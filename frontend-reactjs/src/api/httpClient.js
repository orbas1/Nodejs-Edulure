import axios from 'axios';

import { responseCache } from './cache.js';

function sanitizeBaseUrl(value) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.replace(/\/+$/, '');
}

function isLocalHostname(hostname) {
  if (!hostname) {
    return false;
  }

  const lowered = hostname.toLowerCase();
  return (
    lowered === 'localhost' ||
    lowered === '127.0.0.1' ||
    lowered === '0.0.0.0' ||
    lowered === '::1' ||
    lowered === '[::1]' ||
    lowered.endsWith('.localhost') ||
    lowered.endsWith('.local')
  );
}

function resolveConfiguredApiBaseUrl() {
  const explicit =
    import.meta.env.VITE_API_URL ??
    import.meta.env.VITE_API_BASE_URL ??
    import.meta.env.VITE_API_BASEURL ??
    null;

  return sanitizeBaseUrl(explicit);
}

function resolveDefaultApiBaseUrl() {
  const protocolHint = import.meta.env.VITE_API_PROTOCOL;
  const hostHint = import.meta.env.VITE_API_HOST;
  const portHint = import.meta.env.VITE_API_PORT;

  const hasWindow = typeof window !== 'undefined' && typeof window.location !== 'undefined';
  const fallbackProtocol = hasWindow ? window.location.protocol : 'http:';
  const fallbackHost = hasWindow ? window.location.hostname : 'localhost';
  const protocol = (protocolHint ?? fallbackProtocol ?? 'http:').replace(/:?[\/]*$/, '');
  const host = hostHint ?? fallbackHost ?? 'localhost';
  const rawPort = portHint ?? (isLocalHostname(host) ? '4000' : '');

  const numericPort = Number(rawPort);
  const shouldIncludePort =
    rawPort &&
    (!Number.isFinite(numericPort) ||
      (protocol === 'http' && numericPort !== 80) ||
      (protocol === 'https' && numericPort !== 443) ||
      (protocol !== 'http' && protocol !== 'https'));

  const portSegment = shouldIncludePort ? `:${rawPort}` : '';

  return `${protocol}://${host}${portSegment}/api/v1`;
}

const API_BASE_URL = sanitizeBaseUrl(resolveConfiguredApiBaseUrl() ?? resolveDefaultApiBaseUrl());

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const enriched = new Error(error.response.data?.message ?? 'Request failed');
      enriched.status = error.response.status;
      enriched.details = error.response.data?.data ?? error.response.data?.errors;
      enriched.original = error;
      return Promise.reject(enriched);
    }
    if (error.request) {
      const enriched = new Error('No response received from server');
      enriched.original = error;
      return Promise.reject(enriched);
    }
    return Promise.reject(error);
  }
);

const normaliseHeaders = (headers = {}) => {
  const result = { ...headers };
  if (result['content-type']) {
    result['Content-Type'] = result['content-type'];
    delete result['content-type'];
  }
  return result;
};

const pickHeaders = (headers = {}, varyBy = []) => {
  if (!varyBy.length) {
    return undefined;
  }

  const normalised = {};
  varyBy.forEach((header) => {
    const name = header.toLowerCase();
    const match = Object.keys(headers).find((key) => key.toLowerCase() === name);
    if (match) {
      normalised[match] = headers[match];
    }
  });
  return Object.keys(normalised).length ? normalised : undefined;
};

const normaliseCacheOptions = (cache) => {
  if (cache === undefined) {
    return { enabled: true };
  }

  if (cache === false) {
    return { enabled: false };
  }

  if (cache === true) {
    return { enabled: true };
  }

  return { enabled: cache.enabled ?? true, ...cache };
};

async function request(
  path,
  { method = 'GET', headers, body, params, token, signal, onUploadProgress, cache, invalidateTags } = {}
) {
  const finalHeaders = normaliseHeaders(headers);
  if (token) {
    finalHeaders.Authorization = `Bearer ${token}`;
  }

  const methodUpper = method.toUpperCase();
  const cacheOptions = normaliseCacheOptions(cache);
  const useCache = methodUpper === 'GET' && cacheOptions.enabled;

  const varyByToken = cacheOptions.varyByToken ?? true;
  const varyByHeaders = cacheOptions.varyByHeaders ?? [];
  const cacheKey = useCache
    ? responseCache.createKey({
        method: methodUpper,
        path,
        params,
        token: varyByToken ? token : undefined,
        headers: pickHeaders(finalHeaders, varyByHeaders)
      })
    : null;

  if (useCache) {
    const cached = responseCache.get(cacheKey);
    if (cached !== undefined) {
      return cached;
    }
  }

  const config = {
    url: path,
    method: methodUpper,
    headers: finalHeaders,
    data: body,
    params,
    signal,
    onUploadProgress
  };

  const response = await apiClient.request(config);
  const data = response.data;

  if (useCache) {
    const ttl = typeof cacheOptions.ttl === 'number' ? cacheOptions.ttl : undefined;
    responseCache.set(cacheKey, data, { ttl, tags: cacheOptions.tags });
  }

  const tagsToInvalidate = cacheOptions.invalidateTags ?? invalidateTags;
  if (methodUpper !== 'GET' && tagsToInvalidate) {
    responseCache.invalidateTags(tagsToInvalidate);
  }

  return data;
}

function get(path, options = {}) {
  return request(path, { ...options, method: 'GET' });
}

function post(path, body, options = {}) {
  return request(path, { ...options, method: 'POST', body });
}

function put(path, body, options = {}) {
  return request(path, { ...options, method: 'PUT', body });
}

function patch(path, body, options = {}) {
  return request(path, { ...options, method: 'PATCH', body });
}

function del(path, options = {}) {
  return request(path, { ...options, method: 'DELETE' });
}

export const httpClient = { get, post, put, patch, delete: del, request };
export { API_BASE_URL, apiClient, request, responseCache };
