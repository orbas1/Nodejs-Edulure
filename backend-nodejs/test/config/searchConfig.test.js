import { beforeEach, describe, expect, it, vi } from 'vitest';

const instances = [];

const envMock = {
  search: {
    adminHosts: ['https://admin.local'],
    replicaHosts: ['https://replica.local'],
    searchHosts: ['https://search.local'],
    adminApiKey: 'admin',
    searchApiKey: 'search',
    requestTimeoutMs: 5000,
    indexPrefix: 'edulure',
    healthcheckIntervalMs: 30000,
    allowedIps: ['127.0.0.1']
  }
};

vi.mock('meilisearch', () => ({
  MeiliSearch: class {
    constructor(config) {
      this.config = config;
      instances.push(config);
    }
  }
}));

vi.mock('../../src/config/env.js', () => ({
  env: envMock
}));

let module;

beforeEach(async () => {
  instances.length = 0;
  module = await import('../../src/config/search.js');
});

describe('search configuration', () => {
  it('normalises host definitions', () => {
    const { normaliseHosts } = module;
    expect(normaliseHosts(['https://one', 'two', 'two'])).toEqual(['https://one', 'https://two']);
    expect(normaliseHosts('https://primary, secondary')).toEqual(['https://primary', 'https://secondary']);
  });

  it('instantiates clients for each host', () => {
    const { buildSearchClients } = module;
    const clients = buildSearchClients({ hosts: ['one.local', 'two.local'], apiKey: 'key-123' });
    expect(clients).toHaveLength(2);
    expect(clients[0].host).toBe('https://one.local');
    expect(instances[0]).toMatchObject({ host: 'https://one.local', apiKey: 'key-123' });
  });

  it('exposes the environment metadata through createSearchConfiguration', () => {
    const { createSearchConfiguration } = module;
    const config = createSearchConfiguration({
      adminHosts: ['admin.local'],
      replicaHosts: ['replica.local'],
      searchHosts: ['search.local'],
      adminApiKey: 'admin',
      searchApiKey: 'search',
      indexPrefix: 'edulure',
      healthcheckIntervalMs: 1000,
      allowedIps: ['127.0.0.1']
    });

    expect(config.metadata).toEqual({
      indexPrefix: 'edulure',
      healthcheckIntervalMs: 1000,
      allowedIps: ['127.0.0.1']
    });
  });
});
