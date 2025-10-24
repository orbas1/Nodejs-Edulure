import db from '../config/database.js';

function parseJson(value, fallback) {
  if (value === null || value === undefined) {
    return fallback;
  }
  if (typeof value === 'object') {
    return value;
  }
  try {
    return JSON.parse(value);
  } catch (_error) {
    return fallback;
  }
}

function mapRecord(record) {
  if (!record) {
    return null;
  }

  return {
    id: record.id,
    slug: record.slug,
    variant: record.variant,
    quote: record.quote,
    authorName: record.author_name ?? null,
    authorTitle: record.author_title ?? null,
    attribution: record.attribution ?? null,
    persona: record.persona ?? null,
    featuredProduct: record.featured_product ?? null,
    surfaces: parseJson(record.surfaces, []),
    metadata: parseJson(record.metadata, {}),
    position: record.position ?? 0,
    createdAt: record.created_at,
    updatedAt: record.updated_at
  };
}

export default class MarketingTestimonialModel {
  static async list({ variant, variants } = {}, connection = db) {
    const query = connection('marketing_testimonials')
      .select('*')
      .orderBy('position', 'asc')
      .orderBy('id', 'asc');

    if (variant) {
      query.where({ variant });
    } else if (Array.isArray(variants) && variants.length > 0) {
      query.whereIn('variant', variants);
    }

    const rows = await query;
    return rows.map((row) => mapRecord(row)).filter(Boolean);
  }

  static filterBySurfaces(entries, surfaces = []) {
    if (!Array.isArray(entries) || entries.length === 0) {
      return [];
    }

    const surfaceSet = new Set(
      (Array.isArray(surfaces) ? surfaces : [surfaces])
        .map((surface) => (typeof surface === 'string' ? surface.trim().toLowerCase() : null))
        .filter(Boolean)
    );

    if (surfaceSet.size === 0) {
      return entries;
    }

    return entries.filter((entry) => {
      const entrySurfaces = Array.isArray(entry.surfaces)
        ? entry.surfaces
            .map((surface) => (typeof surface === 'string' ? surface.trim().toLowerCase() : null))
            .filter(Boolean)
        : [];

      if (entrySurfaces.length === 0) {
        return true;
      }

      return entrySurfaces.some((surface) => surfaceSet.has(surface));
    });
  }
}
