import { describe, expect, it, vi } from 'vitest';

vi.mock('../../src/config/env.js', () => ({
  env: {
    storage: {
      accountId: 'test-account',
      accessKeyId: 'AKIA123',
      secretAccessKey: 'secret123',
      region: 'auto',
      publicBucket: 'public-bucket',
      privateBucket: 'private-bucket',
      uploadsBucket: 'uploads-bucket',
      quarantineBucket: 'quarantine-bucket',
      uploadTtlMinutes: 20,
      downloadTtlMinutes: 45,
      maxUploadBytes: 1024 * 1024,
      cdnUrl: 'https://cdn.local'
    }
  }
}));

import {
  storageDescriptor,
  storageBuckets,
  storageTtls,
  storageLimits,
  storageEndpoint,
  buildS3ClientConfig,
  createStorageClient
} from '../../src/config/storage.js';

describe('storage configuration', () => {
  it('exposes bucket aliases and TTLs derived from the environment', () => {
    expect(storageBuckets).toMatchObject({
      public: 'public-bucket',
      uploads: 'uploads-bucket'
    });

    expect(storageTtls.uploadMs).toBe(20 * 60 * 1000);
    expect(storageTtls.downloadMs).toBe(45 * 60 * 1000);
    expect(storageLimits.maxUploadBytes).toBe(1024 * 1024);

    expect(storageDescriptor).toMatchObject({
      endpoint: storageEndpoint,
      buckets: storageBuckets,
      ttls: storageTtls,
      limits: storageLimits
    });
  });

  it('builds an S3 configuration payload with override support', () => {
    const config = buildS3ClientConfig({ forcePathStyle: true });
    expect(config).toMatchObject({
      endpoint: storageEndpoint,
      forcePathStyle: true,
      credentials: {
        accessKeyId: expect.any(String),
        secretAccessKey: expect.any(String)
      }
    });
  });

  it('creates a configured S3 client honouring overrides', () => {
    const client = createStorageClient({ forcePathStyle: true });
    expect(client.config.forcePathStyle).toBe(true);
  });
});
