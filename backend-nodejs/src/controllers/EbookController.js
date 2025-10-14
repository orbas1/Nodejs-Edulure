import Joi from 'joi';

import EbookService from '../services/EbookService.js';
import { success } from '../utils/httpResponse.js';

const createSchema = Joi.object({
  assetId: Joi.string().guid({ version: 'uuidv4' }).required(),
  title: Joi.string().trim().max(250).required(),
  subtitle: Joi.string().trim().max(500).allow(null, '').optional(),
  description: Joi.string().max(5000).allow(null, '').optional(),
  authors: Joi.alternatives()
    .try(Joi.array().items(Joi.string().trim().max(120)), Joi.string().trim().max(500))
    .optional(),
  tags: Joi.alternatives()
    .try(Joi.array().items(Joi.string().trim().max(120)), Joi.string().trim().max(500))
    .optional(),
  categories: Joi.alternatives()
    .try(Joi.array().items(Joi.string().trim().max(120)), Joi.string().trim().max(500))
    .optional(),
  languages: Joi.alternatives()
    .try(Joi.array().items(Joi.string().trim().max(5)), Joi.string().trim().max(120))
    .optional(),
  isbn: Joi.string().trim().max(32).allow(null, '').optional(),
  readingTimeMinutes: Joi.number().integer().min(0).max(100000).optional(),
  price: Joi.object({
    currency: Joi.string().length(3).uppercase().required(),
    amount: Joi.number().precision(2).min(0).required()
  }).required(),
  metadata: Joi.object().optional(),
  status: Joi.string().valid('draft', 'review', 'published', 'archived').optional(),
  isPublic: Joi.boolean().optional(),
  releaseAt: Joi.date().iso().allow(null).optional()
});

const updateSchema = Joi.object({
  title: Joi.string().trim().max(250).optional(),
  subtitle: Joi.string().trim().max(500).allow(null, '').optional(),
  description: Joi.string().max(5000).allow(null, '').optional(),
  authors: Joi.alternatives()
    .try(Joi.array().items(Joi.string().trim().max(120)), Joi.string().trim().max(500))
    .optional(),
  tags: Joi.alternatives()
    .try(Joi.array().items(Joi.string().trim().max(120)), Joi.string().trim().max(500))
    .optional(),
  categories: Joi.alternatives()
    .try(Joi.array().items(Joi.string().trim().max(120)), Joi.string().trim().max(500))
    .optional(),
  languages: Joi.alternatives()
    .try(Joi.array().items(Joi.string().trim().max(5)), Joi.string().trim().max(120))
    .optional(),
  isbn: Joi.string().trim().max(32).allow(null, '').optional(),
  readingTimeMinutes: Joi.number().integer().min(0).max(100000).optional(),
  price: Joi.object({
    currency: Joi.string().length(3).uppercase().required(),
    amount: Joi.number().precision(2).min(0).required()
  }).optional(),
  metadata: Joi.object().optional(),
  status: Joi.string().valid('draft', 'review', 'published', 'archived').optional(),
  isPublic: Joi.boolean().optional(),
  releaseAt: Joi.date().iso().allow(null).optional()
});

const stateSchema = Joi.object({
  status: Joi.string().valid('draft', 'review', 'published', 'archived').optional(),
  isPublic: Joi.boolean().optional(),
  releaseAt: Joi.date().iso().allow(null).optional()
});

const catalogueQuerySchema = Joi.object({
  status: Joi.string().valid('draft', 'review', 'published', 'archived').optional(),
  search: Joi.string().trim().max(250).optional(),
  limit: Joi.number().integer().min(1).max(200).optional(),
  offset: Joi.number().integer().min(0).optional()
});

const marketplaceQuerySchema = Joi.object({
  search: Joi.string().trim().max(250).optional(),
  categories: Joi.string().optional(),
  tags: Joi.string().optional(),
  languages: Joi.string().optional(),
  minPrice: Joi.number().precision(2).min(0).optional(),
  maxPrice: Joi.number().precision(2).min(0).optional(),
  limit: Joi.number().integer().min(1).max(200).optional(),
  offset: Joi.number().integer().min(0).optional()
});

