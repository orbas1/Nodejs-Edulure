import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  createSavedSearch,
  deleteSavedSearch,
  listSavedSearches,
  searchExplorer,
  updateSavedSearch
} from '../api/explorerApi.js';
import { useAuth } from '../context/AuthContext.jsx';

function sanitiseFilters(filters = {}) {
  return Object.entries(filters).reduce((acc, [key, value]) => {
    if (Array.isArray(value)) {
      const cleaned = value.filter((item) => item !== null && item !== undefined && item !== '');
      if (cleaned.length) {
        acc[key] = cleaned;
      }
      return acc;
    }
    if (typeof value === 'object' && value !== null) {
      const nested = sanitiseFilters(value);
      if (Object.keys(nested).length) {
        acc[key] = nested;
      }
      return acc;
    }
    if (value !== null && value !== undefined && value !== '' && value !== false) {
      acc[key] = value;
    }
    if (value === true) {
      acc[key] = value;
    }
    return acc;
  }, {});
}

export function useExplorerEntitySearch({
  entityType,
  defaultSort,
  pageSize = 6,
  initialQuery = '',
  initialFilters = {},
  transformFilters
}) {
  const { isAuthenticated, session } = useAuth();
  const token = session?.tokens?.accessToken;

  const [query, setQuery] = useState(initialQuery);
  const [filters, setFilters] = useState(initialFilters);
  const [sort, setSort] = useState(defaultSort ?? null);
  const [page, setPage] = useState(1);
  const [results, setResults] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [facets, setFacets] = useState({});
  const [preloadImageUrls, setPreloadImageUrls] = useState([]);
  const [adsPlacements, setAdsPlacements] = useState([]);

  const [savedSearches, setSavedSearches] = useState([]);
  const [savedSearchError, setSavedSearchError] = useState(null);
  const [savedSearchLoading, setSavedSearchLoading] = useState(false);

  const abortRef = useRef(null);

  const cleanedFilters = useMemo(() => {
    const working = typeof transformFilters === 'function' ? transformFilters(filters) : filters;
    return sanitiseFilters(working);
  }, [filters, transformFilters]);

  const executeSearch = useCallback(
    async (overrides = {}) => {
      if (!entityType) return;
      if (abortRef.current) {
        abortRef.current.abort();
      }
      const controller = new AbortController();
      abortRef.current = controller;
      const nextPage = overrides.page ?? page;
      const append = overrides.append ?? nextPage > 1;
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError(null);
      try {
        const payload = {
          query,
          entityTypes: [entityType],
          filters: cleanedFilters && Object.keys(cleanedFilters).length ? { [entityType]: cleanedFilters } : {},
          globalFilters: {},
          sort: sort ? { [entityType]: sort } : {},
          page: nextPage,
          perPage: pageSize
        };
        const response = await searchExplorer(payload, { token, signal: controller.signal });
        if (!response?.success) {
          throw new Error(response?.message ?? 'Search failed');
        }
        const entityResult = response.data?.results?.[entityType];
        const hits = entityResult?.hits ?? [];
        setResults((prev) => (append ? [...prev, ...hits] : hits));
        const totalCount = response.data?.totals?.[entityType] ?? hits.length;
        setTotal(totalCount);
        const computedTotalPages = Math.max(1, Math.ceil(totalCount / pageSize));
        setTotalPages(computedTotalPages);
        setPage(nextPage);
        setFacets(entityResult?.facets ?? {});
        setPreloadImageUrls(entityResult?.preloadImageUrls ?? []);
        setAdsPlacements(response.data?.adsPlacements ?? []);
        setAnalytics(response.data?.analytics ?? null);
      } catch (err) {
        if (err.name === 'CanceledError' || err.name === 'AbortError') {
          return;
        }
        setError(err.message ?? 'Unable to fetch explorer results');
        setAnalytics(null);
      } finally {
        if (append) {
          setLoadingMore(false);
        } else {
          setLoading(false);
        }
      }
    },
    [cleanedFilters, entityType, page, pageSize, query, sort, token]
  );

  useEffect(() => {
    setPage(1);
    setResults([]);
    setTotal(0);
    setTotalPages(1);
    setFacets({});
    setPreloadImageUrls([]);
    setAdsPlacements([]);
    executeSearch({ page: 1, append: false });
    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
    // intentionally leaving executeSearch out to avoid re-creating abort ref chains
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType, query, cleanedFilters, sort]);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      setSavedSearches([]);
      return;
    }
    let active = true;
    const controller = new AbortController();
    setSavedSearchLoading(true);
    setSavedSearchError(null);
    listSavedSearches({ token, signal: controller.signal })
      .then((response) => {
        if (!active) return;
        const allSearches = response?.data ?? [];
        const scoped = allSearches.filter((item) => item.entityTypes?.includes(entityType));
        setSavedSearches(scoped);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setSavedSearchError(err.message ?? 'Unable to load saved searches');
      })
      .finally(() => {
        if (!active) return;
        setSavedSearchLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [entityType, isAuthenticated, token]);

  const refreshSearches = useCallback(async () => {
    if (!isAuthenticated || !token) return;
    try {
      const response = await listSavedSearches({ token });
      const scoped = (response?.data ?? []).filter((item) => item.entityTypes?.includes(entityType));
      setSavedSearches(scoped);
    } catch (err) {
      setSavedSearchError(err.message ?? 'Unable to refresh saved searches');
    }
  }, [entityType, isAuthenticated, token]);

  const saveSearch = useCallback(
    async ({ name, pin = false }) => {
      if (!token) {
        throw new Error('Authentication required to save searches');
      }
      if (!name || !name.trim()) {
        throw new Error('Saved search name is required');
      }
      const payload = {
        name: name.trim(),
        query,
        entityTypes: [entityType],
        filters: cleanedFilters && Object.keys(cleanedFilters).length ? { [entityType]: cleanedFilters } : {},
        globalFilters: {},
        sort: sort ? { [entityType]: sort } : {},
        sortPreferences: sort ? { [entityType]: sort } : {},
        isPinned: Boolean(pin)
      };
      const response = await createSavedSearch(payload, { token });
      if (!response?.success) {
        throw new Error(response?.message ?? 'Failed to save search');
      }
      await refreshSearches();
      return response.data;
    },
    [cleanedFilters, entityType, query, refreshSearches, sort, token]
  );

  const updateSearch = useCallback(
    async (searchId, updates) => {
      if (!token) {
        throw new Error('Authentication required to update searches');
      }
      const response = await updateSavedSearch(searchId, updates, { token });
      if (!response?.success) {
        throw new Error(response?.message ?? 'Failed to update search');
      }
      await refreshSearches();
      return response.data;
    },
    [refreshSearches, token]
  );

  const removeSearch = useCallback(
    async (searchId) => {
      if (!token) {
        throw new Error('Authentication required to delete searches');
      }
      const response = await deleteSavedSearch(searchId, { token });
      if (!response?.success) {
        throw new Error(response?.message ?? 'Failed to delete search');
      }
      await refreshSearches();
    },
    [refreshSearches, token]
  );

  const applySavedSearch = useCallback(
    (savedSearch) => {
      if (!savedSearch) return;
      setQuery(savedSearch.query ?? '');
      const scopedFilters = savedSearch.filters?.[entityType] ?? {};
      setFilters(scopedFilters);
      const resolvedSort = savedSearch.sortPreferences?.[entityType] ?? defaultSort ?? null;
      setSort(resolvedSort);
      setPage(1);
    },
    [defaultSort, entityType]
  );

  const setFilterValue = useCallback((key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const toggleMultiFilter = useCallback((key, value) => {
    setFilters((prev) => {
      const current = new Set(prev[key] ?? []);
      if (current.has(value)) {
        current.delete(value);
      } else {
        current.add(value);
      }
      const next = Array.from(current);
      return { ...prev, [key]: next };
    });
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({});
  }, []);

  const goToPage = useCallback(
    (nextPage) => {
      const target = Math.max(1, nextPage);
      setPage(target);
      executeSearch({ page: target, append: false });
    },
    [executeSearch]
  );

  const hasMore = page < totalPages;

  const loadMore = useCallback(() => {
    if (loading || loadingMore) {
      return;
    }
    if (!hasMore) {
      return;
    }
    const nextPage = page + 1;
    executeSearch({ page: nextPage, append: true });
  }, [executeSearch, hasMore, loading, loadingMore, page]);

  return {
    query,
    setQuery,
    filters,
    setFilterValue,
    toggleMultiFilter,
    clearFilters,
    sort,
    setSort,
    page,
    total,
    totalPages,
    goToPage,
    results,
    loading,
    loadingMore,
    error,
    analytics,
    facets,
    preloadImageUrls,
    adsPlacements,
    hasMore,
    loadMore,
    refresh: () => executeSearch({ page, append: false }),
    savedSearches,
    savedSearchError,
    savedSearchLoading,
    saveSearch,
    updateSearch,
    removeSearch,
    applySavedSearch,
    isAuthenticated
  };
}

export default useExplorerEntitySearch;
