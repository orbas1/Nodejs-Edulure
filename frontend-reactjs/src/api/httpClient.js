import axios from 'axios';

import { responseCache } from './cache.js';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
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
