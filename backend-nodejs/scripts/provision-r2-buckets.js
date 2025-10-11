#!/usr/bin/env node

import {
  CreateBucketCommand,
  HeadBucketCommand,
  PutBucketCorsCommand,
  PutBucketLifecycleConfigurationCommand,
  PutBucketTaggingCommand
} from '@aws-sdk/client-s3';

import { env } from '../src/config/env.js';
import logger from '../src/config/logger.js';
import { r2Client } from '../src/config/storage.js';

function buildTagSet(tags) {
  return Object.entries(tags).map(([Key, Value]) => ({ Key, Value }));
}

async function ensureBucketExists(bucketName) {
  try {
    await r2Client.send(new HeadBucketCommand({ Bucket: bucketName }));
    logger.info({ bucket: bucketName }, 'Bucket already exists');
  } catch (error) {
    if (error?.$metadata?.httpStatusCode === 404 || error?.name === 'NotFound') {
      logger.info({ bucket: bucketName }, 'Creating Cloudflare R2 bucket');
      await r2Client.send(new CreateBucketCommand({ Bucket: bucketName }));
      logger.info({ bucket: bucketName }, 'Bucket created successfully');
    } else if (error?.$metadata?.httpStatusCode === 403) {
      logger.warn({ bucket: bucketName }, 'Unable to verify bucket existence due to permissions; continuing');
    } else {
      throw error;
    }
  }
}

async function applyLifecycle(bucketName, rules = []) {
  if (!rules.length) {
    return;
  }

  await r2Client.send(
    new PutBucketLifecycleConfigurationCommand({
      Bucket: bucketName,
      LifecycleConfiguration: {
        Rules: rules.map((rule) => ({
          Status: rule.Status,
          ID: rule.ID,
          Filter: rule.Filter ?? { Prefix: '' },
          Expiration: rule.Expiration,
          AbortIncompleteMultipartUpload: rule.AbortIncompleteMultipartUpload,
          NoncurrentVersionExpiration: rule.NoncurrentVersionExpiration
        }))
      }
    })
  );

  logger.info({ bucket: bucketName }, 'Lifecycle configuration applied');
}

async function applyCors(bucketName, corsRules = []) {
  if (!corsRules.length) {
    return;
  }

  await r2Client.send(
    new PutBucketCorsCommand({
      Bucket: bucketName,
      CORSConfiguration: {
        CORSRules: corsRules
      }
    })
  );

  logger.info({ bucket: bucketName }, 'CORS configuration applied');
}

async function applyTags(bucketName, tags = {}) {
  if (!Object.keys(tags).length) {
    return;
  }

  await r2Client.send(
    new PutBucketTaggingCommand({
      Bucket: bucketName,
      Tagging: {
        TagSet: buildTagSet(tags)
      }
    })
  );

  logger.info({ bucket: bucketName }, 'Tagging configuration applied');
}

async function ensureBucketConfiguration(bucket) {
  await ensureBucketExists(bucket.name);
  await applyLifecycle(bucket.name, bucket.lifecycle ?? []);
  await applyCors(bucket.name, bucket.cors ?? []);
  await applyTags(bucket.name, bucket.tags ?? {});
}

async function main() {
  const corsOrigins = Array.from(new Set(env.app.corsOrigins ?? [])).map((origin) => origin.replace(/\/$/, ''));

  const buckets = [
    {
      name: env.storage.publicBucket,
      lifecycle: [
        {
          ID: 'public-asset-refresh',
          Status: 'Enabled',
          Filter: { Prefix: 'content/' },
          Expiration: { Days: 365 },
          AbortIncompleteMultipartUpload: { DaysAfterInitiation: 3 }
        }
      ],
      cors: [
        {
          AllowedOrigins: corsOrigins.length ? corsOrigins : ['*'],
          AllowedMethods: ['GET', 'HEAD'],
          AllowedHeaders: ['*'],
          MaxAgeSeconds: 86400
        }
      ],
      tags: {
        Visibility: 'public',
        ManagedBy: 'edulure-platform'
      }
    },
    {
      name: env.storage.uploadsBucket,
      lifecycle: [
        {
          ID: 'uploads-expire-seven-days',
          Status: 'Enabled',
          Filter: { Prefix: '' },
          Expiration: { Days: 7 },
          AbortIncompleteMultipartUpload: { DaysAfterInitiation: 2 }
        }
      ],
      tags: {
        Visibility: 'workspace',
        ManagedBy: 'edulure-platform'
      }
    },
    {
      name: env.storage.privateBucket,
      lifecycle: [
        {
          ID: 'noncurrent-cleanup',
          Status: 'Enabled',
          Filter: { Prefix: 'content/' },
          NoncurrentVersionExpiration: { NoncurrentDays: 90 }
        }
      ],
      tags: {
        Visibility: 'private',
        ManagedBy: 'edulure-platform'
      }
    },
    {
      name: env.antivirus.quarantineBucket,
      lifecycle: [
        {
          ID: 'quarantine-expire',
          Status: 'Enabled',
          Filter: { Prefix: '' },
          Expiration: { Days: 30 }
        }
      ],
      tags: {
        Visibility: 'quarantine',
        ManagedBy: 'edulure-platform',
        Retention: '30d'
      }
    }
  ];

  for (const bucket of buckets) {
    try {
      await ensureBucketConfiguration(bucket);
    } catch (error) {
      logger.error({ err: error, bucket: bucket.name }, 'Failed to provision bucket');
      throw error;
    }
  }

  logger.info('Cloudflare R2 bucket provisioning complete');
}

main().catch((error) => {
  logger.error({ err: error }, 'Cloudflare R2 provisioning failed');
  process.exitCode = 1;
});
