import Joi from 'joi';

import AssetService from '../services/AssetService.js';
import { success } from '../utils/httpResponse.js';

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

const progressSchema = Joi.object({
  progressPercent: Joi.number().min(0).max(100).required(),
  lastLocation: Joi.string().allow(null, '').default(null),
  timeSpentSeconds: Joi.number().integer().min(0).default(0)
});

const analyticsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  pageSize: Joi.number().integer().min(1).max(100).default(20),
  status: Joi.string().valid('uploading', 'processing', 'ready', 'failed', 'archived').optional(),
  type: Joi.string().valid('powerpoint', 'ebook', 'pdf', 'document', 'video').optional()
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
}
