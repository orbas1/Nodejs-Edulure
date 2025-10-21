import { S3Client } from '@aws-sdk/client-s3';

import { env } from './env.js';

const DEFAULT_FORCE_PATH_STYLE = false;

export const storageBuckets = {
  public: env.storage.publicBucket,
  private: env.storage.privateBucket,
  uploads: env.storage.uploadsBucket,
  quarantine: env.storage.quarantineBucket
};

export const storageTtls = {
  uploadMs: env.storage.uploadTtlMinutes * 60 * 1000,
  downloadMs: env.storage.downloadTtlMinutes * 60 * 1000
};

export const storageLimits = {
  maxUploadBytes: env.storage.maxUploadBytes
};

export const storageEndpoint = `https://${env.storage.accountId}.r2.cloudflarestorage.com`;

export function buildS3ClientConfig(overrides = {}) {
  return {
    region: env.storage.region,
    endpoint: storageEndpoint,
    forcePathStyle: DEFAULT_FORCE_PATH_STYLE,
    credentials: {
      accessKeyId: env.storage.accessKeyId,
      secretAccessKey: env.storage.secretAccessKey
    },
    ...overrides
  };
}

export function createStorageClient(options = {}) {
  return new S3Client(buildS3ClientConfig(options));
}

export const r2Client = createStorageClient();

export const storageDescriptor = {
  endpoint: storageEndpoint,
  buckets: storageBuckets,
  ttls: storageTtls,
  limits: storageLimits,
  cdnUrl: env.storage.cdnUrl
};

export default r2Client;
