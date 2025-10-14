import slugify from 'slugify';

import db from '../config/database.js';
import BlogPostModel from '../models/BlogPostModel.js';
import BlogCategoryModel from '../models/BlogCategoryModel.js';
import BlogTagModel from '../models/BlogTagModel.js';

const VALID_STATUSES = new Set(['draft', 'scheduled', 'published', 'archived']);

function normalisePage(value, fallback = 1) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

function normalisePageSize(value, fallback = 12) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(Math.floor(parsed), 50);
}

function resolvePublicationWindows(status, payload) {
  if (status === 'published') {
    const publishedAt = payload?.publishedAt ? new Date(payload.publishedAt) : new Date();
    if (Number.isNaN(publishedAt.getTime())) {
      throw Object.assign(new Error('Published posts require a valid publication timestamp.'), { status: 422 });
    }
    return { publishedAt, scheduledFor: null };
  }
  if (status === 'scheduled') {
    const scheduled = payload?.scheduledFor ? new Date(payload.scheduledFor) : null;
    if (!scheduled || Number.isNaN(scheduled.getTime())) {
      throw Object.assign(new Error('Scheduled posts require a future scheduled date.'), { status: 422 });
    }
    if (scheduled.getTime() <= Date.now()) {
      throw Object.assign(new Error('Scheduled posts must have a date in the future.'), { status: 422 });
    }
    return { publishedAt: null, scheduledFor: scheduled };
  }
  return { publishedAt: null, scheduledFor: null };
}

function applyFilters(query, { status, categoryId, tagIds, search }) {
  if (status) {
    query.where('blog_posts.status', status);
  }
  if (categoryId) {
    query.where('blog_posts.category_id', categoryId);
  }
  if (tagIds?.length) {
    query.whereIn('blog_posts.id', function filterByTags() {
      this.select('post_id')
        .from('blog_post_tags')
        .whereIn('tag_id', tagIds);
    });
  }
  if (search) {
    query.where((builder) => {
      builder
        .whereILike('blog_posts.title', `%${search}%`)
        .orWhereILike('blog_posts.excerpt', `%${search}%`)
        .orWhereILike('blog_posts.content', `%${search}%`);
    });
  }
  return query;
}

export default class BlogService {
  static async listPublicPosts({ page = 1, pageSize = 12, categorySlug, tagSlugs = [], search } = {}) {
    const resolvedPage = normalisePage(page);
    const resolvedPageSize = normalisePageSize(pageSize);
    const offset = (resolvedPage - 1) * resolvedPageSize;

    const connection = db;
    let categoryId = null;
    if (categorySlug) {
      const category = await BlogCategoryModel.findBySlug(categorySlug, connection);
      if (!category) {
        throw Object.assign(new Error('Category not found'), { status: 404 });
      }
      categoryId = category.id;
    }

    let tagIds = [];
    if (tagSlugs?.length) {
      const tags = await BlogTagModel.findBySlugs(tagSlugs, connection);
      if (!tags.length) {
        return {
          data: [],
          pagination: { page: resolvedPage, pageSize: resolvedPageSize, total: 0, totalPages: 0 }
        };
      }
      tagIds = tags.map((tag) => tag.id);
    }

    const filters = {
      status: 'published',
      categoryId,
      tagIds,
      search: search?.trim() ? search.trim() : undefined
    };

    const baseQuery = applyFilters(connection('blog_posts'), filters);
    const [{ count }] = await baseQuery.clone().count({ count: '*' });
    const total = Number(count ?? 0);

    const posts = await BlogPostModel.list(
      {
        status: 'published',
        categoryId,
        tagIds,
        search: filters.search,
        limit: resolvedPageSize,
        offset
      },
      connection
    );

    return {
      data: posts,
      pagination: {
        page: resolvedPage,
        pageSize: resolvedPageSize,
        total,
        totalPages: Math.ceil(total / resolvedPageSize)
      }
    };
  }

  static async getPublicPost(slug) {
    const post = await BlogPostModel.findBySlug(slug);
    if (!post || post.status !== 'published') {
      throw Object.assign(new Error('Blog post not found'), { status: 404 });
    }
    await BlogPostModel.recordView(post.id);
    return BlogPostModel.findById(post.id);
  }

  static async getDashboardHighlights({ limit = 5 } = {}) {
    const posts = await BlogPostModel.list({ status: 'published', limit });
    return posts.map((post) => ({
      id: post.id,
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt,
      publishedAt: post.publishedAt,
      readingTimeMinutes: post.readingTimeMinutes,
      category: post.category,
      tags: post.tags,
      heroImage: post.media?.[0]?.mediaUrl ?? null
    }));
  }

