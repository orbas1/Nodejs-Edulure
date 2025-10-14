import Joi from 'joi';

import BlogService from '../services/BlogService.js';
import { paginated, success } from '../utils/httpResponse.js';

const listSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  pageSize: Joi.number().integer().min(1).max(50).default(12),
  category: Joi.string().trim().max(160).optional(),
  tags: Joi.alternatives().try(
    Joi.array().items(Joi.string().trim().max(160)).default([]),
    Joi.string()
      .trim()
      .max(400)
      .custom((value, helpers) => value.split(',').map((tag) => tag.trim()).filter(Boolean))
  ),
  search: Joi.string().trim().max(200).allow('').optional()
});

export default class BlogController {
  static async list(req, res, next) {
    try {
      const query = await listSchema.validateAsync(req.query, { abortEarly: false, stripUnknown: true });
      const tagSlugs = Array.isArray(query.tags) ? query.tags : [];
      const result = await BlogService.listPublicPosts({
        page: query.page,
        pageSize: query.pageSize,
        categorySlug: query.category,
        tagSlugs,
        search: query.search
      });
      return paginated(res, {
        data: result.data,
        pagination: result.pagination,
        meta: { category: query.category ?? null, tags: tagSlugs },
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

  static async show(req, res, next) {
    try {
      const post = await BlogService.getPublicPost(req.params.slug);
      return success(res, { data: post, message: 'Blog post resolved' });
    } catch (error) {
      return next(error);
    }
  }

  static async categories(_req, res, next) {
    try {
      const categories = await BlogService.listCategories();
      return success(res, { data: categories });
    } catch (error) {
      return next(error);
    }
  }

  static async tags(_req, res, next) {
    try {
      const tags = await BlogService.listTags();
      return success(res, { data: tags });
    } catch (error) {
      return next(error);
    }
  }
}
