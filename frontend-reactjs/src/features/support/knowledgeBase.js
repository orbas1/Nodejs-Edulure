const CACHE_TTL_MS = 5 * 60 * 1000;
const CACHE_SOFT_STALE_MS = 90 * 1000;

const knowledgeCache = new Map();

const RELATIVE_TIME_FORMATTER = typeof Intl !== 'undefined'
  ? new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
  : null;

function normaliseNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function sanitiseString(value, fallback = '') {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }
  return fallback;
}

export function normaliseKnowledgeArticles(articles = []) {
  if (!Array.isArray(articles)) {
    return [];
  }

  return articles
    .map((article, index) => {
      if (!article) {
        return null;
      }

      const title = sanitiseString(article.title, 'Support guide');
      const excerpt =
        sanitiseString(article.excerpt) ||
        sanitiseString(article.summary) ||
        sanitiseString(article.description, 'Explore the playbook to resolve common learner requests.');

      const id =
        sanitiseString(article.id) ||
        sanitiseString(article.slug) ||
        `knowledge-${index}`;

      return {
        id,
        title,
        excerpt,
        url: sanitiseString(article.url) || sanitiseString(article.href) || '#',
        category: sanitiseString(article.category) || sanitiseString(article.topic) || 'Guide',
        minutes: normaliseNumber(article.minutes ?? article.readTime, 3)
      };
    })
    .filter(Boolean);
}

export function makeKnowledgeCacheKey({ query, category }) {
  const safeQuery = sanitiseString(query).toLowerCase();
  const safeCategory = sanitiseString(category, 'all').toLowerCase();
  return `${safeCategory}:${safeQuery}`;
}

export function readKnowledgeCache(key) {
  if (!knowledgeCache.has(key)) {
    return null;
  }

  const entry = knowledgeCache.get(key);
  if (!entry) {
    knowledgeCache.delete(key);
    return null;
  }

  const age = Date.now() - entry.timestamp;
  if (age > CACHE_TTL_MS) {
    knowledgeCache.delete(key);
    return null;
  }

  return {
    items: entry.items,
    fetchedAt: entry.timestamp,
    stale: age > CACHE_SOFT_STALE_MS
  };
}

export function writeKnowledgeCache(key, items) {
  knowledgeCache.set(key, {
    items,
    timestamp: Date.now()
  });
}

export function clearKnowledgeCache() {
  knowledgeCache.clear();
}

export function formatKnowledgeRelativeTime(timestamp) {
  if (!timestamp) {
    return null;
  }

  const numericTimestamp = typeof timestamp === 'number' ? timestamp : new Date(timestamp).getTime();
  if (!Number.isFinite(numericTimestamp)) {
    return null;
  }

  const diffMs = Date.now() - numericTimestamp;
  if (!RELATIVE_TIME_FORMATTER || !Number.isFinite(diffMs)) {
    return null;
  }

  if (Math.abs(diffMs) < 60 * 1000) {
    return 'Updated moments ago';
  }

  const diffMinutes = Math.round(diffMs / (60 * 1000));
  if (Math.abs(diffMinutes) < 60) {
    return `Updated ${RELATIVE_TIME_FORMATTER.format(-diffMinutes, 'minute')}`;
  }

  const diffHours = Math.round(diffMs / (60 * 60 * 1000));
  if (Math.abs(diffHours) < 48) {
    return `Updated ${RELATIVE_TIME_FORMATTER.format(-diffHours, 'hour')}`;
  }

  const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000));
  return `Updated ${RELATIVE_TIME_FORMATTER.format(-diffDays, 'day')}`;
}

export function buildSupportContextMetadata({ user } = {}) {
  const metadata = {
    source: 'web-app',
    capturedAt: new Date().toISOString()
  };

  if (typeof window !== 'undefined') {
    metadata.location = window.location?.href ?? null;
    metadata.pathname = window.location?.pathname ?? null;
    metadata.referrer = document.referrer ?? null;
  }

  if (typeof navigator !== 'undefined') {
    metadata.userAgent = navigator.userAgent;
    metadata.language = navigator.language;
  }

  try {
    const timezone = Intl?.DateTimeFormat?.().resolvedOptions?.().timeZone;
    if (timezone) {
      metadata.timezone = timezone;
    }
  } catch (error) {
    // ignore resolution errors
  }

  if (user) {
    metadata.user = {
      id: user.id ?? user.userId ?? null,
      email: user.email ?? null,
      role: user.role ?? user.type ?? null,
      organisation: user.organisation ?? user.org ?? null
    };
  }

  Object.keys(metadata).forEach((key) => {
    if (metadata[key] === null || metadata[key] === undefined || metadata[key] === '') {
      delete metadata[key];
    }
  });

  return metadata;
}

export function getKnowledgeCacheStats() {
  return {
    size: knowledgeCache.size,
    keys: Array.from(knowledgeCache.keys())
  };
}
