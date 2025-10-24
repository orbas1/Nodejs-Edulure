import Joi from 'joi';

import AssetService from '../services/AssetService.js';
import MarketingContentService from '../services/MarketingContentService.js';
import { success } from '../utils/httpResponse.js';
import { LEARNING_CLUSTER_KEYS } from '../utils/learningClusters.js';

const uploadSessionSchema = Joi.object({
  type: Joi.string().valid('powerpoint', 'ebook', 'pdf', 'document', 'video').required(),
  filename: Joi.string().trim().max(255).required(),
  mimeType: Joi.string().trim().max(120).required(),
  size: Joi.number().integer().min(1).required(),
  checksum: Joi.string().alphanum().length(64).optional(),
  visibility: Joi.string().valid('workspace', 'private', 'public').default('workspace')
});

const confirmUploadSchema = Joi.object({
  checksum: Joi.string().alphanum().length(64).optional(),
  metadata: Joi.object().default({})
});

const stringArrayOrScalar = (limit) =>
  Joi.alternatives()
    .try(Joi.array().items(Joi.string().trim().max(60)).max(limit), Joi.string().trim().max(60))
    .optional();

const marketingQuerySchema = Joi.object({
  types: stringArrayOrScalar(12),
  surfaces: stringArrayOrScalar(12),
  variants: stringArrayOrScalar(6),
  email: Joi.string().trim().email().optional()
});

const marketingLeadSchema = Joi.object({
  email: Joi.string().trim().email().max(180).required(),
  fullName: Joi.string().trim().max(200).allow(null, ''),
  company: Joi.string().trim().max(200).allow(null, ''),
  persona: Joi.string().trim().max(120).allow(null, ''),
  goal: Joi.string().trim().max(360).allow(null, ''),
  ctaSource: Joi.string().trim().max(120).allow(null, ''),
  blockSlug: Joi.string().trim().max(120).allow(null, ''),
  metadata: Joi.object().default({})
});

const progressSchema = Joi.object({
  progressPercent: Joi.number().min(0).max(100).required(),
  lastLocation: Joi.string().allow(null, '').default(null),
  timeSpentSeconds: Joi.number().integer().min(0).default(0)
});

const analyticsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  pageSize: Joi.number().integer().min(1).max(100).default(20),
  status: Joi.string()
    .valid('uploading', 'uploaded', 'processing', 'ready', 'failed', 'archived', 'quarantined')
    .optional(),
  type: Joi.string().valid('powerpoint', 'ebook', 'pdf', 'document', 'video').optional()
});

const metadataUpdateSchema = Joi.object({
  title: Joi.string().trim().max(140).allow(null, '').optional(),
  description: Joi.string().trim().max(1500).allow(null, '').optional(),
  categories: Joi.array()
    .items(Joi.string().trim().max(40))
    .max(12)
    .default([]),
  tags: Joi.array()
    .items(Joi.string().trim().max(32))
    .max(24)
    .default([]),
  coverImage: Joi.object({
    url: Joi.string().uri({ scheme: ['https'] }).allow(null, '').default(null),
    alt: Joi.string().trim().max(120).allow(null, '').default(null)
  })
    .default({})
    .optional(),
  gallery: Joi.array()
    .items(
      Joi.object({
        url: Joi.string().uri({ scheme: ['https'] }).required(),
        caption: Joi.string().trim().max(160).allow(null, '').default(null),
        kind: Joi.string().valid('image', 'video').default('image')
      })
    )
    .max(8)
    .default([]),
  showcase: Joi.object({
    headline: Joi.string().trim().max(120).allow(null, '').default(null),
    subheadline: Joi.string().trim().max(200).allow(null, '').default(null),
    videoUrl: Joi.string().uri({ scheme: ['https'] }).allow(null, '').default(null),
    videoPosterUrl: Joi.string().uri({ scheme: ['https'] }).allow(null, '').default(null),
    callToActionLabel: Joi.string().trim().max(40).allow(null, '').default(null),
    callToActionUrl: Joi.string().uri({ scheme: ['https'] }).allow(null, '').default(null),
    badge: Joi.string().trim().max(32).allow(null, '').default(null)
  })
    .default({})
    .optional(),
  visibility: Joi.string().valid('workspace', 'private', 'public').optional(),
  featureFlags: Joi.object({ showcasePinned: Joi.boolean().default(false) }).default({}),
  clusterKey: Joi.string()
    .valid(...LEARNING_CLUSTER_KEYS)
    .optional()
});

