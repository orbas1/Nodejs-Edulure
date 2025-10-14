import slugify from 'slugify';

import db from '../config/database.js';

const TABLE = 'ebooks';

const BASE_COLUMNS = [
  'id',
  'public_id as publicId',
  'asset_id as assetId',
  'title',
  'slug',
  'subtitle',
  'description',
  'authors',
  'tags',
  'categories',
  'languages',
  'isbn',
  'reading_time_minutes as readingTimeMinutes',
  'price_currency as priceCurrency',
  'price_amount as priceAmount',
  'rating_average as ratingAverage',
  'rating_count as ratingCount',
  'watermark_id as watermarkId',
  'status',
  'is_public as isPublic',
  'release_at as releaseAt',
  'metadata',
  'created_at as createdAt',
  'updated_at as updatedAt'
];

function parseJson(column) {
  if (!column) {
    return [];
  }
  if (typeof column === 'string') {
    try {
      const parsed = JSON.parse(column);
      if (Array.isArray(parsed)) {
        return parsed;
      }
      return parsed ?? [];
    } catch (_error) {
      return [];
    }
  }
  if (Array.isArray(column)) {
    return column;
  }
  return column ?? [];
}

function parseMetadata(metadata) {
  if (!metadata) {
    return {};
  }
  if (typeof metadata === 'string') {
    try {
      return JSON.parse(metadata) ?? {};
    } catch (_error) {
      return {};
    }
  }
  return metadata ?? {};
}

function serialiseJson(value, fallback = []) {
  if (!value) {
    return JSON.stringify(fallback);
  }
  if (typeof value === 'string') {
    return value;
  }
  return JSON.stringify(value);
}

function serialiseMetadata(value) {
  if (!value) {
    return JSON.stringify({});
  }
  if (typeof value === 'string') {
    return value;
  }
  return JSON.stringify(value);
}

function sanitiseSlug(value) {
  if (!value) {
    return null;
  }
  return slugify(value, { lower: true, strict: true });
}

export default class EbookModel {
  static async create(ebook, connection = db) {
    const payload = {
      public_id: ebook.publicId,
      asset_id: ebook.assetId,
      title: ebook.title,
      slug: ebook.slug ?? sanitiseSlug(ebook.title),
      subtitle: ebook.subtitle ?? null,
      description: ebook.description ?? null,
      authors: serialiseJson(ebook.authors, []),
      tags: serialiseJson(ebook.tags, []),
      categories: serialiseJson(ebook.categories, []),
      languages: serialiseJson(ebook.languages, ['en']),
      isbn: ebook.isbn ?? null,
      reading_time_minutes: ebook.readingTimeMinutes ?? 0,
      price_currency: ebook.priceCurrency ?? 'USD',
      price_amount: ebook.priceAmount ?? 0,
      rating_average: ebook.ratingAverage ?? 0,
      rating_count: ebook.ratingCount ?? 0,
      watermark_id: ebook.watermarkId ?? null,
      status: ebook.status ?? 'draft',
      is_public: ebook.isPublic ?? false,
      release_at: ebook.releaseAt ?? null,
      metadata: serialiseMetadata(ebook.metadata)
    };

    const [id] = await connection(TABLE).insert(payload);
    return this.findById(id, connection);
  }

  static async updateById(id, updates, connection = db) {
    const payload = {};
    if (updates.title !== undefined) payload.title = updates.title;
    if (updates.slug !== undefined) payload.slug = sanitiseSlug(updates.slug);
    if (updates.subtitle !== undefined) payload.subtitle = updates.subtitle ?? null;
    if (updates.description !== undefined) payload.description = updates.description ?? null;
    if (updates.authors !== undefined) payload.authors = serialiseJson(updates.authors, []);
    if (updates.tags !== undefined) payload.tags = serialiseJson(updates.tags, []);
    if (updates.categories !== undefined) payload.categories = serialiseJson(updates.categories, []);
    if (updates.languages !== undefined) payload.languages = serialiseJson(updates.languages, ['en']);
    if (updates.isbn !== undefined) payload.isbn = updates.isbn ?? null;
    if (updates.readingTimeMinutes !== undefined) payload.reading_time_minutes = updates.readingTimeMinutes ?? 0;
    if (updates.priceCurrency !== undefined) payload.price_currency = updates.priceCurrency ?? 'USD';
    if (updates.priceAmount !== undefined) payload.price_amount = updates.priceAmount ?? 0;
    if (updates.ratingAverage !== undefined) payload.rating_average = updates.ratingAverage ?? 0;
    if (updates.ratingCount !== undefined) payload.rating_count = updates.ratingCount ?? 0;
    if (updates.watermarkId !== undefined) payload.watermark_id = updates.watermarkId ?? null;
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.isPublic !== undefined) payload.is_public = updates.isPublic;
    if (updates.releaseAt !== undefined) payload.release_at = updates.releaseAt ?? null;
    if (updates.metadata !== undefined) payload.metadata = serialiseMetadata(updates.metadata);

