import { promises as fs, createReadStream, createWriteStream } from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { PassThrough } from 'node:stream';
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

import {
  r2Client,
  storageDriver,
  storageBuckets,
  storageDescriptor,
  storageLimits,
  storageTtls,
  localStorageConfig
} from '../config/storage.js';
import { env } from '../config/env.js';
import logger from '../config/logger.js';
import { recordStorageOperation } from '../observability/metrics.js';
import { withTelemetrySpan } from '../observability/requestContext.js';

const VISIBILITY_BUCKET_MAP = {
  public: () => storageBuckets.public,
  workspace: () => storageBuckets.private,
  private: () => storageBuckets.private,
  upload: () => storageBuckets.uploads
};

function resolveVisibilityLabel(bucket) {
  if (!bucket) {
    return 'workspace';
  }
  if (bucket === storageBuckets.public) {
    return 'public';
  }
  if (bucket === storageBuckets.uploads) {
    return 'upload';
  }
  if (bucket === storageBuckets.private) {
    return 'workspace';
  }
  return 'custom';
}

function normaliseKey(key) {
  return key.replace(/^\/+/, '');
}

async function ensureDirectory(directoryPath) {
  await fs.mkdir(directoryPath, { recursive: true });
}

class BaseStorageService {
  generateStorageKey(prefix, originalFilename) {
    const extension =
      mime.extension(mime.lookup(originalFilename) || '') || originalFilename.split('.').pop() || 'bin';
    return `${prefix}/${randomUUID()}.${extension}`;
  }

  resolveBucket(visibility = 'workspace', explicitBucket) {
    if (explicitBucket) {
      return explicitBucket;
    }
    const resolver = VISIBILITY_BUCKET_MAP[visibility] ?? VISIBILITY_BUCKET_MAP.workspace;
    return resolver();
  }

  buildPublicUrl({ bucket, key }) {
    if (storageDescriptor.driver === 'local') {
      if (localStorageConfig.publicUrl) {
        return `${localStorageConfig.publicUrl.replace(/\/$/, '')}/${bucket}/${normaliseKey(key)}`;
      }
      return `/storage/${bucket}/${normaliseKey(key)}`;
    }

    if (env.storage.cdnUrl) {
      return `${env.storage.cdnUrl.replace(/\/$/, '')}/${normaliseKey(key)}`;
    }
    return `https://${bucket}.${env.storage.accountId}.r2.cloudflarestorage.com/${normaliseKey(key)}`;
  }
}

class CloudStorageService extends BaseStorageService {
  constructor(client) {
    super();
    this.client = client;
    if (!this.client) {
      throw new Error('Cloud storage client not initialised');
    }
  }

  async createUploadUrl({ key, contentType, contentLength, visibility = 'workspace', bucket }) {
    const targetBucket = this.resolveBucket(visibility, bucket ?? storageBuckets.uploads);
    if (contentLength > storageLimits.maxUploadBytes) {
      const error = new Error(
        `Payload exceeds maximum size of ${Math.round(storageLimits.maxUploadBytes / (1024 * 1024))}MB`
      );
      error.status = 413;
      throw error;
    }

    return withTelemetrySpan('storage.createUploadUrl', async () =>
      recordStorageOperation('create_upload_url', visibility, async () => {
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
          method: 'PUT',
          expiresAt: new Date(Date.now() + storageTtls.uploadMs)
        };
      })
    );
  }

  async createDownloadUrl({ key, bucket, visibility = 'workspace', responseContentDisposition }) {
    const targetBucket = this.resolveBucket(visibility, bucket ?? storageBuckets.private);
    return withTelemetrySpan('storage.createDownloadUrl', async () =>
      recordStorageOperation('create_download_url', visibility, async () => {
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
          method: 'GET',
          expiresAt: new Date(Date.now() + storageTtls.downloadMs)
        };
      })
    );
  }

  async uploadBuffer({ bucket, key, body, contentType, visibility = 'workspace', metadata = {} }) {
    const targetBucket = this.resolveBucket(visibility, bucket);
    return withTelemetrySpan('storage.uploadBuffer', async () =>
      recordStorageOperation('upload_buffer', visibility, async () => {
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
      })
    );
  }

  async uploadStream({ bucket, key, stream, contentType, visibility = 'workspace', metadata = {} }) {
    const targetBucket = this.resolveBucket(visibility, bucket);
    return withTelemetrySpan('storage.uploadStream', async () =>
      recordStorageOperation('upload_stream', visibility, async () => {
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
      })
    );
  }

  async headObject({ key, bucket }) {
    const visibilityLabel = resolveVisibilityLabel(bucket);
    try {
      return await withTelemetrySpan('storage.headObject', async () =>
        recordStorageOperation('head_object', visibilityLabel, async () =>
          this.client.send(
            new HeadObjectCommand({
              Bucket: bucket,
              Key: key
            })
          )
        )
      );
    } catch (error) {
      logger.error({ err: error, key, bucket }, 'Failed to fetch object metadata');
      throw error;
    }
  }

  async deleteObject({ key, bucket }) {
    const visibilityLabel = resolveVisibilityLabel(bucket);
    await withTelemetrySpan('storage.deleteObject', async () =>
      recordStorageOperation('delete_object', visibilityLabel, async () =>
        this.client.send(
          new DeleteObjectCommand({
            Bucket: bucket,
            Key: key
          })
        )
      )
    );
  }

  async downloadToBuffer({ key, bucket }) {
    const targetBucket = bucket ?? storageBuckets.private;
    const visibilityLabel = resolveVisibilityLabel(targetBucket);
    return withTelemetrySpan('storage.downloadToBuffer', async () =>
      recordStorageOperation('download_buffer', visibilityLabel, async () => {
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
      })
    );
  }

  async getObjectStream({ key, bucket }) {
    const targetBucket = bucket ?? storageBuckets.private;
    const visibilityLabel = resolveVisibilityLabel(targetBucket);
    return withTelemetrySpan('storage.getObjectStream', async () =>
      recordStorageOperation('get_object_stream', visibilityLabel, async () => {
        const response = await this.client.send(
          new GetObjectCommand({
            Bucket: targetBucket,
            Key: key
          })
        );

        return {
          bucket: targetBucket,
          key,
          stream: response.Body,
          contentLength: Number(response.ContentLength ?? 0),
          contentType: response.ContentType,
          metadata: response.Metadata ?? {},
          etag: response.ETag,
          bytes: Number(response.ContentLength ?? 0)
        };
      })
    );
  }

  async copyObject({ sourceBucket, sourceKey, destinationBucket, destinationKey, visibility = 'workspace' }) {
    const targetBucket = destinationBucket ?? this.resolveBucket(visibility);
    return withTelemetrySpan('storage.copyObject', async () =>
      recordStorageOperation('copy_object', visibility, async () => {
        await this.client.send(
          new CopyObjectCommand({
            Bucket: targetBucket,
            Key: destinationKey,
            CopySource: `${sourceBucket}/${encodeURIComponent(sourceKey)}`,
            ACL: visibility === 'public' ? 'public-read' : undefined
          })
        );
        return { bucket: targetBucket, key: destinationKey };
      })
    );
  }
}

