import db from '../config/database.js';

const TABLE = 'blog_tags';

const BASE_COLUMNS = [
  'id',
  'slug',
  'name',
  'description',
  'created_at as createdAt',
  'updated_at as updatedAt'
];

export default class BlogTagModel {
  static async list(connection = db) {
    return connection(TABLE).select(BASE_COLUMNS).orderBy('name', 'asc');
  }

  static async findBySlugs(slugs = [], connection = db) {
    if (!slugs?.length) return [];
    return connection(TABLE).select(BASE_COLUMNS).whereIn('slug', slugs);
  }

  static async ensure(slug, name, { description } = {}, connection = db) {
    const existing = await connection(TABLE).select(BASE_COLUMNS).where({ slug }).first();
    if (existing) {
      if (name && existing.name !== name) {
        await connection(TABLE)
          .where({ id: existing.id })
          .update({
            name,
            description: description ?? existing.description,
            updated_at: connection.fn.now()
          });
        return connection(TABLE).select(BASE_COLUMNS).where({ id: existing.id }).first();
      }
      return existing;
    }
    const [id] = await connection(TABLE).insert({ slug, name, description: description ?? null });
    return connection(TABLE).select(BASE_COLUMNS).where({ id }).first();
  }
}
