import Joi from 'joi';

import BlogService from '../services/BlogService.js';
import { paginated, success } from '../utils/httpResponse.js';

const tagSchema = Joi.object({
  slug: Joi.string().trim().max(160).optional(),
  name: Joi.string().trim().max(160).required(),
  description: Joi.string().trim().max(255).allow('', null).default(null)
});

const mediaSchema = Joi.object({
  mediaUrl: Joi.string().uri().max(500).required(),
  altText: Joi.string().trim().max(160).allow('', null).default(null),
  mediaType: Joi.string().trim().max(60).default('image'),
  displayOrder: Joi.number().integer().min(0).optional(),
  metadata: Joi.object().default({})
});

const categorySchema = Joi.object({
  slug: Joi.string().trim().max(160).optional(),
  name: Joi.string().trim().max(160).required(),
  description: Joi.string().trim().max(400).allow('', null).default(null),
  displayOrder: Joi.number().integer().min(0).default(0),
  isFeatured: Joi.boolean().default(false)
});

const createSchema = Joi.object({
  title: Joi.string().trim().max(240).required(),
  slug: Joi.string().trim().max(200).optional(),
  excerpt: Joi.string().trim().max(500).allow('', null).default(null),
  content: Joi.string().trim().required(),
  status: Joi.string().valid('draft', 'scheduled', 'published', 'archived').default('draft'),
  publishedAt: Joi.date().optional(),
  scheduledFor: Joi.date().optional(),
  readingTimeMinutes: Joi.number().integer().min(1).max(90).default(5),
  isFeatured: Joi.boolean().default(false),
  metadata: Joi.object().default({}),
  categoryId: Joi.number().integer().min(1).optional(),
  category: categorySchema.optional(),
  tags: Joi.array().items(tagSchema).default([]),
  tagIds: Joi.array().items(Joi.number().integer().min(1)).default([]),
  media: Joi.array().items(mediaSchema).default([])
});

const updateSchema = createSchema.fork(
  ['title', 'content'],
  (schema) => schema.optional()
).append({
  status: Joi.string().valid('draft', 'scheduled', 'published', 'archived').optional()
});

const listSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  pageSize: Joi.number().integer().min(1).max(50).default(20),
  status: Joi.string().valid('draft', 'scheduled', 'published', 'archived').optional(),
  search: Joi.string().trim().max(200).allow('', null).optional(),
  category: Joi.string().trim().max(160).optional(),
  tags: Joi.alternatives().try(
    Joi.array().items(Joi.string().trim().max(160)).default([]),
    Joi.string()
      .trim()
      .max(400)
      .custom((value) => value.split(',').map((tag) => tag.trim()).filter(Boolean))
  )
});

export default class AdminBlogController {
  static async list(req, res, next) {
    try {
      const query = await listSchema.validateAsync(req.query, { abortEarly: false, stripUnknown: true });
      const tagSlugs = Array.isArray(query.tags) ? query.tags : [];
      const result = await BlogService.listAdminPosts({
        page: query.page,
        pageSize: query.pageSize,
        status: query.status,
        search: query.search,
        categorySlug: query.category,
        tagSlugs
      });
      return paginated(res, {
        data: result.data,
        pagination: result.pagination,
        meta: { status: query.status ?? null, category: query.category ?? null, tags: tagSlugs },
        message: 'Blog posts resolved'
      });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }

  static async create(req, res, next) {
    try {
      const payload = await createSchema.validateAsync(req.body, { abortEarly: false, stripUnknown: true });
      const post = await BlogService.createPost(payload, { authorId: req.user.id });
      return success(res, { data: post, status: 201, message: 'Blog post created' });
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
      const post = await BlogService.updatePost(Number(req.params.postId), payload);
      return success(res, { data: post, message: 'Blog post updated' });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }
}