  static async listAdminPosts({ page = 1, pageSize = 20, status, search, categorySlug, tagSlugs } = {}) {
    const resolvedPage = normalisePage(page);
    const resolvedPageSize = normalisePageSize(pageSize, 20);
    const offset = (resolvedPage - 1) * resolvedPageSize;

    let categoryId = null;
    if (categorySlug) {
      const category = await BlogCategoryModel.findBySlug(categorySlug);
      categoryId = category?.id ?? null;
    }

    let tagIds = [];
    if (tagSlugs?.length) {
      const tags = await BlogTagModel.findBySlugs(tagSlugs);
      tagIds = tags.map((tag) => tag.id);
    }

    const filters = {
      status: status && VALID_STATUSES.has(status) ? status : undefined,
      categoryId,
      tagIds,
      search: search?.trim() || undefined
    };

    const baseQuery = applyFilters(db('blog_posts'), filters);
    const [{ count }] = await baseQuery.clone().count({ count: '*' });
    const total = Number(count ?? 0);

    const posts = await BlogPostModel.list(
      {
        status: filters.status,
        categoryId,
        tagIds,
        search: filters.search,
        limit: resolvedPageSize,
        offset
      },
      db
    );

    return {
      data: posts,
      pagination: {
        page: resolvedPage,
        pageSize: resolvedPageSize,
        total,
        totalPages: Math.ceil(total / resolvedPageSize)
      }
    };
  }

  static async createPost(payload, { authorId }) {
    if (!payload.title || !payload.content) {
      throw Object.assign(new Error('Title and content are required'), { status: 422 });
    }

    const status = payload.status ?? 'draft';
    if (!VALID_STATUSES.has(status)) {
      throw Object.assign(new Error('Invalid blog status'), { status: 422 });
    }

    return db.transaction(async (trx) => {
      let categoryId = null;
      if (payload.category) {
        const slug = slugify(payload.category.slug ?? payload.category.name, { lower: true, strict: true });
        const category = await BlogCategoryModel.upsert(
          {
            slug,
            name: payload.category.name ?? payload.category.slug,
            description: payload.category.description,
            displayOrder: payload.category.displayOrder,
            isFeatured: payload.category.isFeatured
          },
          trx
        );
        categoryId = category.id;
      } else if (payload.categoryId) {
        categoryId = payload.categoryId;
      }

      const tagIds = [];
      if (payload.tags?.length) {
        for (const tag of payload.tags) {
          const slug = slugify(tag.slug ?? tag.name, { lower: true, strict: true });
          const ensured = await BlogTagModel.ensure(
            slug,
            tag.name ?? tag.slug,
            { description: tag.description },
            trx
          );
          tagIds.push(ensured.id);
        }
      } else if (payload.tagIds?.length) {
        tagIds.push(...payload.tagIds);
      }

      const { publishedAt, scheduledFor } = resolvePublicationWindows(status, payload);

      const post = await BlogPostModel.create(
        {
          title: payload.title,
          slug: payload.slug,
          excerpt: payload.excerpt,
          content: payload.content,
          authorId,
          categoryId,
          status,
          publishedAt,
          scheduledFor,
          metadata: payload.metadata,
          isFeatured: payload.isFeatured,
          readingTimeMinutes: payload.readingTimeMinutes,
          media: payload.media,
          tagIds
        },
        trx
      );

      return post;
    });
  }

  static async updatePost(postId, payload) {
    const post = await BlogPostModel.findById(postId);
    if (!post) {
      throw Object.assign(new Error('Blog post not found'), { status: 404 });
    }

    const status = payload.status ?? post.status;
    if (!VALID_STATUSES.has(status)) {
      throw Object.assign(new Error('Invalid blog status'), { status: 422 });
    }

    return db.transaction(async (trx) => {
      let categoryId = post.category?.id ?? null;
      if (payload.category) {
        const slug = slugify(payload.category.slug ?? payload.category.name, { lower: true, strict: true });
        const category = await BlogCategoryModel.upsert(
          {
            slug,
            name: payload.category.name ?? payload.category.slug,
            description: payload.category.description,
            displayOrder: payload.category.displayOrder,
            isFeatured: payload.category.isFeatured
          },
          trx
        );
        categoryId = category.id;
      } else if (payload.categoryId !== undefined) {
        categoryId = payload.categoryId;
      }

      let tagIds = null;
      if (payload.tags) {
        tagIds = [];
        for (const tag of payload.tags) {
          const slug = slugify(tag.slug ?? tag.name, { lower: true, strict: true });
          const ensured = await BlogTagModel.ensure(
            slug,
            tag.name ?? tag.slug,
            { description: tag.description },
            trx
          );
          tagIds.push(ensured.id);
        }
      } else if (payload.tagIds) {
        tagIds = payload.tagIds;
      }

      const schedulePayload = {
        ...payload,
        publishedAt: payload.publishedAt ?? post.publishedAt ?? undefined,
        scheduledFor: payload.scheduledFor ?? post.scheduledFor ?? undefined
      };
      const { publishedAt, scheduledFor } = resolvePublicationWindows(status, schedulePayload);

      const updates = {
        title: payload.title,
        slug: payload.slug,
        excerpt: payload.excerpt,
        content: payload.content,
        categoryId,
        status,
        publishedAt,
        scheduledFor,
        metadata: payload.metadata,
        isFeatured: payload.isFeatured,
        readingTimeMinutes: payload.readingTimeMinutes,
        media: payload.media,
        tagIds: tagIds ?? undefined
      };

      const updated = await BlogPostModel.update(postId, updates, trx);
      return updated;
    });
  }

  static async listCategories() {
    return BlogCategoryModel.list();
  }

  static async listTags() {
    return BlogTagModel.list();
  }
}
