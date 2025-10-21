import Joi from 'joi';

import storageService from '../services/StorageService.js';
import { env } from '../config/env.js';
import { success } from '../utils/httpResponse.js';

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

      return success(res, {
        status: 201,
        message: 'Upload URL generated',
        data: {
          upload: {
            url: upload.url,
            method: 'PUT',
            headers: { 'Content-Type': payload.mimeType },
            expiresAt: upload.expiresAt
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
}