const purchaseSchema = Joi.object({
  provider: Joi.string().valid('stripe', 'paypal').required(),
  couponCode: Joi.string().trim().uppercase().max(32).optional(),
  returnUrl: Joi.when('provider', {
    is: 'paypal',
    then: Joi.string().uri().required(),
    otherwise: Joi.string().uri().optional()
  }),
  cancelUrl: Joi.when('provider', {
    is: 'paypal',
    then: Joi.string().uri().required(),
    otherwise: Joi.string().uri().optional()
  }),
  brandName: Joi.string().max(120).optional(),
  receiptEmail: Joi.string().email().optional()
});

function normaliseArray(value) {
  if (!value) return undefined;
  if (Array.isArray(value)) return value;
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function toCents(amount) {
  const parsed = typeof amount === 'string' ? Number.parseFloat(amount) : Number(amount);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }
  return Math.round(parsed * 100);
}

export default class EbookController {
  static async create(req, res, next) {
    try {
      const payload = await createSchema.validateAsync(req.body, { abortEarly: false, stripUnknown: true });
      const priceAmount = toCents(payload.price.amount);
      const ebook = await EbookService.createListing(req.user.id, {
        ...payload,
        priceCurrency: payload.price.currency,
        priceAmount,
        authors: normaliseArray(payload.authors),
        tags: normaliseArray(payload.tags),
        categories: normaliseArray(payload.categories),
        languages: normaliseArray(payload.languages),
        releaseAt: payload.releaseAt ? new Date(payload.releaseAt) : null
      });

      return success(res, { data: ebook, message: 'Ebook listing created', status: 201 });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }

  static async update(req, res, next) {
    try {
      const payload = await updateSchema.validateAsync(req.body, { abortEarly: false, stripUnknown: true });
      const priceAmount = payload.price ? toCents(payload.price.amount) : undefined;
      const ebook = await EbookService.updateListing(req.user.id, req.params.ebookId, {
        ...payload,
        priceCurrency: payload.price?.currency,
        priceAmount,
        authors: normaliseArray(payload.authors),
        tags: normaliseArray(payload.tags),
        categories: normaliseArray(payload.categories),
        languages: normaliseArray(payload.languages),
        releaseAt: payload.releaseAt ? new Date(payload.releaseAt) : undefined
      });

      return success(res, { data: ebook, message: 'Ebook listing updated' });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }

  static async updatePublicationState(req, res, next) {
    try {
      const payload = await stateSchema.validateAsync(req.body ?? {}, { abortEarly: false, stripUnknown: true });
      const ebook = await EbookService.setPublicationState(req.user.id, req.params.ebookId, {
        ...payload,
        releaseAt: payload.releaseAt ? new Date(payload.releaseAt) : undefined
      });
      return success(res, { data: ebook, message: 'Ebook state updated' });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }

  static async catalogue(req, res, next) {
    try {
      const query = await catalogueQuerySchema.validateAsync(req.query, { abortEarly: false, stripUnknown: true });
      const result = await EbookService.listInstructorCatalogue(req.user.id, query);
      return success(res, { data: result, message: 'Ebook catalogue fetched' });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }

  static async marketplace(req, res, next) {
    try {
      const query = await marketplaceQuerySchema.validateAsync(req.query, { abortEarly: false, stripUnknown: true });
      const categories = normaliseArray(query.categories);
      const tags = normaliseArray(query.tags);
      const languages = normaliseArray(query.languages);
      const result = await EbookService.listMarketplace({
        ...query,
        categories,
        tags,
        languages,
        minPrice: query.minPrice !== undefined ? toCents(query.minPrice) : undefined,
        maxPrice: query.maxPrice !== undefined ? toCents(query.maxPrice) : undefined
      });
      return success(res, { data: result, message: 'Marketplace catalogue fetched' });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }

  static async detail(req, res, next) {
    try {
      const ebook = await EbookService.getEbookDetail(req.params.slug);
      return success(res, { data: ebook, message: 'Ebook fetched' });
    } catch (error) {
      return next(error);
    }
  }

  static async purchaseIntent(req, res, next) {
    try {
      const payload = await purchaseSchema.validateAsync(req.body, { abortEarly: false, stripUnknown: true });
      const result = await EbookService.createPurchaseIntent(req.user.id, req.params.ebookId, payload);
      return success(res, { data: result, message: 'Purchase intent created', status: 201 });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }
}
