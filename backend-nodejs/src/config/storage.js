import { S3Client } from '@aws-sdk/client-s3';

import { env } from './env.js';

const endpoint = `https://${env.storage.accountId}.r2.cloudflarestorage.com`;

export const r2Client = new S3Client({
  region: env.storage.region,
  endpoint,
  forcePathStyle: false,
  credentials: {
    accessKeyId: env.storage.accessKeyId,
    secretAccessKey: env.storage.secretAccessKey
  }
});

export const r2Endpoint = endpoint;

export default r2Client;
