import MarketingBlockModel from '../models/MarketingBlockModel.js';
import MarketingPageModel from '../models/MarketingPageModel.js';

function normaliseLocale(locale, fallback = 'en') {
  if (!locale) {
    return fallback;
  }
  const trimmed = String(locale).trim();
  if (!trimmed) {
    return fallback;
  }
  return trimmed.toLowerCase().slice(0, 8);
}

export default class MarketingContentService {
  static async getPageBySlug(slug, { locale, fallbackLocale, includeInactive = false } = {}) {
    const page = await MarketingPageModel.findPublishedBySlug(slug);
    if (!page) {
      return null;
    }

    const resolvedFallback = normaliseLocale(fallbackLocale ?? page.defaultLocale ?? 'en');
    const resolvedLocale = normaliseLocale(locale ?? resolvedFallback, resolvedFallback);

    const blocks = await MarketingBlockModel.listByPage(
      page.id,
      {
        locale: resolvedLocale,
        fallbackLocale: resolvedFallback,
        includeInactive
      }
    );

    return {
      page: {
        id: page.id,
        slug: page.slug,
        title: page.title,
        description: page.description,
        status: page.status,
        defaultLocale: page.defaultLocale,
        metadata: page.metadata
      },
      locale: resolvedLocale,
      fallbackLocale: resolvedFallback,
      blocks
    };
  }
}
