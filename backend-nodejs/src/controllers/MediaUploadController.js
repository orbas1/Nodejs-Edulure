import Joi from 'joi';

import storageService from '../services/StorageService.js';
import { env } from '../config/env.js';
import { success } from '../utils/httpResponse.js';
import { storageDescriptor, storageBuckets } from '../config/storage.js';

const KIND_CONFIG = {
  image: { prefix: 'media/images', visibility: 'public' },
  document: { prefix: 'media/documents', visibility: 'public' },
  video: { prefix: 'media/videos', visibility: 'public' },
  audio: { prefix: 'media/audio', visibility: 'public' },
  ebook: { prefix: 'media/ebooks', visibility: 'workspace' }
};

const uploadSchema = Joi.object({
  kind: Joi.string()
    .valid(...Object.keys(KIND_CONFIG))
    .default('image'),
  filename: Joi.string()
    .trim()
    .max(255)
    .custom((value, helpers) => {
      if (!value) {
        return helpers.error('any.required');
      }

      const hasTraversal = /(^|[\\/])\.\.(?:[\\/]|$)/.test(value);
      if (hasTraversal) {
        return helpers.error('string.pathTraversal');
      }

      if (value.includes('/') || value.includes('\\')) {
        return helpers.error('string.path');
      }

      return value;
    }, 'storage key filename sanitiser')
    .messages({
      'string.path': 'Filename must not include directory separators',
      'string.pathTraversal': 'Filename must not include parent directory segments'
    })
    .required(),
  mimeType: Joi.string()
    .trim()
    .pattern(/^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/i)
    .max(120)
    .messages({ 'string.pattern.base': 'mimeType must be a valid media type string (type/subtype)' })
    .required(),
  size: Joi.number().integer().min(1).max(524_288_000).required(),
  checksum: Joi.string().hex().length(64).optional(),
  visibility: Joi.string().valid('public', 'workspace', 'private').optional()
});

function resolveVisibility(kind, override) {
  const config = KIND_CONFIG[kind] ?? KIND_CONFIG.image;
  if (override && ['public', 'workspace', 'private'].includes(override)) {
    return override;
  }
  return config.visibility ?? 'workspace';
}

function resolvePrefix(kind) {
  const config = KIND_CONFIG[kind] ?? KIND_CONFIG.image;
  return config.prefix;
}

export default class MediaUploadController {
  static async requestUpload(req, res, next) {
    try {
      const payload = await uploadSchema.validateAsync(req.body, { abortEarly: false, stripUnknown: true });
      const prefix = resolvePrefix(payload.kind);
      const visibility = resolveVisibility(payload.kind, payload.visibility);
      const bucket = visibility === 'public' ? env.storage.publicBucket : env.storage.privateBucket;
      const key = storageService.generateStorageKey(prefix, payload.filename);

      const upload = await storageService.createUploadUrl({
        key,
        contentType: payload.mimeType,
        contentLength: payload.size,
        visibility,
        bucket
      });

      const retryConfig = env.storage.uploadRetry ?? {};
      const recommendedDelayMs = Number.isFinite(retryConfig.baseDelayMs)
        ? retryConfig.baseDelayMs
        : 2000;
      const maxAttempts = Number.isFinite(retryConfig.maxAttempts)
        ? retryConfig.maxAttempts
        : 4;
      const backoffMultiplier = Number.isFinite(retryConfig.backoffMultiplier)
        ? retryConfig.backoffMultiplier
        : 2;
      const jitterRatio = Number.isFinite(retryConfig.jitterRatio) ? retryConfig.jitterRatio : 0.2;

      return success(res, {
        status: 201,
        message: 'Upload URL generated',
        data: {
          upload: {
            url: upload.url,
            method: upload.method ?? 'PUT',
            headers: { 'Content-Type': payload.mimeType },
            expiresAt: upload.expiresAt,
            token: upload.token ?? null,
            retry: {
              strategy: 'exponential-jitter',
              recommendedDelayMs,
              maxAttempts,
              backoffMultiplier,
              jitterRatio
            }
          },
          file: {
            storageKey: upload.key,
            storageBucket: upload.bucket,
            visibility,
            filename: payload.filename,
            mimeType: payload.mimeType,
            size: payload.size,
            checksum: payload.checksum ?? null,
            publicUrl:
              visibility === 'public'
                ? storageService.buildPublicUrl({ bucket: upload.bucket, key: upload.key })
                : null
          }
        }
      });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }

  static async completeLocalUpload(req, res, next) {
    if (storageDescriptor.driver !== 'local') {
      const error = new Error('Direct upload endpoint is only available in local storage mode');
      error.status = 404;
      return next(error);
    }

    try {
      const token = req.params.token;
      if (!token) {
        const error = new Error('Upload token is required');
        error.status = 400;
        throw error;
      }

      const buffer = req.body;
      if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
        const error = new Error('Upload payload is required');
        error.status = 400;
        throw error;
      }

      const contentType = req.headers['content-type'] ?? 'application/octet-stream';
      const result = await storageService.completeDirectUpload(token, buffer, contentType);

      return success(res, {
        status: 201,
        message: 'File uploaded',
        data: {
          storageKey: result.key,
          storageBucket: result.bucket,
          checksum: result.checksum,
          contentType: result.contentType,
          size: result.size,
          publicUrl:
            result.bucket === storageBuckets.public
              ? storageService.buildPublicUrl({ bucket: result.bucket, key: result.key })
              : null
        }
      });
    } catch (error) {
      return next(error);
    }
  }
}
