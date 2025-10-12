import { MeiliSearch } from 'meilisearch';

import { env } from './env.js';

const USER_AGENT = 'Edulure-API/1.0.0';

export function createMeilisearchClient(host, apiKey) {
  return new MeiliSearch({
    host,
    apiKey,
    clientAgents: [USER_AGENT],
    requestConfig: {
      headers: {},
      timeout: env.search.requestTimeoutMs
    }
  });
}

export function buildSearchClients({ hosts, apiKey }) {
  return hosts.map((host) => ({ host, client: createMeilisearchClient(host, apiKey) }));
}

export const searchConfiguration = {
  admin: buildSearchClients({ hosts: env.search.adminHosts, apiKey: env.search.adminApiKey }),
  replicas: buildSearchClients({ hosts: env.search.replicaHosts, apiKey: env.search.adminApiKey }),
  read: buildSearchClients({ hosts: env.search.searchHosts, apiKey: env.search.searchApiKey })
};

export default searchConfiguration;