class LocalStorageService extends BaseStorageService {
  constructor({ root }) {
    super();
    this.root = root;
    this.sessions = new Map();
    this.initialised = false;
  }

  async ensureInitialised() {
    if (this.initialised) {
      return;
    }
    await Promise.all(
      Object.values(storageBuckets).map((bucket) => ensureDirectory(path.join(this.root, bucket)))
    );
    this.initialised = true;
  }

  sessionKey(token) {
    return token;
  }

  async createUploadUrl({ key, contentType, contentLength, visibility = 'workspace', bucket }) {
    await this.ensureInitialised();
    const targetBucket = this.resolveBucket(visibility, bucket ?? storageBuckets.uploads);
    if (contentLength > storageLimits.maxUploadBytes) {
      const error = new Error(
        `Payload exceeds maximum size of ${Math.round(storageLimits.maxUploadBytes / (1024 * 1024))}MB`
      );
      error.status = 413;
      throw error;
    }

    const token = randomUUID();
    const expiresAt = new Date(Date.now() + storageTtls.uploadMs);
    this.sessions.set(this.sessionKey(token), {
      bucket: targetBucket,
      key,
      contentType,
      contentLength,
      visibility,
      expiresAt
    });

    return {
      bucket: targetBucket,
      key,
      url: `/api/v1/media/uploads/${token}`,
      method: 'POST',
      token,
      expiresAt
    };
  }

  async createDownloadUrl({ key, bucket, visibility = 'workspace' }) {
    await this.ensureInitialised();
    const targetBucket = this.resolveBucket(visibility, bucket ?? storageBuckets.private);
    const url = this.buildPublicUrl({ bucket: targetBucket, key });
    return {
      bucket: targetBucket,
      key,
      url,
      method: 'GET',
      expiresAt: new Date(Date.now() + storageTtls.downloadMs)
    };
  }

  async uploadBuffer({ bucket, key, body, contentType, visibility = 'workspace', metadata = {} }) {
    await this.ensureInitialised();
    const targetBucket = this.resolveBucket(visibility, bucket);
    const filePath = path.join(this.root, targetBucket, normaliseKey(key));
    await ensureDirectory(path.dirname(filePath));
    await fs.writeFile(filePath, body);
    const metaPayload = { contentType, metadata };
    await fs.writeFile(`${filePath}.meta`, JSON.stringify(metaPayload), { flag: 'w' }).catch(() => {});
    return {
      bucket: targetBucket,
      key,
      size: body.length,
      checksum: createHash('sha256').update(body).digest('hex')
    };
  }

  async uploadStream({ bucket, key, stream, contentType, visibility = 'workspace', metadata = {} }) {
    await this.ensureInitialised();
    const targetBucket = this.resolveBucket(visibility, bucket);
    const filePath = path.join(this.root, targetBucket, normaliseKey(key));
    await ensureDirectory(path.dirname(filePath));
    const passThrough = new PassThrough();
    const chunks = [];
    passThrough.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    await pipeline(stream, passThrough, createWriteStream(filePath));
    const buffer = Buffer.concat(chunks);
    const metaPayload = { contentType, metadata };
    await fs.writeFile(`${filePath}.meta`, JSON.stringify(metaPayload), { flag: 'w' }).catch(() => {});
    return {
      bucket: targetBucket,
      key,
      size: buffer.length,
      checksum: createHash('sha256').update(buffer).digest('hex')
    };
  }

