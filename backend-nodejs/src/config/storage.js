import { S3Client } from '@aws-sdk/client-s3';

import { env } from './env.js';

const DEFAULT_FORCE_PATH_STYLE = false;

export const storageDriver = env.storage.driver;

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

export const localStorageConfig = {
  root: env.storage.localRoot,
  publicUrl: env.storage.localPublicUrl,
  serveStatic: env.storage.serveStatic
};

export const storageEndpoint =
  storageDriver === 'r2'
    ? `https://${env.storage.accountId}.r2.cloudflarestorage.com`
    : null;

export function buildS3ClientConfig(overrides = {}) {
  if (storageDriver !== 'r2') {
    throw new Error('S3 client configuration is only available when using the R2 storage driver.');
  }

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
  if (storageDriver !== 'r2') {
    return null;
  }
  return new S3Client(buildS3ClientConfig(options));
}

export const r2Client = createStorageClient();

export const storageDescriptor = {
  driver: storageDriver,
  endpoint: storageEndpoint,
  buckets: storageBuckets,
  ttls: storageTtls,
  limits: storageLimits,
  cdnUrl: env.storage.cdnUrl,
  local: localStorageConfig
};

export default r2Client;
