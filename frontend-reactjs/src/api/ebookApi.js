import { httpClient } from './httpClient.js';

export function listMarketplaceEbooks({ params, signal } = {}) {
  return httpClient.get('/ebooks', { params, signal }).then((response) => response.data);
}

export function getEbookDetail(slug, { signal } = {}) {
  return httpClient.get(`/ebooks/slug/${slug}`, { signal }).then((response) => response.data);
}

export function listInstructorCatalogue({ token, params, signal } = {}) {
  return httpClient
    .get('/ebooks/catalogue', {
      token,
      params,
      signal
    })
    .then((response) => response.data);
}

export function createEbookListing({ token, payload }) {
  return httpClient
    .post('/ebooks', payload, { token })
    .then((response) => response.data);
}

export function updateEbookListing({ token, ebookId, payload }) {
  return httpClient
    .patch(`/ebooks/${ebookId}`, payload, { token })
    .then((response) => response.data);
}

export function updateEbookState({ token, ebookId, payload }) {
  return httpClient
    .post(`/ebooks/${ebookId}/state`, payload, { token })
    .then((response) => response.data);
}

export function createEbookPurchaseIntent({ token, ebookId, payload }) {
  return httpClient
    .post(`/ebooks/${ebookId}/purchase-intent`, payload, { token })
    .then((response) => response.data);
}
