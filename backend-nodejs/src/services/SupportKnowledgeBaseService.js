import db from '../config/database.js';
import SupportTicketModel from '../models/SupportTicketModel.js';

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
    helpfulnessScore: Number(row.helpfulness_score ?? 0)
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
      'helpfulness_score'
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
      return articles.slice(0, limit);
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
}

export const __testables = {
  normaliseQuery,
  mapArticle
};
