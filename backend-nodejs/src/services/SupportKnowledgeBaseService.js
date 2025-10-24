import db from '../config/database.js';
import SupportTicketModel from '../models/SupportTicketModel.js';

const CACHE_TTL_MS = 5 * 60 * 1000;
const DEFAULT_STALE_THRESHOLD_DAYS = 90;

const articleCache = new Map();

function createCacheKey({ query, category, limit }) {
  return [query?.toLowerCase() ?? '', category?.toLowerCase() ?? '', limit ?? 'default'].join('::');
}

function readCache(key) {
  const entry = articleCache.get(key);
  if (!entry) {
    return null;
  }
  if (entry.expiresAt <= Date.now()) {
    articleCache.delete(key);
    return null;
  }
  return entry.value;
}

function writeCache(key, value) {
  articleCache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
  return value;
}

function clearCache() {
  articleCache.clear();
}

function normaliseQuery(value) {
  if (!value) {
    return '';
  }
  return value.toString().trim();
}

function mapArticle(row, { staleThresholdDays = DEFAULT_STALE_THRESHOLD_DAYS } = {}) {
  if (!row) {
    return null;
  }
  const updatedAt = row.updated_at ?? row.updatedAt ?? null;
  const updatedDate = updatedAt ? new Date(updatedAt) : null;
  const freshnessDays = updatedDate && Number.isFinite(updatedDate.getTime())
    ? Math.floor((Date.now() - updatedDate.getTime()) / (24 * 60 * 60 * 1000))
    : null;
  const isStale = typeof freshnessDays === 'number' ? freshnessDays > staleThresholdDays : false;
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.summary,
    url: row.url,
    category: row.category,
    minutes: row.minutes ?? 3,
    keywords: SupportTicketModel.parseJson(row.keywords, []),
    helpfulnessScore: Number(row.helpfulness_score ?? 0),
    updatedAt: updatedDate && Number.isFinite(updatedDate.getTime()) ? updatedDate.toISOString() : null,
    freshnessDays,
    isStale
  };
}

export default class SupportKnowledgeBaseService {
  static async searchArticles({ query, category, limit = 5, signal } = {}) {
    if (signal?.aborted) {
      return [];
    }
    const trimmedQuery = normaliseQuery(query);
    const cacheKey = createCacheKey({ query: trimmedQuery, category, limit });
    if (!trimmedQuery && !category) {
      const cached = readCache(cacheKey);
      if (cached) {
        return cached;
      }
    }
    const builder = db('support_articles').select(
      'id',
      'slug',
      'title',
      'summary',
      'category',
      'url',
      'minutes',
      'keywords',
      'helpfulness_score',
      'updated_at'
    );

    if (category) {
      builder.where('category', category);
    }

    if (trimmedQuery) {
      const term = `%${trimmedQuery.toLowerCase()}%`;
      builder.where((qb) => {
        qb.whereRaw('LOWER(title) LIKE ?', [term]).orWhereRaw('LOWER(summary) LIKE ?', [term]);
      });
    }

    builder.orderBy('helpfulness_score', 'desc').orderBy('updated_at', 'desc').limit(limit * 2);

    const rows = await builder;
    const articles = rows
      .map((row) => mapArticle(row))
      .filter(Boolean);

    if (!trimmedQuery) {
      const sliced = articles.slice(0, limit);
      if (!category) {
        writeCache(cacheKey, sliced);
      }
      return sliced;
    }

    const lowered = trimmedQuery.toLowerCase();
    const filtered = articles.filter((article) => {
      if (article.title.toLowerCase().includes(lowered)) {
        return true;
      }
      if (article.excerpt?.toLowerCase().includes(lowered)) {
        return true;
      }
      return Array.isArray(article.keywords)
        ? article.keywords.some((keyword) => keyword?.toLowerCase().includes(lowered))
        : false;
    });

    return (filtered.length ? filtered : articles).slice(0, limit);
  }

  static async buildSuggestionsForTicket({ subject, description, category }) {
    const query = [subject, description].filter(Boolean).join(' ').trim();
    const articles = await this.searchArticles({ query, category, limit: 5 });
    return SupportTicketModel.normaliseKnowledgeSuggestions(articles);
  }

  static async describeInventory({ staleThresholdDays = DEFAULT_STALE_THRESHOLD_DAYS } = {}) {
    const rows = await db('support_articles').select(
      'id',
      'category',
      'updated_at as updatedAt',
      'helpfulness_score as helpfulnessScore'
    );

    if (!Array.isArray(rows) || !rows.length) {
      return {
        totalArticles: 0,
        staleArticles: 0,
        categories: [],
        lastUpdatedAt: null,
        staleThresholdDays,
        generatedAt: new Date().toISOString()
      };
    }

    const thresholdMs = Date.now() - staleThresholdDays * 24 * 60 * 60 * 1000;
    let totalArticles = 0;
    let staleArticles = 0;
    let lastUpdatedAt = null;
    const categories = new Map();

    rows.forEach((row) => {
      totalArticles += 1;
      const updatedAt = row.updatedAt ? new Date(row.updatedAt) : null;
      const updatedMs = updatedAt && Number.isFinite(updatedAt.getTime()) ? updatedAt.getTime() : null;
      const isStale = updatedMs !== null && updatedMs < thresholdMs;
      if (isStale) {
        staleArticles += 1;
      }
      if (updatedMs !== null) {
        if (!lastUpdatedAt || new Date(lastUpdatedAt).getTime() < updatedMs) {
          lastUpdatedAt = updatedAt.toISOString();
        }
      }
      const categoryKey = row.category ?? 'General';
      const category = categories.get(categoryKey) ?? {
        id: categoryKey.toLowerCase().replace(/[^a-z0-9]+/gi, '-'),
        name: categoryKey,
        articles: 0,
        stale: 0,
        latestUpdatedAt: null
      };
      category.articles += 1;
      if (isStale) {
        category.stale += 1;
      }
      if (updatedMs !== null) {
        if (!category.latestUpdatedAt || new Date(category.latestUpdatedAt).getTime() < updatedMs) {
          category.latestUpdatedAt = updatedAt.toISOString();
        }
      }
      categories.set(categoryKey, category);
    });

    const sortedCategories = Array.from(categories.values()).sort((a, b) => b.articles - a.articles);

    return {
      totalArticles,
      staleArticles,
      categories: sortedCategories,
      lastUpdatedAt,
      staleThresholdDays,
      generatedAt: new Date().toISOString()
    };
  }
}

export const __testables = {
  normaliseQuery,
  mapArticle,
  clearCache,
  createCacheKey,
  readCache,
  writeCache
};
