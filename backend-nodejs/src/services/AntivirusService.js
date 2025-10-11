import { PassThrough } from 'node:stream';

import clamav from 'clamav.js';

import { env } from '../config/env.js';
import logger from '../config/logger.js';
import { recordAntivirusScan } from '../observability/metrics.js';
import { withTelemetrySpan } from '../observability/requestContext.js';
import storageService from './StorageService.js';

const DEFAULT_ENGINE = 'ClamAV';

function isTruthy(value) {
  if (value === true) return true;
  if (typeof value === 'string') {
    const normalised = value.trim().toLowerCase();
    return ['1', 'true', 'yes', 'on'].includes(normalised);
  }
  return false;
}

function parseSignature(candidate) {
  if (!candidate) {
    return null;
  }

  const source = typeof candidate === 'string' ? candidate : candidate.message ?? '';
  if (!source) {
    return null;
  }

  const withoutPrefix = source.includes(':') ? source.split(':').pop() ?? source : source;
  return withoutPrefix.replace(/FOUND$/i, '').replace(/FOUND\s*$/i, '').trim() || source.trim();
}

function createResult({
  status,
  bytesScanned,
  durationSeconds = 0,
  signature = null,
  reason = null,
  bucket,
  key,
  cached = false
}) {
  return {
    status,
    scannedAt: new Date().toISOString(),
    engine: DEFAULT_ENGINE,
    signature,
    reason,
    bytesScanned,
    durationSeconds,
    bucket,
    key,
    cached
  };
}

export class AntivirusService {
  constructor(config, storage = storageService) {
    this.storage = storage;
    this.cache = new Map();
    this.updateConfig(config ?? env.antivirus);
  }

  updateConfig(config) {
    this.config = {
      enabled: config?.enabled ?? false,
      host: config?.host ?? '127.0.0.1',
      port: config?.port ?? 3310,
      timeoutMs: config?.timeoutMs ?? 20000,
      maxFileSizeBytes: config?.maxFileSizeBytes ?? 500 * 1024 * 1024,
      failOpen: config?.failOpen ?? false,
      cacheTtlMs: config?.cacheTtlMs ?? 0,
      skipMetadataTag: config?.skipMetadataTag ?? 'edulure-skip-scan',
      quarantineBucket: config?.quarantineBucket ?? env.storage.privateBucket
    };
    this.cache.clear();
  }

  clearCache() {
    this.cache.clear();
  }

  get enabled() {
    return Boolean(this.config?.enabled);
  }

  buildCacheKey(bucket, key, etag) {
    if (!bucket || !key || !etag) {
      return null;
    }
    return `${bucket}:${key}:${etag}`;
  }

  async scanObject({ bucket, key, sizeBytes, metadata = {}, assetId, userId, mimeType }) {
    const sourceBucket = bucket ?? env.storage.uploadsBucket;

    if (!this.enabled) {
      const result = createResult({
        status: 'skipped',
        bytesScanned: sizeBytes ?? 0,
        reason: 'scanner-disabled',
        bucket: sourceBucket,
        key
      });
      recordAntivirusScan({ ...result });
      return result;
    }

    if (isTruthy(metadata?.[this.config.skipMetadataTag])) {
      const result = createResult({
        status: 'skipped',
        bytesScanned: sizeBytes ?? 0,
        reason: 'metadata-skip-tag',
        bucket: sourceBucket,
        key
      });
      recordAntivirusScan({ ...result });
      return result;
    }

    if (sizeBytes && sizeBytes > this.config.maxFileSizeBytes) {
      const message = `Upload exceeds antivirus scanning limit (${sizeBytes} > ${this.config.maxFileSizeBytes} bytes)`;
      if (this.config.failOpen) {
        logger.warn({ bucket: sourceBucket, key, sizeBytes }, `${message}. Allowing via fail-open policy.`);
        const result = createResult({
          status: 'skipped',
          bytesScanned: sizeBytes,
          reason: 'oversized-fail-open',
          bucket: sourceBucket,
          key
        });
        recordAntivirusScan({ ...result });
        return result;
      }

      const error = new Error(message);
      error.code = 'ANTIVIRUS_PAYLOAD_TOO_LARGE';
      error.status = 422;
      throw error;
    }

    const { stream, contentLength, metadata: objectMetadata, etag, contentType } = await this.storage.getObjectStream({
      bucket: sourceBucket,
      key
    });

    const bytesToScan = sizeBytes ?? Number(contentLength ?? 0);
    const cacheKey = this.buildCacheKey(sourceBucket, key, etag);
    const cached = cacheKey ? this.cache.get(cacheKey) : null;
    const now = Date.now();
    if (cached && cached.expiresAt > now) {
      const result = { ...cached.result, cached: true };
      recordAntivirusScan({ ...result });
      return result;
    }

    const mergedMetadata = { ...objectMetadata, ...metadata };
    const scanResult = await this.scanStream(stream, {
      bucket: sourceBucket,
      key,
      bytes: bytesToScan,
      metadata: mergedMetadata,
      assetId,
      userId,
      mimeType: mimeType ?? contentType ?? mergedMetadata['content-type']
    });

    if (cacheKey && this.config.cacheTtlMs > 0 && scanResult.status !== 'infected') {
      this.cache.set(cacheKey, {
        expiresAt: now + this.config.cacheTtlMs,
        result: scanResult
      });
    }

    return scanResult;
  }

