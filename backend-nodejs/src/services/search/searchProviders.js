import { env } from '../../config/env.js';
import databaseSearchProvider, { DatabaseSearchProvider } from './providers/databaseSearchProvider.js';

const providers = new Map();

export function registerSearchProvider(name, resolver) {
  if (!name || typeof name !== 'string') {
    throw new Error('Search provider name must be a non-empty string.');
  }
  if (typeof resolver !== 'function') {
    throw new Error('Search provider resolver must be a function.');
  }
  providers.set(name, resolver);
}

export function getSearchProvider(name = env.search.provider ?? 'database') {
  const resolver = providers.get(name);
  if (!resolver) {
    const available = Array.from(providers.keys()).join(', ') || '<none>';
    throw new Error(`Search provider "${name}" is not registered. Available: ${available}`);
  }
  return resolver();
}

registerSearchProvider('database', () => databaseSearchProvider);
registerSearchProvider('database:new-instance', () => new DatabaseSearchProvider());

export default getSearchProvider;
