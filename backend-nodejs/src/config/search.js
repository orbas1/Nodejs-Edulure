import { MeiliSearch } from 'meilisearch';

import { env } from './env.js';

const USER_AGENT = 'Edulure-API/1.0.0';

export function normaliseHosts(hosts) {
  if (!hosts) {
    return [];
  }

  const list = Array.isArray(hosts) ? hosts : String(hosts).split(/[\s,]+/);
  return Array.from(
    new Set(
      list
        .map((entry) => entry.trim())
        .filter(Boolean)
        .map((entry) => (entry.startsWith('http') ? entry : `https://${entry}`))
    )
  );
}

export function createMeilisearchClient(host, apiKey, options = {}) {
  return new MeiliSearch({
    host,
    apiKey,
    clientAgents: [USER_AGENT, ...(options.clientAgents ?? [])],
    requestConfig: {
      headers: options.headers ?? {},
      timeout: options.timeout ?? env.search.requestTimeoutMs
    }
  });
}

export function buildSearchClients({ hosts, apiKey, clientOptions } = {}) {
  return normaliseHosts(hosts).map((host) => ({ host, client: createMeilisearchClient(host, apiKey, clientOptions) }));
}

export function createSearchConfiguration(configuration = env.search) {
  return {
    admin: buildSearchClients({ hosts: configuration.adminHosts, apiKey: configuration.adminApiKey }),
    replicas: buildSearchClients({ hosts: configuration.replicaHosts, apiKey: configuration.adminApiKey }),
    read: buildSearchClients({ hosts: configuration.searchHosts, apiKey: configuration.searchApiKey }),
    metadata: {
      indexPrefix: configuration.indexPrefix,
      healthcheckIntervalMs: configuration.healthcheckIntervalMs,
      allowedIps: configuration.allowedIps
    }
  };
}

export const searchConfiguration = createSearchConfiguration();

export default searchConfiguration;
