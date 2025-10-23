import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { fetchExplorerSuggestions, listSavedSearches } from '../api/explorerApi.js';
import { useAuth } from '../context/AuthContext.jsx';

const MIN_QUERY_LENGTH = 2;

export function useGlobalSearchSuggestions({ entityTypes, limit = 8, debounceMs = 200 } = {}) {
  const { session, isAuthenticated } = useAuth();
  const token = session?.tokens?.accessToken ?? null;

  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [savedSearches, setSavedSearches] = useState([]);
  const [savedSearchLoading, setSavedSearchLoading] = useState(false);
  const [savedSearchError, setSavedSearchError] = useState(null);

  const debounceRef = useRef(null);
  const abortRef = useRef(null);
  const cacheRef = useRef(new Map());
  const previewCacheRef = useRef(new Set());
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, []);

  useEffect(() => {
    cacheRef.current.clear();
    if (!token) {
      setSuggestions([]);
      setSavedSearches([]);
    }
  }, [token]);

  useEffect(() => {
    if (!Array.isArray(suggestions)) {
      return;
    }
    suggestions.forEach((item) => {
      const media = item?.previewMedia;
      if (!media || media.type !== 'image') {
        return;
      }
      const src = media.src ?? item.imageUrl;
      if (!src || previewCacheRef.current.has(src)) {
        return;
      }
      previewCacheRef.current.add(src);
      const img = new Image();
      img.src = src;
    });
  }, [suggestions]);

  const normalisedEntityTypes = useMemo(() => {
    if (!entityTypes) return undefined;
    if (Array.isArray(entityTypes)) {
      return entityTypes;
    }
    return [entityTypes];
  }, [entityTypes]);

  const executeSuggestionFetch = useCallback(
    async (searchTerm) => {
      if (!token || !searchTerm || searchTerm.length < MIN_QUERY_LENGTH) {
        setSuggestions([]);
        setError(null);
        setLoading(false);
        return;
      }

      const cached = cacheRef.current.get(searchTerm);
      if (cached) {
        setSuggestions(cached);
        setError(null);
        setLoading(false);
        return;
      }

      if (abortRef.current) {
        abortRef.current.abort();
      }
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      setError(null);
      try {
        const response = await fetchExplorerSuggestions(
          { query: searchTerm, entityTypes: normalisedEntityTypes, limit },
          { token, signal: controller.signal }
        );
        const items = Array.isArray(response?.data?.items) ? response.data.items : [];
        cacheRef.current.set(searchTerm, items);
        if (mountedRef.current) {
          setSuggestions(items);
        }
      } catch (err) {
        if (controller.signal.aborted) {
          return;
        }
        if (mountedRef.current) {
          setError(err.message ?? 'Unable to load search suggestions');
          setSuggestions([]);
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    },
    [limit, normalisedEntityTypes, token]
  );

  useEffect(() => {
    if (!token) {
      return;
    }
    let cancelled = false;
    const controller = new AbortController();
    setSavedSearchLoading(true);
    setSavedSearchError(null);
    listSavedSearches({ token, signal: controller.signal })
      .then((response) => {
        if (cancelled) return;
        const searches = Array.isArray(response?.data) ? response.data : [];
        const pinned = searches.filter((search) => search.isPinned);
        setSavedSearches(pinned);
      })
      .catch((err) => {
        if (controller.signal.aborted || cancelled) {
          return;
        }
        setSavedSearchError(err.message ?? 'Unable to load saved searches');
      })
      .finally(() => {
        if (!cancelled) {
          setSavedSearchLoading(false);
        }
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [token]);

  useEffect(() => {
    const trimmed = query.trim();
    if (!token || trimmed.length < MIN_QUERY_LENGTH) {
      if (abortRef.current) {
        abortRef.current.abort();
      }
      setLoading(false);
      setError(null);
      setSuggestions([]);
      return;
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      executeSuggestionFetch(trimmed);
    }, debounceMs);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [debounceMs, executeSuggestionFetch, query, token]);

  const refreshSavedSearches = useCallback(async () => {
    if (!token) {
      setSavedSearches([]);
      return;
    }
    try {
      const response = await listSavedSearches({ token });
      const searches = Array.isArray(response?.data) ? response.data : [];
      const pinned = searches.filter((search) => search.isPinned);
      setSavedSearches(pinned);
    } catch (err) {
      setSavedSearchError(err.message ?? 'Unable to refresh saved searches');
    }
  }, [token]);

  return {
    isAuthenticated: Boolean(token) && isAuthenticated,
    query,
    setQuery,
    suggestions,
    loading,
    error,
    savedSearches,
    savedSearchLoading,
    savedSearchError,
    refreshSavedSearches
  };
}

export default useGlobalSearchSuggestions;
