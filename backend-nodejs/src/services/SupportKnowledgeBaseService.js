import db from '../config/database.js';
import SupportTicketModel from '../models/SupportTicketModel.js';

const REVIEW_INTERVAL_DAYS = 90;

function toIso(value) {
  return SupportTicketModel.toIso?.(value) ?? null;
}

function resolveReviewIntervalDays(value) {
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric > 0) {
    return Math.round(numeric);
  }
  return REVIEW_INTERVAL_DAYS;
}

function buildFreshnessDescriptor(updatedAt, reviewIntervalDays) {
  const updatedAtIso = toIso(updatedAt);
  if (!updatedAtIso) {
    return {
      updatedAt: null,
      reviewDueAt: null,
      stale: true,
      daysSinceUpdate: null
    };
  }

  const updatedAtDate = new Date(updatedAtIso);
  const now = new Date();
  const msDiff = now.getTime() - updatedAtDate.getTime();
  const daysSinceUpdate = Math.floor(msDiff / (24 * 60 * 60 * 1000));
  const reviewDueAtDate = new Date(updatedAtDate.getTime() + reviewIntervalDays * 24 * 60 * 60 * 1000);
  const stale = Number.isFinite(daysSinceUpdate) ? daysSinceUpdate > reviewIntervalDays : true;

  return {
    updatedAt: updatedAtIso,
    reviewDueAt: toIso(reviewDueAtDate),
    stale,
    daysSinceUpdate: Number.isFinite(daysSinceUpdate) ? daysSinceUpdate : null
  };
}

function normaliseQuery(value) {
  if (!value) {
    return '';
  }
  return value.toString().trim();
}

function mapArticle(row) {
  if (!row) {
    return null;
  }
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
    reviewIntervalDays: resolveReviewIntervalDays(row.review_interval_days),
    ...buildFreshnessDescriptor(row.updated_at ?? row.updatedAt, resolveReviewIntervalDays(row.review_interval_days))
  };
}

export default class SupportKnowledgeBaseService {
  static async searchArticles({ query, category, limit = 5, signal } = {}) {
    if (signal?.aborted) {
      return [];
    }
    const trimmedQuery = normaliseQuery(query);
    const builder = db('support_articles').select(
      'id',
      'slug',
      'title',
      'summary',
      'category',
      'url',
      'minutes',
      'keywords',
      'review_interval_days',
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
    const articles = rows.map((row) => mapArticle(row)).filter(Boolean);

    if (!trimmedQuery) {
      return articles
        .sort((a, b) => {
          if (a.stale === b.stale) {
            return 0;
          }
          return a.stale ? 1 : -1;
        })
        .slice(0, limit);
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

    return (filtered.length ? filtered : articles)
      .sort((a, b) => {
        if (a.stale === b.stale) {
          return 0;
        }
        return a.stale ? 1 : -1;
      })
      .slice(0, limit);
  }

  static async buildSuggestionsForTicket({ subject, description, category }) {
    const query = [subject, description].filter(Boolean).join(' ').trim();
    const articles = await this.searchArticles({ query, category, limit: 5 });
    return SupportTicketModel.normaliseKnowledgeSuggestions(articles);
  }
}

export const __testables = {
  normaliseQuery,
  mapArticle
};
