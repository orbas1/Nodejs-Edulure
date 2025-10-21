import slugify from 'slugify';

import db from '../config/database.js';
import { safeJsonParse, safeJsonStringify } from '../utils/modelUtils.js';
import BlogMediaModel from './BlogMediaModel.js';

const TABLE = 'blog_posts';

const BASE_COLUMNS = [
  'blog_posts.id as id',
  'blog_posts.slug as slug',
  'blog_posts.title as title',
  'blog_posts.excerpt as excerpt',
  'blog_posts.content as content',
  'blog_posts.status as status',
  'blog_posts.published_at as publishedAt',
  'blog_posts.scheduled_for as scheduledFor',
  'blog_posts.metadata as metadata',
  'blog_posts.is_featured as isFeatured',
  'blog_posts.reading_time_minutes as readingTimeMinutes',
  'blog_posts.view_count as viewCount',
  'blog_posts.created_at as createdAt',
  'blog_posts.updated_at as updatedAt',
  'users.id as authorId',
  'users.first_name as authorFirstName',
  'users.last_name as authorLastName',
  'users.email as authorEmail',
  'blog_categories.id as categoryId',
  'blog_categories.name as categoryName',
  'blog_categories.slug as categorySlug'
];

function serialiseMetadata(metadata) {
  return safeJsonStringify(metadata);
}

function toSlug(value) {
  return slugify(value, { lower: true, strict: true });
}

export default class BlogPostModel {
  static async create(payload, connection = db) {
    const slug = payload.slug ? toSlug(payload.slug) : toSlug(`${payload.title}-${Date.now()}`);
    const [id] = await connection(TABLE).insert({
      slug,
      title: payload.title,
      excerpt: payload.excerpt ?? null,
      content: payload.content,
      author_id: payload.authorId,
      category_id: payload.categoryId ?? null,
      status: payload.status ?? 'draft',
      published_at: payload.publishedAt ?? null,
      scheduled_for: payload.scheduledFor ?? null,
      metadata: serialiseMetadata(payload.metadata),
      is_featured: Boolean(payload.isFeatured),
      reading_time_minutes: payload.readingTimeMinutes ?? 3
    });
    if (payload.media?.length) {
      await BlogMediaModel.replaceForPost(id, payload.media, connection);
    }
    if (payload.tagIds?.length) {
      const inserts = payload.tagIds.map((tagId) => ({ post_id: id, tag_id: tagId }));
      await connection('blog_post_tags').insert(inserts);
    }
    return this.findById(id, connection);
  }

  static async update(id, payload, connection = db) {
    const updates = {};
    if (payload.title) updates.title = payload.title;
    if (payload.slug) updates.slug = toSlug(payload.slug);
    if (payload.excerpt !== undefined) updates.excerpt = payload.excerpt ?? null;
    if (payload.content) updates.content = payload.content;
    if (payload.categoryId !== undefined) updates.category_id = payload.categoryId ?? null;
    if (payload.status) updates.status = payload.status;
    if (payload.publishedAt !== undefined) updates.published_at = payload.publishedAt ?? null;
    if (payload.scheduledFor !== undefined) updates.scheduled_for = payload.scheduledFor ?? null;
    if (payload.metadata !== undefined) updates.metadata = serialiseMetadata(payload.metadata);
    if (payload.isFeatured !== undefined) updates.is_featured = Boolean(payload.isFeatured);
    if (payload.readingTimeMinutes !== undefined) updates.reading_time_minutes = payload.readingTimeMinutes;
    if (Object.keys(updates).length) {
      await connection(TABLE)
        .where({ id })
        .update({ ...updates, updated_at: connection.fn.now() });
    }
    if (payload.media) {
      await BlogMediaModel.replaceForPost(id, payload.media, connection);
    }
    if (payload.tagIds) {
      await connection('blog_post_tags').where({ post_id: id }).delete();
      if (payload.tagIds.length) {
        const inserts = payload.tagIds.map((tagId) => ({ post_id: id, tag_id: tagId }));
        await connection('blog_post_tags').insert(inserts);
      }
    }
    return this.findById(id, connection);
  }

  static async recordView(id, connection = db) {
    await connection(TABLE)
      .where({ id })
      .increment('view_count', 1)
      .update({ updated_at: connection.fn.now() });
  }

  static async findById(id, connection = db) {
    const row = await this.baseQuery(connection).where('blog_posts.id', id).first();
    if (!row) return null;
    return this.hydrate(row, connection);
  }

  static async findBySlug(slug, connection = db) {
    const row = await this.baseQuery(connection).where('blog_posts.slug', slug).first();
    if (!row) return null;
    return this.hydrate(row, connection);
  }

  static baseQuery(connection = db) {
    return connection(TABLE)
      .select(BASE_COLUMNS)
      .leftJoin('users', 'users.id', 'blog_posts.author_id')
      .leftJoin('blog_categories', 'blog_categories.id', 'blog_posts.category_id');
  }

  static async list({ status, limit = 20, offset = 0, tagIds, categoryId, search } = {}, connection = db) {
    const query = this.baseQuery(connection)
      .orderBy('blog_posts.published_at', 'desc')
      .orderBy('blog_posts.created_at', 'desc');
    if (status) {
      query.where('blog_posts.status', status);
    }
    if (categoryId) {
      query.where('blog_posts.category_id', categoryId);
    }
    if (tagIds?.length) {
      query.whereIn('blog_posts.id', function tagFilter() {
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
    query.limit(limit).offset(offset);
    const rows = await query;
    const hydrated = await Promise.all(rows.map((row) => this.hydrate(row, connection)));
    return hydrated;
  }

  static async hydrate(row, connection = db) {
    const tags = await connection('blog_tags')
      .select(['blog_tags.id as id', 'blog_tags.slug as slug', 'blog_tags.name as name'])
      .join('blog_post_tags', 'blog_post_tags.tag_id', 'blog_tags.id')
      .where('blog_post_tags.post_id', row.id)
      .orderBy('blog_tags.name', 'asc');
    const media = await BlogMediaModel.listForPost(row.id, connection);
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      excerpt: row.excerpt,
      content: row.content,
      status: row.status,
      publishedAt: row.publishedAt,
      scheduledFor: row.scheduledFor,
      metadata: safeJsonParse(row.metadata, {}),
      isFeatured: Boolean(row.isFeatured),
      readingTimeMinutes: row.readingTimeMinutes,
      viewCount: Number(row.viewCount ?? 0),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      author: {
        id: row.authorId,
        firstName: row.authorFirstName,
        lastName: row.authorLastName,
        email: row.authorEmail
      },
      category: row.categoryId
        ? { id: row.categoryId, name: row.categoryName, slug: row.categorySlug }
        : null,
      tags,
      media
    };
  }
}
