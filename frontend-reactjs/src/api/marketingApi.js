import { httpClient } from './httpClient.js';
import { createListCacheConfig } from './apiUtils.js';

export async function fetchMarketingPage({ slug, locale, fallbackLocale, signal } = {}) {
  if (!slug) {
    throw new Error('A marketing page slug is required.');
  }

  const params = {};
  if (locale) {
    params.locale = locale;
  }
  if (fallbackLocale) {
    params.fallbackLocale = fallbackLocale;
  }

  const response = await httpClient.get(`/content/marketing/pages/${slug}`, {
    params,
    signal,
    cache: createListCacheConfig(`marketing:page:${slug}:${locale ?? 'default'}`, { ttl: 60_000, varyByToken: false })
  });

  return response?.data ?? response ?? null;
}

export default {
  fetchMarketingPage
};
