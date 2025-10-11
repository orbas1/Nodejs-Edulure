import axios from 'axios';

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

async function request(path, { method = 'GET', headers, body, params, token, signal, onUploadProgress } = {}) {
  const finalHeaders = normaliseHeaders(headers);
  if (token) {
    finalHeaders.Authorization = `Bearer ${token}`;
  }

  const config = {
    url: path,
    method,
    headers: finalHeaders,
    data: body,
    params,
    signal,
    onUploadProgress
  };

  const response = await apiClient.request(config);
  return response.data;
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
export { API_BASE_URL, apiClient, request };
