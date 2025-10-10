const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api';

async function parseResponse(response) {
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return response.json();
  }
  const text = await response.text();
  return text ? { message: text } : null;
}

async function request(path, { method = 'GET', headers = {}, body, token, signal } = {}) {
  const finalHeaders = { ...headers };
  let payload = body;
  if (body && !(body instanceof FormData) && typeof body !== 'string') {
    finalHeaders['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  if (token) {
    finalHeaders.Authorization = `Bearer ${token}`;
  }
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: finalHeaders,
    body: payload,
    signal
  });
  const data = await parseResponse(response);
  if (!response.ok) {
    const error = new Error(data?.message ?? 'Request failed');
    error.details = data?.data ?? data?.errors;
    error.status = response.status;
    throw error;
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

function del(path, options = {}) {
  return request(path, { ...options, method: 'DELETE' });
}

export const httpClient = { get, post, put, delete: del };
export { API_BASE_URL, request };
