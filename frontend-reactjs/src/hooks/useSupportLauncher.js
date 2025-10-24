import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { searchSupportKnowledgeBase } from '../api/learnerDashboardApi.js';
import {
  buildSupportContextMetadata,
  formatKnowledgeRelativeTime,
  makeKnowledgeCacheKey,
  normaliseKnowledgeArticles,
  readKnowledgeCache,
  writeKnowledgeCache
} from '../features/support/knowledgeBase.js';

const DEFAULT_OPTIONS = {
  debounceMs: 320,
  limit: 5
};

function isOnline() {
  if (typeof navigator === 'undefined') {
    return true;
  }
  if (typeof navigator.onLine !== 'boolean') {
    return true;
  }
  return navigator.onLine;
}

export default function useSupportLauncher({
  token,
  subject,
  description,
  category,
  isOpen,
  user,
  debounceMs = DEFAULT_OPTIONS.debounceMs,
  limit = DEFAULT_OPTIONS.limit
} = {}) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [offline, setOffline] = useState(!isOnline());
  const [lastFetchedAt, setLastFetchedAt] = useState(null);
  const [isStale, setIsStale] = useState(false);
  const [refreshCounter, setRefreshCounter] = useState(0);

  const abortControllerRef = useRef(null);
  const debounceTimerRef = useRef(null);
  const forceRefreshRef = useRef(false);

  const contextMetadata = useMemo(() => buildSupportContextMetadata({ user }), [user]);

  const refresh = useCallback(() => {
    forceRefreshRef.current = true;
    setRefreshCounter((count) => count + 1);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const handleOnline = () => setOffline(false);
    const handleOffline = () => setOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const trimmedSubject = typeof subject === 'string' ? subject.trim() : '';
    const trimmedDescription = typeof description === 'string' ? description.trim() : '';
    const query = `${trimmedSubject} ${trimmedDescription}`.trim();

    if (!query || query.length < 3) {
      setSuggestions([]);
      setError(null);
      setIsStale(false);
      setLastFetchedAt(null);
      setLoading(false);
      return;
    }

    const cacheKey = makeKnowledgeCacheKey({ query, category });
    const forceRefresh = forceRefreshRef.current;
    forceRefreshRef.current = false;

    if (!forceRefresh) {
      const cached = readKnowledgeCache(cacheKey);
      if (cached?.items?.length) {
        setSuggestions(cached.items);
        setLastFetchedAt(cached.fetchedAt);
        setIsStale(Boolean(cached.stale));
        if (!cached.stale || offline) {
          setError(null);
          return;
        }
      }
    }

    if (!token || offline) {
      setLoading(false);
      if (!offline) {
        setError(new Error('Authentication required to query the knowledge base.'));
      }
      return;
    }

    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current);
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    debounceTimerRef.current = window.setTimeout(() => {
      setLoading(true);
      setError(null);

      searchSupportKnowledgeBase({
        token,
        query,
        category,
        limit,
        signal: controller.signal
      })
        .then((response) => {
          if (controller.signal.aborted) {
            return;
          }
          const articles = normaliseKnowledgeArticles(
            response?.data?.articles ?? response?.articles ?? []
          );
          setSuggestions(articles);
          setLastFetchedAt(Date.now());
          setIsStale(false);
          writeKnowledgeCache(cacheKey, articles);
        })
        .catch((fetchError) => {
          if (!controller.signal.aborted) {
            setError(fetchError);
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setLoading(false);
          }
        });
    }, Math.max(0, debounceMs));
  }, [
    token,
    subject,
    description,
    category,
    isOpen,
    debounceMs,
    limit,
    offline,
    refreshCounter
  ]);

  return {
    suggestions,
    loading,
    error,
    offline,
    isStale,
    lastFetchedAt,
    refresh,
    contextMetadata,
    lastUpdatedLabel: formatKnowledgeRelativeTime(lastFetchedAt)
  };
}
