import db from '../config/database.js';

const TABLE = 'marketing_blocks';

const BASE_COLUMNS = [
  'id',
  'page_id as pageId',
  'locale',
  'block_key as blockKey',
  'block_type as blockType',
  'heading',
  'subheading',
  'content',
  'media',
  'cta',
  'metadata',
  'position',
  'is_active as isActive',
  'variant',
  'created_at as createdAt',
  'updated_at as updatedAt'
];

function parseJson(value, fallback) {
  if (value === null || value === undefined) {
    return structuredClone(fallback);
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(fallback)) {
        return Array.isArray(parsed) ? parsed : structuredClone(fallback);
      }
      if (parsed && typeof parsed === 'object') {
        return { ...fallback, ...parsed };
      }
      return structuredClone(fallback);
    } catch (_error) {
      return structuredClone(fallback);
    }
  }

  if (Array.isArray(fallback)) {
    return Array.isArray(value) ? value : structuredClone(fallback);
  }

  if (value && typeof value === 'object') {
    return { ...fallback, ...value };
  }

  return structuredClone(fallback);
}

function parseBoolean(value) {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    return value !== 0;
  }
  if (typeof value === 'string') {
    return value === 'true' || value === '1';
  }
  return Boolean(value);
}

function getBlockKey(row) {
  if (row.blockKey) {
    return row.blockKey;
  }
  return `block-${row.id}`;
}

export default class MarketingBlockModel {
  static deserialize(row) {
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      pageId: row.pageId,
      locale: row.locale ?? 'en',
      blockKey: row.blockKey,
      blockType: row.blockType,
      heading: row.heading ?? null,
      subheading: row.subheading ?? null,
      content: parseJson(row.content, {}),
      media: parseJson(row.media, {}),
      cta: parseJson(row.cta, {}),
      metadata: parseJson(row.metadata, {}),
      position: typeof row.position === 'number' ? row.position : Number(row.position ?? 0) || 0,
      isActive: parseBoolean(row.isActive),
      variant: row.variant ?? null,
      createdAt: row.createdAt ? new Date(row.createdAt) : null,
      updatedAt: row.updatedAt ? new Date(row.updatedAt) : null
    };
  }

  static async listByPage(pageId, { locale, fallbackLocale, includeInactive = false } = {}, connection = db) {
    if (!pageId) {
      return [];
    }

    const query = connection(TABLE).select(BASE_COLUMNS).where('page_id', pageId);

    if (!includeInactive) {
      query.andWhere('is_active', true);
    }

    const locales = [locale, fallbackLocale].filter(Boolean);
    if (locales.length === 1) {
      query.andWhere('locale', locales[0]);
    } else if (locales.length > 1) {
      query.whereIn('locale', Array.from(new Set(locales)));
    }

    const rows = await query.orderBy('position', 'asc').orderBy('id', 'asc');
    if (!rows.length) {
      return [];
    }

    const deserialised = rows.map((row) => this.deserialize(row));

    if (!locale || !fallbackLocale || locale === fallbackLocale) {
      if (!locale) {
        return deserialised;
      }
      return deserialised.filter((block) => block.locale === locale);
    }

    const preferredLocale = locale;
    const fallbackLocaleValue = fallbackLocale;

    const localeMap = new Map();
    const fallbackMap = new Map();
    const keyOrder = [];

    deserialised.forEach((block) => {
      const key = getBlockKey(block);
      if (!keyOrder.includes(key)) {
        keyOrder.push(key);
      }
      if (block.locale === preferredLocale) {
        localeMap.set(key, block);
      }
      if (!fallbackMap.has(key) && block.locale === fallbackLocaleValue) {
        fallbackMap.set(key, block);
      }
      if (!fallbackMap.has(key) && !localeMap.has(key)) {
        fallbackMap.set(key, block);
      }
    });

    return keyOrder
      .map((key) => localeMap.get(key) ?? fallbackMap.get(key))
      .filter((block) => Boolean(block));
  }
}