  async headObject({ key, bucket }) {
    await this.ensureInitialised();
    const filePath = path.join(this.root, bucket, normaliseKey(key));
    const stat = await fs.stat(filePath);
    let metadata = {};
    try {
      const rawMeta = await fs.readFile(`${filePath}.meta`, 'utf8');
      metadata = JSON.parse(rawMeta);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        logger.warn({ err: error, filePath }, 'Failed to read local object metadata');
      }
    }
    return {
      ContentLength: stat.size,
      LastModified: stat.mtime,
      Metadata: metadata
    };
  }

  async deleteObject({ key, bucket }) {
    await this.ensureInitialised();
    const filePath = path.join(this.root, bucket, normaliseKey(key));
    await fs.unlink(filePath).catch((error) => {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    });
    await fs.unlink(`${filePath}.meta`).catch(() => {});
  }

  async downloadToBuffer({ key, bucket }) {
    await this.ensureInitialised();
    const filePath = path.join(this.root, bucket ?? storageBuckets.private, normaliseKey(key));
    const buffer = await fs.readFile(filePath);
    let contentType = mime.lookup(key) || 'application/octet-stream';
    let metadata = {};
    try {
      const rawMeta = await fs.readFile(`${filePath}.meta`, 'utf8');
      const stored = JSON.parse(rawMeta);
      if (stored.contentType) {
        contentType = stored.contentType;
      }
      if (stored.metadata) {
        metadata = stored.metadata;
      }
    } catch (error) {
      if (error.code !== 'ENOENT') {
        logger.warn({ err: error, filePath }, 'Failed to read local metadata during download');
      }
    }
    return {
      bucket: bucket ?? storageBuckets.private,
      key,
      buffer,
      size: buffer.length,
      contentType,
      metadata
    };
  }

  async getObjectStream({ key, bucket }) {
    await this.ensureInitialised();
    const targetBucket = bucket ?? storageBuckets.private;
    const filePath = path.join(this.root, targetBucket, normaliseKey(key));
    const stream = createReadStream(filePath);
    let contentType = mime.lookup(key) || 'application/octet-stream';
    let metadata = {};
    try {
      const rawMeta = await fs.readFile(`${filePath}.meta`, 'utf8');
      const stored = JSON.parse(rawMeta);
      if (stored.contentType) {
        contentType = stored.contentType;
      }
      if (stored.metadata) {
        metadata = stored.metadata;
      }
    } catch (error) {
      if (error.code !== 'ENOENT') {
        logger.warn({ err: error, filePath }, 'Failed to read local metadata for stream');
      }
    }
    return {
      bucket: targetBucket,
      key,
      stream,
      contentLength: (await fs.stat(filePath)).size,
      contentType,
      metadata
    };
  }

  async copyObject({ sourceBucket, sourceKey, destinationBucket, destinationKey, visibility = 'workspace' }) {
    await this.ensureInitialised();
    const targetBucket = destinationBucket ?? this.resolveBucket(visibility);
    const sourcePath = path.join(this.root, sourceBucket, normaliseKey(sourceKey));
    const destinationPath = path.join(this.root, targetBucket, normaliseKey(destinationKey));
    await ensureDirectory(path.dirname(destinationPath));
    await fs.copyFile(sourcePath, destinationPath);
    await fs.copyFile(`${sourcePath}.meta`, `${destinationPath}.meta`).catch(() => {});
    return { bucket: targetBucket, key: destinationKey };
  }

  async completeDirectUpload(token, buffer, contentType) {
    const session = this.sessions.get(this.sessionKey(token));
    if (!session) {
      const error = new Error('Upload session not found or expired');
      error.status = 410;
      throw error;
    }
    if (session.expiresAt.getTime() < Date.now()) {
      this.sessions.delete(this.sessionKey(token));
      const error = new Error('Upload session expired');
      error.status = 410;
      throw error;
    }

    const targetContentType = contentType || session.contentType || mime.lookup(session.key) || 'application/octet-stream';
    await this.uploadBuffer({
      bucket: session.bucket,
      key: session.key,
      body: buffer,
      contentType: targetContentType,
      visibility: session.visibility
    });

    this.sessions.delete(this.sessionKey(token));
    return {
      bucket: session.bucket,
      key: session.key,
      size: buffer.length,
      contentType: targetContentType,
      checksum: createHash('sha256').update(buffer).digest('hex')
    };
  }
}

class StorageService extends CloudStorageService {}

let storageService;
if (storageDriver === 'local') {
  storageService = new LocalStorageService({ root: localStorageConfig.root });
} else {
  storageService = new StorageService(r2Client);
}

export { CloudStorageService, LocalStorageService, StorageService };

export default storageService;
