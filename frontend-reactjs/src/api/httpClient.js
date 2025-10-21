import axios from 'axios';

import { responseCache } from './cache.js';

const DEFAULT_TIMEOUT = 15_000;

let authTokenResolver = null;

function setAuthTokenResolver(resolver) {
  if (resolver !== null && resolver !== undefined && typeof resolver !== 'function') {
    throw new Error('authTokenResolver must be a function returning a token string');
  }

  authTokenResolver = resolver ?? null;
}

function clearAuthTokenResolver() {
  authTokenResolver = null;
}

async function resolveAuthToken(explicitToken) {
  if (explicitToken) {
    return explicitToken;
  }

  if (!authTokenResolver) {
    return undefined;
  }

  try {
    const resolved = await authTokenResolver();
    if (!resolved) {
      return undefined;
    }

    const token = typeof resolved === 'string' ? resolved.trim() : resolved;
    return token || undefined;
  } catch (error) {
    console.warn('Failed to resolve auth token', error);
    return undefined;
  }
}

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

const defaultParamsSerializer = (params = {}) => {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item !== undefined && item !== null) {
          search.append(key, item);
        }
      });
      return;
    }

    search.append(key, value);
  });

  return search.toString();
};

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: DEFAULT_TIMEOUT,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

function setDefaultHeaders(headers = {}) {
  Object.entries(headers).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '') {
      delete apiClient.defaults.headers.common[key];
      delete apiClient.defaults.headers[key];
      return;
    }

    apiClient.defaults.headers.common[key] = value;
  });
}

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

const toArray = (value) => {
  if (Array.isArray(value)) {
    return value;
  }
  if (!value && value !== 0) {
    return [];
  }
  return [value];
};

const normaliseTagList = (tags) => [...new Set(toArray(tags).filter(Boolean))];

const mergeTagLists = (...sources) => normaliseTagList(sources.flatMap((source) => toArray(source)));

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
    return { enabled: true, tags: [] };
  }

  if (cache === false) {
    return { enabled: false, tags: [] };
  }

  if (cache === true) {
    return { enabled: true, tags: [] };
  }

  const varyByHeaders = normaliseTagList(cache.varyByHeaders ?? []);
  return {
    ...cache,
    enabled: cache.enabled ?? true,
    tags: normaliseTagList(cache.tags ?? []),
    varyByHeaders
  };
};

async function request(
  path,
  {
    method = 'GET',
    headers,
    body,
    data,
    params,
    token,
    signal,
    onUploadProgress,
    onDownloadProgress,
    responseType,
    cache,
    invalidateTags,
    ...axiosOverrides
  } = {}
) {
  if (!path || typeof path !== 'string' || !path.trim()) {
    throw new Error('A request path must be provided to httpClient.request');
  }

  const methodUpper = (method ?? 'GET').toString().toUpperCase();
  const cacheOptions = normaliseCacheOptions(cache);

  const finalHeaders = normaliseHeaders(headers);
  const resolvedToken = await resolveAuthToken(token);
  const tokenForHeaders = resolvedToken ? resolvedToken.trim() : undefined;
  if (tokenForHeaders) {
    finalHeaders.Authorization = `Bearer ${tokenForHeaders}`;
  }

  const useCache = methodUpper === 'GET' && cacheOptions.enabled;
  const varyByToken = cacheOptions.varyByToken ?? true;
  const varyByHeaders = cacheOptions.varyByHeaders ?? [];
  const cacheKey = useCache
    ? responseCache.createKey({
        method: methodUpper,
        path: path.trim(),
        params,
        token: varyByToken ? tokenForHeaders : undefined,
        headers: pickHeaders(finalHeaders, varyByHeaders)
      })
    : null;

  if (useCache) {
    const cached = responseCache.get(cacheKey);
    if (cached !== undefined) {
      return cached;
    }
  }

  const finalBody = body !== undefined ? body : data;

  if (typeof FormData !== 'undefined' && finalBody instanceof FormData) {
    delete finalHeaders['Content-Type'];
  }

  const config = {
    url: path.trim(),
    method: methodUpper,
    headers: finalHeaders,
    data: finalBody,
    params,
    signal,
    onUploadProgress,
    onDownloadProgress,
    responseType,
    paramsSerializer: axiosOverrides.paramsSerializer ?? defaultParamsSerializer,
    ...axiosOverrides
  };

  const response = await apiClient.request(config);
  const responseData = response.data;

  if (useCache) {
    const ttlNumber = Number(cacheOptions.ttl);
    const ttl = Number.isFinite(ttlNumber) && ttlNumber > 0 ? ttlNumber : undefined;
    responseCache.set(cacheKey, responseData, { ttl, tags: cacheOptions.tags });
  }

  const tagsToInvalidate = mergeTagLists(cacheOptions.invalidateTags, invalidateTags);
  if (methodUpper !== 'GET' && tagsToInvalidate.length) {
    responseCache.invalidateTags(tagsToInvalidate);
  }

  return responseData;
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
export {
  API_BASE_URL,
  apiClient,
  request,
  responseCache,
  setAuthTokenResolver,
  clearAuthTokenResolver,
  setDefaultHeaders
};
