import db from '../config/database.js';
import {
  ensureNonEmptyString,
  normaliseOptionalString,
  normaliseSlug
} from '../utils/modelUtils.js';

const TABLE = 'blog_tags';

const BASE_COLUMNS = [
  'id',
  'slug',
  'name',
  'description',
  'created_at as createdAt',
  'updated_at as updatedAt'
];

const MAX_NAME_LENGTH = 80;
const MAX_DESCRIPTION_LENGTH = 500;

function mapRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description ?? null,
    createdAt: row.createdAt ?? row.created_at ?? null,
    updatedAt: row.updatedAt ?? row.updated_at ?? null
  };
}

function buildQuery(connection) {
  return connection(TABLE).select(BASE_COLUMNS);
}

function preparePayload(slug, name, description) {
  return {
    slug: normaliseSlug(slug),
    name: ensureNonEmptyString(name, { fieldName: 'name', maxLength: MAX_NAME_LENGTH }),
    description: normaliseOptionalString(description, { maxLength: MAX_DESCRIPTION_LENGTH })
  };
}

export default class BlogTagModel {
  static async list(connection = db) {
    const rows = await buildQuery(connection).orderBy('name', 'asc');
    return rows.map(mapRow);
  }

  static async findBySlugs(slugs = [], connection = db) {
    if (!slugs?.length) {
      return [];
    }

    const normalised = slugs.map((slug) => normaliseSlug(slug));
    const rows = await buildQuery(connection).whereIn('slug', normalised).orderBy('name', 'asc');
    return rows.map(mapRow);
  }

  static async ensure(slug, name, { description } = {}, connection = db) {
    const payload = preparePayload(slug, name, description);
    const existing = await buildQuery(connection).where({ slug: payload.slug }).first();

    if (existing) {
      const updates = {};

      if (existing.name !== payload.name) {
        updates.name = payload.name;
      }

      if ((existing.description ?? null) !== (payload.description ?? null)) {
        updates.description = payload.description;
      }

      if (Object.keys(updates).length) {
        await connection(TABLE)
          .where({ id: existing.id })
          .update({ ...updates, updated_at: connection.fn.now() });

        const [row] = await this.findBySlugs([payload.slug], connection);
        return row ?? null;
      }

      return mapRow(existing);
    }

    const [id] = await connection(TABLE).insert(payload);
    const row = await buildQuery(connection).where({ id }).first();
    return mapRow(row);
  }
}
