import postgresSearchProvider from './search/providers/postgresSearchProvider.js';

const providers = new Map();
let activeProviderName = null;

function ensureDefaultProvider() {
  if (!providers.has(postgresSearchProvider.name)) {
    registerSearchProvider(postgresSearchProvider);
  }
}

export function registerSearchProvider(provider) {
  if (!provider || typeof provider.name !== 'string') {
    throw new Error('Search provider must include a name');
  }
  if (typeof provider.search !== 'function') {
    throw new Error(`Search provider "${provider.name}" must implement a search function`);
  }
  const key = provider.name.trim().toLowerCase();
  providers.set(key, { ...provider, name: key });
}

export function listSearchProviders() {
  ensureDefaultProvider();
  return Array.from(providers.keys());
}

export function resolveSearchProvider({ providerName, env = process.env } = {}) {
  ensureDefaultProvider();
  const desiredRaw = providerName ?? env.SEARCH_PROVIDER ?? env.EDULURE_SEARCH_PROVIDER;
  const desired = desiredRaw ? String(desiredRaw).trim().toLowerCase() : null;
  if (desired && providers.has(desired)) {
    activeProviderName = desired;
    return providers.get(desired);
  }
  if (activeProviderName && providers.has(activeProviderName)) {
    return providers.get(activeProviderName);
  }
  activeProviderName = postgresSearchProvider.name;
  return providers.get(postgresSearchProvider.name);
}

export function setActiveSearchProvider(name) {
  ensureDefaultProvider();
  if (!providers.has(name)) {
    throw new Error(`Unknown search provider "${name}"`);
  }
  activeProviderName = name;
  return providers.get(name);
}

export function getActiveSearchProvider() {
  return resolveSearchProvider();
}

ensureDefaultProvider();

export default {
  registerSearchProvider,
  resolveSearchProvider,
  getActiveSearchProvider,
  setActiveSearchProvider,
  listSearchProviders
};
