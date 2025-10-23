export class SearchProviderRegistry {
  constructor() {
    this.providers = new Map();
    this.entityProviders = new Map();
    this.defaultProviderKey = null;
  }

  register(key, provider, { entities = null, defaultProvider = false } = {}) {
    if (!key || typeof key !== 'string') {
      throw new TypeError('Search providers must be registered with a string key');
    }
    if (!provider || typeof provider.search !== 'function') {
      throw new TypeError('Search providers must expose a search(entityType, options) function');
    }

    const normalisedKey = key.trim();
    this.providers.set(normalisedKey, provider);

    const supportedEntities = Array.isArray(entities) && entities.length
      ? entities
      : typeof provider.getSupportedEntities === 'function'
        ? provider.getSupportedEntities()
        : [];

    supportedEntities
      .map((entity) => (typeof entity === 'string' ? entity.trim().toLowerCase() : null))
      .filter(Boolean)
      .forEach((entity) => {
        if (!this.entityProviders.has(entity)) {
          this.entityProviders.set(entity, normalisedKey);
        }
      });

    if (defaultProvider || !this.defaultProviderKey) {
      this.defaultProviderKey = normalisedKey;
    }

    return normalisedKey;
  }

  setDefault(key) {
    const resolvedKey = key?.trim();
    if (!resolvedKey || !this.providers.has(resolvedKey)) {
      throw new Error(`Unknown search provider: ${key}`);
    }
    this.defaultProviderKey = resolvedKey;
  }

  resolveProviderKey(entityType) {
    if (entityType) {
      const normalised = String(entityType).trim().toLowerCase();
      if (this.entityProviders.has(normalised)) {
        return this.entityProviders.get(normalised);
      }
    }
    return this.defaultProviderKey;
  }

  resolve(entityType) {
    const providerKey = this.resolveProviderKey(entityType);
    if (!providerKey) {
      return null;
    }
    return this.providers.get(providerKey) ?? null;
  }

  getSupportedEntities() {
    const entities = new Set();
    for (const key of this.entityProviders.keys()) {
      entities.add(key);
    }
    for (const provider of this.providers.values()) {
      if (typeof provider.getSupportedEntities === 'function') {
        for (const entity of provider.getSupportedEntities()) {
          if (typeof entity === 'string' && entity.trim()) {
            entities.add(entity.trim().toLowerCase());
          }
        }
      }
    }
    return [...entities];
  }

  async search(entityType, options) {
    const provider = this.resolve(entityType);
    if (!provider) {
      throw new Error(`No search provider registered for entity type "${entityType}"`);
    }
    return provider.search(entityType, options);
  }
}

export function createSearchProviderRegistry(initialisers = []) {
  const registry = new SearchProviderRegistry();
  initialisers.forEach((initialiser) => {
    if (typeof initialiser === 'function') {
      initialiser(registry);
    }
  });
  return registry;
}

export default SearchProviderRegistry;
