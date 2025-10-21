import { httpClient } from './httpClient.js';
import { assertId, assertToken, createInvalidationConfig, createListCacheConfig } from './apiUtils.js';

export function listMarketplaceEbooks({ params, signal } = {}) {
  return httpClient
    .get('/ebooks', {
      params,
      signal,
      cache: createListCacheConfig('ebooks:marketplace', { ttl: 60_000, varyByToken: false })
    })
    .then((response) => response.data);
}

export function getEbookDetail(slug, { signal } = {}) {
  assertId(slug, 'E-book slug');
  return httpClient
    .get(`/ebooks/slug/${slug}`, {
      signal,
      cache: createListCacheConfig(`ebooks:detail:${slug}`, { ttl: 120_000, varyByToken: false })
    })
    .then((response) => response.data);
}

export function listInstructorCatalogue({ token, params, signal } = {}) {
  assertToken(token, 'list instructor e-book catalogue');
  return httpClient
    .get('/ebooks/catalogue', {
      token,
      params,
      signal,
      cache: createListCacheConfig(`ebooks:catalogue:${token}`, { ttl: 30_000 })
    })
    .then((response) => response.data);
}

export function createEbookListing({ token, payload }) {
  assertToken(token, 'create an e-book listing');
  return httpClient
    .post('/ebooks', payload, {
      token,
      cache: createInvalidationConfig([
        `ebooks:catalogue:${token}`,
        'ebooks:marketplace'
      ])
    })
    .then((response) => response.data);
}

export function updateEbookListing({ token, ebookId, payload }) {
  assertToken(token, 'update an e-book listing');
  assertId(ebookId, 'E-book id');
  return httpClient
    .patch(`/ebooks/${ebookId}`, payload, {
      token,
      cache: createInvalidationConfig([
        `ebooks:catalogue:${token}`,
        'ebooks:marketplace',
        `ebooks:detail:${ebookId}`
      ])
    })
    .then((response) => response.data);
}

export function updateEbookState({ token, ebookId, payload }) {
  assertToken(token, 'update e-book state');
  assertId(ebookId, 'E-book id');
  return httpClient
    .post(`/ebooks/${ebookId}/state`, payload, {
      token,
      cache: createInvalidationConfig([
        `ebooks:catalogue:${token}`,
        'ebooks:marketplace',
        `ebooks:detail:${ebookId}`
      ])
    })
    .then((response) => response.data);
}

export function createEbookPurchaseIntent({ token, ebookId, payload }) {
  assertToken(token, 'create an e-book purchase intent');
  assertId(ebookId, 'E-book id');
  return httpClient
    .post(`/ebooks/${ebookId}/purchase-intent`, payload, {
      token,
      cache: createInvalidationConfig(`ebooks:detail:${ebookId}`)
    })
    .then((response) => response.data);
}
