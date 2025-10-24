import { promises as fs } from 'node:fs';
import path from 'node:path';

import { getIntrospectionQuery, graphqlSync, Kind, parse, print, visit } from 'graphql';

import { env } from '../config/env.js';
import logger from '../config/logger.js';
import { feedSchema } from './schema.js';
import persistedQueryStore, { computeSha256 } from './persistedQueryStore.js';

const gatewayLogger = logger.child({ module: 'graphql-gateway' });

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalisePersistedQueryEntry(entry, index = 0) {
  if (!entry) {
    return null;
  }

  if (typeof entry === 'string') {
    const trimmed = entry.trim();
    if (!trimmed) {
      return null;
    }
    return {
      id: `query-${index}`,
      query: trimmed,
      hash: computeSha256(trimmed)
    };
  }

  if (isPlainObject(entry)) {
    const querySource = entry.query ?? entry.document ?? entry.text ?? null;
    const trimmed = typeof querySource === 'string' ? querySource.trim() : '';
    if (!trimmed) {
      return null;
    }

    const declaredHash = entry.sha256 ?? entry.hash ?? null;
    const normalisedHash = typeof declaredHash === 'string' && /^[a-f0-9]{64}$/i.test(declaredHash)
      ? declaredHash.toLowerCase()
      : computeSha256(trimmed);

    return {
      id: entry.id ?? entry.name ?? entry.operationName ?? `query-${index}`,
      query: trimmed,
      hash: normalisedHash
    };
  }

  if (Array.isArray(entry) && entry.length >= 2) {
    const [id, query] = entry;
    if (typeof query !== 'string' || !query.trim()) {
      return null;
    }
    return {
      id: typeof id === 'string' && id.trim() ? id.trim() : `query-${index}`,
      query: query.trim(),
      hash: computeSha256(query)
    };
  }

  return null;
}

function dedupeEntries(entries = []) {
  const unique = new Map();
  for (const entry of entries) {
    if (!entry || typeof entry.query !== 'string' || !entry.hash) {
      continue;
    }

    const key = entry.hash.toLowerCase();
    if (unique.has(key)) {
      continue;
    }
    unique.set(key, { ...entry, hash: key });
  }

  return Array.from(unique.values());
}

function collectFragmentDependencies(definition, fragmentMap, collected = new Set()) {
  const fragments = [];

  visit(definition, {
    FragmentSpread(node) {
      const fragmentName = node.name?.value;
      if (!fragmentName || collected.has(fragmentName)) {
        return;
      }

      const fragmentDefinition = fragmentMap[fragmentName];
      if (!fragmentDefinition) {
        return;
      }

      collected.add(fragmentName);
      fragments.push(fragmentDefinition);
      const nested = collectFragmentDependencies(fragmentDefinition, fragmentMap, collected);
      fragments.push(...nested);
    }
  });

  return fragments;
}

function parseGraphQLDocumentManifest(source, { manifestPath, loggerInstance } = {}) {
  try {
    const document = parse(source, { noLocation: true });
    const fragmentMap = Object.create(null);
    const operations = [];

    for (const definition of document.definitions ?? []) {
      if (definition.kind === Kind.FRAGMENT_DEFINITION && definition.name?.value) {
        fragmentMap[definition.name.value] = definition;
        continue;
      }

      if (definition.kind === Kind.OPERATION_DEFINITION) {
        operations.push(definition);
      }
    }

    if (!operations.length) {
      return [];
    }

    const entries = operations.map((operation, index) => {
      const fragments = collectFragmentDependencies(operation, fragmentMap);
      const operationDocument = {
        kind: Kind.DOCUMENT,
        definitions: [operation, ...fragments]
      };
      const rendered = print(operationDocument).trim();

      const operationName = operation.name?.value
        ?? `${operation.operation ?? 'operation'}-${index + 1}`;

      return {
        id: operationName,
        query: rendered,
        hash: computeSha256(rendered)
      };
    });

    return dedupeEntries(entries.filter(Boolean));
  } catch (error) {
    loggerInstance?.warn(
      { err: error, manifestPath },
      'Failed to parse GraphQL manifest as document; falling back to raw payload'
    );
    return null;
  }
}