    if (Object.keys(payload).length === 0) {
      return this.findById(id, connection);
    }

    await connection(TABLE)
      .where({ id })
      .update({ ...payload, updated_at: connection.fn.now() });

    return this.findById(id, connection);
  }

  static async findById(id, connection = db) {
    const row = await connection(TABLE).select(BASE_COLUMNS).where({ id }).first();
    return row ? this.deserialize(row) : null;
  }

  static async findByPublicId(publicId, connection = db) {
    const row = await connection(TABLE).select(BASE_COLUMNS).where({ public_id: publicId }).first();
    return row ? this.deserialize(row) : null;
  }

  static async findBySlug(slug, connection = db) {
    const row = await connection(TABLE).select(BASE_COLUMNS).where({ slug }).first();
    return row ? this.deserialize(row) : null;
  }

  static async listByIds(ids, connection = db) {
    if (!ids?.length) {
      return [];
    }
    const rows = await connection(TABLE).select(BASE_COLUMNS).whereIn('id', ids);
    return rows.map((row) => this.deserialize(row));
  }

  static async listByPublicIds(publicIds, connection = db) {
    if (!publicIds?.length) {
      return [];
    }
    const rows = await connection(TABLE).select(BASE_COLUMNS).whereIn('public_id', publicIds);
    return rows.map((row) => this.deserialize(row));
  }

  static async listByCreator(userId, { status, limit = 50, offset = 0, search } = {}, connection = db) {
    const query = connection(TABLE)
      .select([...BASE_COLUMNS, 'content_assets.created_by as createdBy'])
      .innerJoin('content_assets', 'ebooks.asset_id', 'content_assets.id')
      .where('content_assets.created_by', userId)
      .orderBy('ebooks.created_at', 'desc')
      .limit(limit)
      .offset(offset);

    if (status) {
      query.where('ebooks.status', status);
    }

    if (search) {
      const term = `%${search.toLowerCase()}%`;
      query.where((builder) => {
        builder.whereRaw('LOWER(ebooks.title) LIKE ?', [term]).orWhereRaw('LOWER(ebooks.subtitle) LIKE ?', [term]);
      });
    }

    const rows = await query;
    return rows.map((row) => this.deserialize(row));
  }

  static async listMarketplace(
    { status = 'published', isPublic = true, search, categories, tags, languages, limit = 50, offset = 0, minPrice, maxPrice },
    connection = db
  ) {
    const query = connection(TABLE)
      .select([...BASE_COLUMNS, 'content_assets.created_by as createdBy'])
      .innerJoin('content_assets', 'ebooks.asset_id', 'content_assets.id')
      .orderBy('ebooks.release_at', 'desc')
      .limit(limit)
      .offset(offset);

    if (status) {
      query.where('ebooks.status', status);
    }

    if (typeof isPublic === 'boolean') {
      query.where('ebooks.is_public', isPublic);
    }

    if (minPrice !== undefined) {
      query.where('ebooks.price_amount', '>=', minPrice);
    }

    if (maxPrice !== undefined) {
      query.where('ebooks.price_amount', '<=', maxPrice);
    }

    if (search) {
      const term = `%${search.toLowerCase()}%`;
      query.where((builder) => {
        builder
          .whereRaw('LOWER(ebooks.title) LIKE ?', [term])
          .orWhereRaw('LOWER(ebooks.subtitle) LIKE ?', [term])
          .orWhereRaw('LOWER(ebooks.description) LIKE ?', [term]);
      });
    }

    if (categories?.length) {
      query.where((builder) => {
        for (const category of categories) {
          builder.orWhereRaw("JSON_CONTAINS(ebooks.categories, '" + JSON.stringify(category) + "')");
        }
      });
    }

    if (tags?.length) {
      query.where((builder) => {
        for (const tag of tags) {
          builder.orWhereRaw("JSON_CONTAINS(ebooks.tags, '" + JSON.stringify(tag) + "')");
        }
      });
    }

    if (languages?.length) {
      query.where((builder) => {
        for (const language of languages) {
          builder.orWhereRaw("JSON_CONTAINS(ebooks.languages, '" + JSON.stringify(language) + "')");
        }
      });
    }

    const rows = await query;
    return rows.map((row) => this.deserialize(row));
  }

  static deserialize(row) {
    if (!row) {
      return null;
    }

    return {
      ...row,
      authors: parseJson(row.authors) ?? [],
      tags: parseJson(row.tags) ?? [],
      categories: parseJson(row.categories) ?? [],
      languages: parseJson(row.languages) ?? [],
      metadata: parseMetadata(row.metadata),
      isPublic: Boolean(row.isPublic)
    };
  }
}
