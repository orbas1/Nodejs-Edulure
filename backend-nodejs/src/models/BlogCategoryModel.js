import db from '../config/database.js';

const TABLE = 'blog_categories';

const BASE_COLUMNS = [
  'id',
  'slug',
  'name',
  'description',
  'display_order as displayOrder',
  'is_featured as isFeatured',
  'created_at as createdAt',
  'updated_at as updatedAt'
];

export default class BlogCategoryModel {
  static async list({ includeFeaturedOnly = false } = {}, connection = db) {
    const query = connection(TABLE).select(BASE_COLUMNS).orderBy('display_order', 'asc');
    if (includeFeaturedOnly) {
      query.where({ is_featured: true });
    }
    return query;
  }

  static async findBySlug(slug, connection = db) {
    return connection(TABLE).select(BASE_COLUMNS).where({ slug }).first();
  }

  static async upsert({ slug, name, description, displayOrder = 0, isFeatured = false }, connection = db) {
    const payload = {
      slug,
      name,
      description: description ?? null,
      display_order: displayOrder,
      is_featured: isFeatured
    };
    const existing = await this.findBySlug(slug, connection);
    if (existing) {
      await connection(TABLE).where({ id: existing.id }).update({
        ...payload,
        updated_at: connection.fn.now()
      });
      return this.findBySlug(slug, connection);
    }
    const [id] = await connection(TABLE).insert(payload);
    return connection(TABLE).select(BASE_COLUMNS).where({ id }).first();
  }
}