function parseManifestPayload(payload) {
  if (payload === undefined || payload === null) {
    return [];
  }

  if (typeof payload === 'string') {
    return dedupeEntries([normalisePersistedQueryEntry(payload, 0)].filter(Boolean));
  }

  if (Array.isArray(payload)) {
    return dedupeEntries(payload.map(normalisePersistedQueryEntry).filter(Boolean));
  }

  if (isPlainObject(payload)) {
    const entries = Object.entries(payload).map(([key, value], index) => {
      if (typeof value === 'string') {
        return normalisePersistedQueryEntry({ id: key, query: value }, index);
      }
      if (isPlainObject(value)) {
        return normalisePersistedQueryEntry({ id: key, ...value }, index);
      }
      return null;
    });
    return dedupeEntries(entries.filter(Boolean));
  }

  return [];
}

async function loadManifestEntries(manifestPath, loggerInstance) {
  const resolved = path.resolve(manifestPath);
  const extension = path.extname(resolved).toLowerCase();
  const contents = await fs.readFile(resolved, 'utf8');

  if (extension === '.graphql' || extension === '.gql') {
    const parsed = parseGraphQLDocumentManifest(contents, { manifestPath: resolved, loggerInstance });
    if (parsed) {
      return parsed;
    }
    return parseManifestPayload(contents);
  }

  try {
    const parsed = JSON.parse(contents);
    return parseManifestPayload(parsed);
  } catch (error) {
    throw new Error(`Failed to parse GraphQL persisted query manifest: ${error.message}`);
  }
}

async function hydratePersistedQueries({ manifestPath, store, loggerInstance }) {
  if (!manifestPath) {
    loggerInstance?.info('GraphQL persisted query manifest not configured; skipping cache warmup');
    return {
      status: 'degraded',
      loaded: 0,
      message: 'Persisted query manifest not configured'
    };
  }

  try {
    const entries = await loadManifestEntries(manifestPath, loggerInstance);
    store.replaceAll(entries);
    loggerInstance?.info(
      { manifestPath, loaded: entries.length },
      'GraphQL persisted query cache warmed'
    );
    return {
      status: 'ready',
      loaded: entries.length,
      message: `Persisted query cache primed (${entries.length} entr${entries.length === 1 ? 'y' : 'ies'})`
    };
  } catch (error) {
    if (error.code === 'ENOENT') {
      loggerInstance?.warn({ manifestPath }, 'GraphQL persisted query manifest not found');
      return {
        status: 'degraded',
        loaded: 0,
        message: 'Persisted query manifest not found'
      };
    }

    throw error;
  }
}

export async function warmGraphQLGateway({
  manifestPath = env.graphql?.persistedQueriesPath,
  refreshIntervalMs = env.graphql?.persistedQueriesRefreshIntervalMs,
  warmIntrospection = env.graphql?.warmIntrospection !== false,
  store = persistedQueryStore,
  loggerInstance = gatewayLogger
} = {}) {
  if (warmIntrospection) {
    const introspection = graphqlSync({
      schema: feedSchema,
      source: getIntrospectionQuery(),
      contextValue: {}
    });

    if (Array.isArray(introspection.errors) && introspection.errors.length > 0) {
      const message = introspection.errors.map((error) => error.message).join('; ');
      const error = new Error(`GraphQL schema introspection failed: ${message}`);
      error.errors = introspection.errors;
      throw error;
    }

    loggerInstance.info('GraphQL schema introspection warmed');
  }

  const hydrationResult = await hydratePersistedQueries({ manifestPath, store, loggerInstance });
  let lastHydration = hydrationResult;
  let refreshTimer = null;

  if (manifestPath && refreshIntervalMs && refreshIntervalMs > 0) {
    refreshTimer = setInterval(() => {
      hydratePersistedQueries({ manifestPath, store, loggerInstance })
        .then((result) => {
          lastHydration = result;
        })
        .catch((error) => {
          loggerInstance.error({ err: error, manifestPath }, 'Failed to refresh persisted query manifest');
        });
    }, refreshIntervalMs);

    if (typeof refreshTimer.unref === 'function') {
      refreshTimer.unref();
    }
  }

  return {
    status: hydrationResult.status,
    message: hydrationResult.message,
    details: {
      loaded: hydrationResult.loaded,
      refreshIntervalMs: refreshTimer ? refreshIntervalMs : 0
    },
    stop: async () => {
      if (refreshTimer) {
        clearInterval(refreshTimer);
      }

      loggerInstance.info(
        {
          manifestPath,
          loaded: lastHydration?.loaded ?? 0
        },
        'GraphQL gateway bootstrap stopped'
      );
    }
  };
}

export default warmGraphQLGateway;