export default class ContentController {
  static async createUploadSession(req, res, next) {
    try {
      const payload = await uploadSessionSchema.validateAsync(req.body, { abortEarly: false, stripUnknown: true });
      const result = await AssetService.createUploadSession({
        ...payload,
        userId: req.user.id
      });
      return success(res, {
        data: result,
        message: 'Upload session created',
        status: 201
      });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((d) => d.message);
      }
      return next(error);
    }
  }

  static async confirmUpload(req, res, next) {
    try {
      const payload = await confirmUploadSchema.validateAsync(req.body, { abortEarly: false, stripUnknown: true });
      const asset = await AssetService.confirmUpload(req.params.assetId, payload, req.user);
      return success(res, {
        data: asset,
        message: 'Asset queued for processing'
      });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((d) => d.message);
      }
      return next(error);
    }
  }

  static async list(req, res, next) {
    try {
      const query = await analyticsQuerySchema.validateAsync(req.query, { abortEarly: false, stripUnknown: true });
      const assets = await AssetService.listAssets({
        userId: req.user.id,
        role: req.user.role,
        page: query.page,
        pageSize: query.pageSize,
        status: query.status,
        type: query.type
      });
      return success(res, {
        data: assets.data,
        meta: { pagination: assets.pagination }
      });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((d) => d.message);
      }
      return next(error);
    }
  }

  static async show(req, res, next) {
    try {
      const asset = await AssetService.getAsset(req.params.assetId);
      return success(res, { data: asset });
    } catch (error) {
      return next(error);
    }
  }

  static async viewerToken(req, res, next) {
    try {
      const token = await AssetService.issueViewerToken(req.params.assetId, req.user);
      return success(res, { data: token });
    } catch (error) {
      return next(error);
    }
  }

  static async recordEvent(req, res, next) {
    try {
      const schema = Joi.object({
        eventType: Joi.string().valid('view', 'download', 'progress', 'share').required(),
        metadata: Joi.object().default({})
      });
      const payload = await schema.validateAsync(req.body, { abortEarly: false, stripUnknown: true });
      await AssetService.recordEvent(req.params.assetId, payload.eventType, payload.metadata, req.user);
      return success(res, { data: null, message: 'Event recorded' });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((d) => d.message);
      }
      return next(error);
    }
  }

  static async updateProgress(req, res, next) {
    try {
      const payload = await progressSchema.validateAsync(req.body, { abortEarly: false, stripUnknown: true });
      await AssetService.updateProgress(req.params.assetId, req.user, payload);
      return success(res, { data: null, message: 'Progress updated' });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((d) => d.message);
      }
      return next(error);
    }
  }

  static async getProgress(req, res, next) {
    try {
      const progress = await AssetService.getProgress(req.params.assetId, req.user);
      return success(res, { data: progress });
    } catch (error) {
      return next(error);
    }
  }

  static async analytics(req, res, next) {
    try {
      const analytics = await AssetService.analytics(req.params.assetId);
      return success(res, { data: analytics });
    } catch (error) {
      return next(error);
    }
  }

  static async updateMetadata(req, res, next) {
    try {
      const payload = await metadataUpdateSchema.validateAsync(req.body, { abortEarly: false, stripUnknown: true });
      const asset = await AssetService.updateMetadata(req.params.assetId, payload, req.user);
      return success(res, { data: asset, message: 'Material profile updated' });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((d) => d.message);
      }
      return next(error);
    }
  }

  static async listMarketingBlocks(req, res, next) {
    try {
      const query = await marketingQuerySchema.validateAsync(req.query ?? {}, {
        abortEarly: false,
        stripUnknown: true
      });
      const types = query.types === undefined ? [] : query.types;
      const surfaces = query.surfaces === undefined ? [] : query.surfaces;
      const variants = query.variants === undefined ? [] : query.variants;
      const content = await MarketingContentService.getLandingContent({
        types,
        email: query.email ?? undefined,
        surfaces,
        variants
      });
      return success(res, { data: content, message: 'Marketing content fetched' });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((d) => d.message);
      }
      return next(error);
    }
  }

  static async createMarketingLead(req, res, next) {
    try {
      const payload = await marketingLeadSchema.validateAsync(req.body ?? {}, {
        abortEarly: false,
        stripUnknown: true
      });
      const lead = await MarketingContentService.createMarketingLead(payload);
      return success(res, {
        data: lead,
        message: 'Lead captured',
        status: 201
      });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((d) => d.message);
      }
      return next(error);
    }
  }
}
