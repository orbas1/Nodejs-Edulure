import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { searchSupportKnowledgeBase } from '../api/learnerDashboardApi.js';

const CACHE_STORAGE_KEY = 'edulure.support.knowledgeCache.v1';
const DEFAULT_CACHE_TTL = 5 * 60 * 1000;
const DEFAULT_DEBOUNCE = 350;

function normaliseQuery(value) {
  if (!value) {
    return '';
  }
  return value
    .toString()
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function buildCacheKey(query, category) {
  const safeQuery = normaliseQuery(query);
  const safeCategory = (category ?? 'all').toString().toLowerCase();
  return `${safeCategory}::${safeQuery}`;
}

function mapKnowledgeArticles(articles = []) {
  if (!Array.isArray(articles)) {
    return [];
  }
  return articles
    .map((article, index) => {
      if (!article) {
        return null;
      }
      const id = article.id ?? article.slug ?? `kb-${index}`;
      return {
        id,
        title: article.title ?? 'Support playbook',
        excerpt: article.excerpt ?? article.summary ?? article.description ?? '',
        url: article.url ?? article.href ?? '#',
        category: article.category ?? article.topic ?? 'Knowledge base',
        minutes: Number.isFinite(Number(article.minutes))
          ? Number(article.minutes)
          : Number.isFinite(Number(article.readTime))
            ? Number(article.readTime)
            : 3,
        updatedAt: article.updatedAt ?? article.reviewedAt ?? null
      };
    })
    .filter(Boolean);
}

function readCache() {
  if (typeof window === 'undefined') {
    return new Map();
  }
  try {
    const raw = window.localStorage.getItem(CACHE_STORAGE_KEY);
    if (!raw) {
      return new Map();
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return new Map();
    }
    const entries = parsed
      .map((entry) => {
        if (!entry || typeof entry.key !== 'string') {
          return null;
        }
        return {
          key: entry.key,
          timestamp: Number(entry.timestamp) || 0,
          suggestions: Array.isArray(entry.suggestions) ? entry.suggestions : []
        };
      })
      .filter(Boolean);
    return new Map(entries.map((entry) => [entry.key, entry]));
  } catch (error) {
    console.warn('Failed to read support launcher cache', error);
    return new Map();
  }
}

function persistCache(map) {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    const serialisable = Array.from(map.entries()).map(([key, value]) => ({
      key,
      timestamp: value.timestamp,
      suggestions: value.suggestions
    }));
    window.localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(serialisable));
  } catch (error) {
    console.warn('Failed to persist support launcher cache', error);
  }
}

const initialState = Object.freeze({
  suggestions: [],
  loading: false,
  lastFetchedAt: null,
  cached: false,
  stale: false,
  error: null
});

function getCacheEntry(cache, query, category) {
  if (!cache) {
    return null;
  }
  const key = buildCacheKey(query, category);
  return cache.get(key) ?? null;
}

