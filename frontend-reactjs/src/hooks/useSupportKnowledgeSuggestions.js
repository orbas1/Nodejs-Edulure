import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { searchSupportKnowledgeBase } from '../api/learnerDashboardApi.js';
import createPersistentCache from '../utils/persistentCache.js';

const knowledgeCache = createPersistentCache('support-knowledge-suggestions', {
  ttlMs: 12 * 60 * 60 * 1000
});

function normaliseArticles(articles = []) {
  if (!Array.isArray(articles)) {
    return [];
  }
  return articles
    .map((article, index) => {
      if (!article) {
        return null;
      }
      const id = article.id ?? article.slug ?? `kb-${index}`;
      const minutesRaw = article.minutes ?? article.readTime ?? article.duration;
      const minutes = Number.isFinite(Number(minutesRaw)) ? Number(minutesRaw) : 3;
      const updatedAt = article.updatedAt ?? article.updated_at ?? null;
      const reviewDueAt = article.reviewDueAt ?? article.review_due_at ?? null;
      return {
        id,
        title: article.title ?? 'Support guide',
        excerpt: article.excerpt ?? article.summary ?? article.description ?? '',
        url: article.url ?? article.link ?? '#',
        category: article.category ?? article.topic ?? 'General',
        minutes,
        stale: Boolean(article.stale ?? article.isStale),
        updatedAt,
        reviewDueAt,
        reviewIntervalDays: Number.isFinite(Number(article.reviewIntervalDays))
          ? Number(article.reviewIntervalDays)
          : null,
        helpfulnessScore: Number.isFinite(Number(article.helpfulnessScore))
          ? Number(article.helpfulnessScore)
          : Number.isFinite(Number(article.helpfulness_score))
            ? Number(article.helpfulness_score)
            : null
      };
    })
    .filter(Boolean);
}

function buildCacheKey({ query, category, limit }) {
  return `${category.toLowerCase()}|${limit}|${query.toLowerCase()}`;
}

function isOffline() {
  if (typeof navigator === 'undefined') {
    return false;
  }
  return navigator.onLine === false;
}

export default function useSupportKnowledgeSuggestions({
  token,
  subject,
  description,
  category,
  limit = 5,
  enabled = true,
  debounceMs = 250
} = {}) {
  const searchParams = useMemo(() => {
    const rawQuery = `${subject ?? ''} ${description ?? ''}`.trim();
    if (!rawQuery) {
      return null;
    }
    const safeLimit = Number.isFinite(Number(limit)) ? Math.max(1, Math.min(10, Number(limit))) : 5;
    const resolvedCategory = typeof category === 'string' && category.trim().length ? category.trim() : 'General';
    return {
      query: rawQuery,
      category: resolvedCategory,
      limit: safeLimit
    };
  }, [subject, description, category, limit]);

  const cacheKey = useMemo(() => (searchParams ? buildCacheKey(searchParams) : null), [searchParams]);
  const abortRef = useRef(null);
  const debounceRef = useRef(null);
  const [state, setState] = useState({
    suggestions: [],
    loading: false,
    error: null,
    metadata: null
  });

  const runSearch = useCallback(
    async ({ bypassCache = false } = {}) => {
      if (!enabled || !token || !searchParams || !cacheKey) {
        setState({ suggestions: [], loading: false, error: null, metadata: null });
        return;
      }

      if (abortRef.current) {
        abortRef.current.abort();
      }
      const controller = new AbortController();
      abortRef.current = controller;

      const offline = isOffline();
      setState((prev) => ({
        ...prev,
        loading: true,
        error: null,
        metadata: {
          query: searchParams.query,
          category: searchParams.category,
          limit: searchParams.limit,
          generatedAt: new Date().toISOString(),
          lastUpdatedAt: prev.metadata?.lastUpdatedAt ?? null,
          source: bypassCache ? 'network' : prev.metadata?.source ?? 'network',
          staleCount: prev.metadata?.staleCount ?? 0,
          fromCache: prev.metadata?.fromCache ?? false,
          offline
        }
      }));

      if (!bypassCache) {
        const cached = await knowledgeCache.read(cacheKey);
        if (cached?.value) {
          const cachedSuggestions = normaliseArticles(cached.value);
          setState((prev) => ({
            ...prev,
            suggestions: cachedSuggestions,
            metadata: {
              query: searchParams.query,
              category: searchParams.category,
              limit: searchParams.limit,
              generatedAt: prev.metadata?.generatedAt ?? new Date().toISOString(),
              lastUpdatedAt: cached.storedAt ? new Date(cached.storedAt).toISOString() : prev.metadata?.lastUpdatedAt ?? null,
              source: 'cache',
              staleCount: cachedSuggestions.filter((item) => item.stale).length,
              fromCache: true,
              offline
            }
          }));
        }
      }

      try {
        const response = await searchSupportKnowledgeBase({
          token,
          query: searchParams.query,
          category: searchParams.category,
          limit: searchParams.limit,
          signal: controller.signal
        });
        if (controller.signal.aborted) {
          return;
        }
        const articles = response?.data?.articles ?? response?.articles ?? [];
        const suggestions = normaliseArticles(articles);
        setState({
          suggestions,
          loading: false,
          error: null,
          metadata: {
            query: searchParams.query,
            category: searchParams.category,
            limit: searchParams.limit,
            generatedAt: new Date().toISOString(),
            lastUpdatedAt: new Date().toISOString(),
            source: 'network',
            staleCount: suggestions.filter((item) => item.stale).length,
            fromCache: false,
            offline: isOffline()
          }
        });
        await knowledgeCache.write(cacheKey, articles, {
          ttlOverride: suggestions.some((item) => item.stale) ? 15 * 60 * 1000 : undefined
        });
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }
        setState((prev) => ({
          ...prev,
          loading: false,
          error,
          metadata: {
            ...(prev.metadata ?? {}),
            offline: isOffline(),
            source: prev.metadata?.source ?? (prev.metadata?.fromCache ? 'cache' : 'network')
          }
        }));
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null;
        }
      }
    },
    [cacheKey, enabled, searchParams, token]
  );

  useEffect(() => {
    if (!enabled || !searchParams || !token) {
      setState({ suggestions: [], loading: false, error: null, metadata: null });
      return undefined;
    }

    debounceRef.current = window.setTimeout(() => {
      runSearch();
    }, debounceMs);

    return () => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      abortRef.current?.abort();
    };
  }, [enabled, runSearch, searchParams, token, debounceMs]);

  const refresh = useCallback(() => {
    runSearch({ bypassCache: true });
  }, [runSearch]);

  return {
    ...state,
    refresh
  };
}
