import {
  PutObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  CopyObjectCommand
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import mime from 'mime-types';
import { randomUUID, createHash } from 'node:crypto';

import { r2Client } from '../config/storage.js';
import { env } from '../config/env.js';
import logger from '../config/logger.js';

const VISIBILITY_BUCKET_MAP = {
  public: () => env.storage.publicBucket,
  workspace: () => env.storage.privateBucket,
  private: () => env.storage.privateBucket
};

export class StorageService {
  constructor(client) {
    this.client = client;
  }

  generateStorageKey(prefix, originalFilename) {
    const extension = mime.extension(mime.lookup(originalFilename) || '') || originalFilename.split('.').pop() || 'bin';
    return `${prefix}/${randomUUID()}.${extension}`;
  }

  resolveBucket(visibility = 'workspace', explicitBucket) {
    if (explicitBucket) {
      return explicitBucket;
    }
    const resolver = VISIBILITY_BUCKET_MAP[visibility] ?? VISIBILITY_BUCKET_MAP.workspace;
    return resolver();
  }

  async createUploadUrl({
    key,
    contentType,
    contentLength,
    visibility = 'workspace',
    bucket
  }) {
    const targetBucket = this.resolveBucket(visibility, bucket ?? env.storage.uploadsBucket);
    if (contentLength > env.storage.maxUploadBytes) {
      const error = new Error(
        `Payload exceeds maximum size of ${Math.round(env.storage.maxUploadBytes / (1024 * 1024))}MB`
      );
      error.status = 413;
      throw error;
    }

    const command = new PutObjectCommand({
      Bucket: targetBucket,
      Key: key,
      ContentType: contentType,
      ACL: visibility === 'public' ? 'public-read' : undefined,
      Metadata: {
        'edulure-origin': 'platform-upload'
      }
    });

    const signedUrl = await getSignedUrl(this.client, command, {
      expiresIn: env.storage.uploadTtlMinutes * 60
    });

    return {
      bucket: targetBucket,
      key,
      url: signedUrl,
      expiresAt: new Date(Date.now() + env.storage.uploadTtlMinutes * 60 * 1000)
    };
  }

  async createDownloadUrl({ key, bucket, visibility = 'workspace', responseContentDisposition }) {
    const targetBucket = this.resolveBucket(visibility, bucket ?? env.storage.privateBucket);
    const command = new GetObjectCommand({
      Bucket: targetBucket,
      Key: key,
      ResponseContentDisposition: responseContentDisposition
    });
    const signedUrl = await getSignedUrl(this.client, command, {
      expiresIn: env.storage.downloadTtlMinutes * 60
    });
    return {
      bucket: targetBucket,
      key,
      url: signedUrl,
      expiresAt: new Date(Date.now() + env.storage.downloadTtlMinutes * 60 * 1000)
    };
  }

  async uploadBuffer({ bucket, key, body, contentType, visibility = 'workspace', metadata = {} }) {
    const targetBucket = this.resolveBucket(visibility, bucket);
    const upload = new Upload({
      client: this.client,
      params: {
        Bucket: targetBucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        ACL: visibility === 'public' ? 'public-read' : undefined,
        Metadata: metadata
      }
    });
    await upload.done();
    return {
      bucket: targetBucket,
      key,
      size: body.length,
      checksum: createHash('sha256').update(body).digest('hex')
    };
  }

  async uploadStream({ bucket, key, stream, contentType, visibility = 'workspace', metadata = {} }) {
    const targetBucket = this.resolveBucket(visibility, bucket);
    const upload = new Upload({
      client: this.client,
      params: {
        Bucket: targetBucket,
        Key: key,
        Body: stream,
        ContentType: contentType,
        ACL: visibility === 'public' ? 'public-read' : undefined,
        Metadata: metadata
      }
    });
    const result = await upload.done();
    return {
      bucket: targetBucket,
      key,
      etag: result.ETag
    };
  }

  async headObject({ key, bucket }) {
    try {
      return await this.client.send(
        new HeadObjectCommand({
          Bucket: bucket,
          Key: key
        })
      );
    } catch (error) {
      logger.error({ err: error, key, bucket }, 'Failed to fetch object metadata');
      throw error;
    }
  }

  async deleteObject({ key, bucket }) {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: key
      })
    );
  }

  async downloadToBuffer({ key, bucket }) {
    const targetBucket = bucket ?? env.storage.privateBucket;
    const response = await this.client.send(
      new GetObjectCommand({
        Bucket: targetBucket,
        Key: key
      })
    );
    const chunks = [];
    for await (const chunk of response.Body) {
      chunks.push(Buffer.from(chunk));
    }
    const buffer = Buffer.concat(chunks);
    return {
      bucket: targetBucket,
      key,
      buffer,
      size: buffer.length,
      contentType: response.ContentType,
      etag: response.ETag
    };
  }

  async copyObject({ sourceBucket, sourceKey, destinationBucket, destinationKey, visibility = 'workspace' }) {
    const targetBucket = destinationBucket ?? this.resolveBucket(visibility);
    await this.client.send(
      new CopyObjectCommand({
        Bucket: targetBucket,
        Key: destinationKey,
        CopySource: `${sourceBucket}/${encodeURIComponent(sourceKey)}`,
        ACL: visibility === 'public' ? 'public-read' : undefined
      })
    );
    return { bucket: targetBucket, key: destinationKey };
  }

  buildPublicUrl({ bucket, key }) {
    if (env.storage.cdnUrl) {
      return `${env.storage.cdnUrl.replace(/\/$/, '')}/${key}`;
    }
    return `https://${bucket}.${env.storage.accountId}.r2.cloudflarestorage.com/${key}`;
  }
}

const storageService = new StorageService(r2Client);

export default storageService;