export default function useSupportLauncher({
  token,
  cacheTtlMs = DEFAULT_CACHE_TTL,
  debounceMs = DEFAULT_DEBOUNCE,
  minQueryLength = 3
} = {}) {
  const [state, setState] = useState(initialState);
  const [latestQuery, setLatestQuery] = useState({ query: '', category: null });

  const cacheRef = useRef(readCache());
  const debounceRef = useRef(null);
  const abortRef = useRef(null);

  const clearPending = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }, []);

  useEffect(() => clearPending, [clearPending]);

  const setSuggestions = useCallback((updater) => {
    setState((previous) => {
      const next = typeof updater === 'function' ? updater(previous) : updater;
      return {
        suggestions: next.suggestions ?? previous.suggestions,
        loading: Boolean(next.loading),
        lastFetchedAt: next.lastFetchedAt ?? null,
        cached: Boolean(next.cached),
        stale: Boolean(next.stale),
        error: next.error ?? null
      };
    });
  }, []);

  const resolveFromCache = useCallback(
    (query, category, { allowExpired = false, updateState = true } = {}) => {
      const cached = getCacheEntry(cacheRef.current, query, category);
      if (!cached) {
        return null;
      }
      const timestamp = Number(cached.timestamp) || 0;
      const expired = !timestamp || Date.now() - timestamp > cacheTtlMs;
      if (expired && !allowExpired) {
        return null;
      }
      if (updateState) {
        setSuggestions({
          suggestions: Array.isArray(cached.suggestions) ? cached.suggestions : [],
          loading: false,
          cached: true,
          stale: expired,
          lastFetchedAt: timestamp || null,
          error: null
        });
      }
      return { ...cached, expired };
    },
    [cacheTtlMs, setSuggestions]
  );

  const performFetch = useCallback(
    ({ query, category, limit }) => {
      if (!token || !query) {
        setSuggestions(initialState);
        return;
      }
      const controller = new AbortController();
      abortRef.current = controller;
      setSuggestions((current) => ({ ...current, loading: true, error: null }));
      searchSupportKnowledgeBase({ token, query, category, limit, signal: controller.signal })
        .then((response) => {
          if (controller.signal.aborted) {
            return;
          }
          const articles = response?.data?.articles ?? response?.articles ?? [];
          const mapped = mapKnowledgeArticles(articles);
          const timestamp = Date.now();
          const key = buildCacheKey(query, category);
          cacheRef.current.set(key, { suggestions: mapped, timestamp });
          persistCache(cacheRef.current);
          setSuggestions({
            suggestions: mapped,
            loading: false,
            cached: false,
            stale: false,
            lastFetchedAt: timestamp,
            error: null
          });
        })
        .catch((error) => {
          if (controller.signal.aborted) {
            return;
          }
          console.warn('Support knowledge search failed', error);
          const fallback = resolveFromCache(query, category, { allowExpired: true, updateState: false });
          if (fallback) {
            const fallbackSuggestions = Array.isArray(fallback.suggestions) ? fallback.suggestions : [];
            setSuggestions({
              suggestions: fallbackSuggestions,
              loading: false,
              cached: true,
              stale: Boolean(fallback.expired),
              lastFetchedAt: Number(fallback.timestamp) || null,
              error: error instanceof Error ? error : new Error('Knowledge base search failed')
            });
            return;
          }
          setSuggestions({
            suggestions: [],
            loading: false,
            cached: false,
            stale: false,
            lastFetchedAt: null,
            error: error instanceof Error ? error : new Error('Knowledge base search failed')
          });
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            abortRef.current = null;
          }
        });
    },
    [resolveFromCache, setSuggestions, token]
  );

  const search = useCallback(
    ({ query, category, limit = 5 } = {}) => {
      const normalisedQuery = normaliseQuery(query);
      const nextCategory = category ?? null;
      setLatestQuery((current) => {
        if (current.query === normalisedQuery && current.category === nextCategory) {
          return current;
        }
        return { query: normalisedQuery, category: nextCategory };
      });

      if (!token || !normalisedQuery || normalisedQuery.length < minQueryLength) {
        clearPending();
        setSuggestions(initialState);
        return;
      }

      const resolved = resolveFromCache(normalisedQuery, nextCategory);
      if (resolved) {
        return;
      }

      clearPending();
      const schedule = () => performFetch({ query: normalisedQuery, category: nextCategory, limit });
      if (typeof window === 'undefined') {
        schedule();
      } else {
        debounceRef.current = window.setTimeout(schedule, debounceMs);
      }
    },
    [
      token,
      minQueryLength,
      clearPending,
      resolveFromCache,
      performFetch,
      debounceMs,
      setSuggestions
    ]
  );

  const reset = useCallback(() => {
    clearPending();
    setLatestQuery({ query: '', category: null });
    setSuggestions(initialState);
  }, [clearPending, setSuggestions]);

  return useMemo(
    () => ({
      suggestions: state.suggestions,
      loading: state.loading,
      lastFetchedAt: state.lastFetchedAt,
      cached: state.cached,
      stale: state.stale,
      error: state.error,
      latestQuery,
      search,
      reset
    }),
    [latestQuery, reset, search, state]
  );
}