  async scanStream(stream, context = {}) {
    return withTelemetrySpan('antivirus.scan', async () => {
      const start = process.hrtime.bigint();
      const totalBytes = context.bytes ?? 0;

      return new Promise((resolve, reject) => {
        const scanner = clamav.createScanner(this.config.port, this.config.host);
        const timeout = setTimeout(() => {
          stream.destroy();
          const error = new Error('Antivirus scan timed out');
          error.code = 'ANTIVIRUS_TIMEOUT';
          this.handleScanFailure(error, context, totalBytes, start, resolve, reject);
        }, this.config.timeoutMs);

        const passThrough = new PassThrough();
        let consumedBytes = 0;

        passThrough.on('data', (chunk) => {
          consumedBytes += chunk.length;
        });

        const cleanup = () => {
          clearTimeout(timeout);
        };

        const onCompletion = (result) => {
          cleanup();
          resolve(result);
        };

        passThrough.on('error', (error) => {
          this.handleScanFailure(error, context, consumedBytes || totalBytes, start, resolve, reject);
          cleanup();
        });

        stream.on('error', (error) => {
          this.handleScanFailure(error, context, consumedBytes || totalBytes, start, resolve, reject);
          cleanup();
        });

        scanner.scan(passThrough, (err, _object, malicious) => {
          const durationSeconds = Number(process.hrtime.bigint() - start) / 1e9;
          const bytes = consumedBytes || totalBytes;

          if (err && !malicious) {
            this.handleScanFailure(err, context, bytes, start, resolve, reject, durationSeconds);
            return;
          }

          if (malicious || (err && malicious)) {
            const signature = parseSignature(malicious ?? err);
            const result = createResult({
              status: 'infected',
              bytesScanned: bytes,
              signature,
              bucket: context.bucket,
              key: context.key,
              durationSeconds
            });
            recordAntivirusScan({ ...result });
            logger.warn(
              {
                bucket: context.bucket,
                key: context.key,
                signature,
                assetId: context.assetId,
                userId: context.userId
              },
              'Antivirus scan detected malicious content'
            );
            onCompletion(result);
            return;
          }

          const result = createResult({
            status: 'clean',
            bytesScanned: bytes,
            bucket: context.bucket,
            key: context.key,
            durationSeconds
          });
          recordAntivirusScan({ ...result });
          onCompletion(result);
        });

        stream.pipe(passThrough);
      });
    });
  }

  handleScanFailure(error, context, bytes, start, resolve, reject, durationSecondsOverride) {
    const durationSeconds =
      typeof durationSecondsOverride === 'number'
        ? durationSecondsOverride
        : Number(process.hrtime.bigint() - start) / 1e9;

    if (this.config.failOpen) {
      logger.error(
        {
          err: error,
          bucket: context.bucket,
          key: context.key,
          assetId: context.assetId,
          userId: context.userId
        },
        'Antivirus scan failed but fail-open policy allows continuation'
      );
      const result = createResult({
        status: 'skipped',
        bytesScanned: bytes,
        reason: 'scanner-unavailable',
        bucket: context.bucket,
        key: context.key,
        durationSeconds
      });
      recordAntivirusScan({ ...result });
      resolve(result);
      return;
    }

    logger.error(
      {
        err: error,
        bucket: context.bucket,
        key: context.key,
        assetId: context.assetId,
        userId: context.userId
      },
      'Antivirus scan failed'
    );

    const failure = new Error('Antivirus scan failed');
    failure.code = 'ANTIVIRUS_SCAN_FAILED';
    failure.status = 502;
    failure.cause = error;
    recordAntivirusScan({
      status: 'error',
      scannedAt: new Date().toISOString(),
      engine: DEFAULT_ENGINE,
      bytesScanned: bytes,
      bucket: context.bucket,
      key: context.key,
      durationSeconds,
      reason: error.message
    });
    reject(failure);
  }
}

const antivirusService = new AntivirusService(env.antivirus, storageService);

export default antivirusService;
