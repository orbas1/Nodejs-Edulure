import { useEffect, useMemo, useRef, useState } from 'react';

import { fetchExplorerSuggestions } from '../api/explorerApi.js';
import { useAuth } from '../context/AuthContext.jsx';

function normaliseEntityTypes(entityTypes) {
  if (!entityTypes) {
    return [];
  }
  if (Array.isArray(entityTypes)) {
    return entityTypes.filter(Boolean);
  }
  return String(entityTypes)
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function useExplorerSearchSuggestions({
  query,
  entityTypes,
  limit = 6,
  enabled = true,
  debounceMs = 250
} = {}) {
  const { isAuthenticated, session } = useAuth();
  const token = session?.tokens?.accessToken;

  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const abortRef = useRef(null);
  const timerRef = useRef(null);

  const normalisedTypes = useMemo(() => normaliseEntityTypes(entityTypes), [entityTypes]);
  const queryKey = typeof query === 'string' ? query.trim() : '';

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }

    if (!enabled || !isAuthenticated || !token) {
      setSuggestions([]);
      setLoading(false);
      setError(null);
      return undefined;
    }

    if (!queryKey || queryKey.length < 2) {
      setSuggestions([]);
      setLoading(false);
      setError(null);
      return undefined;
    }

    setLoading(true);
    setError(null);

    const controller = new AbortController();
    abortRef.current = controller;
    let active = true;

    timerRef.current = setTimeout(async () => {
      try {
        const response = await fetchExplorerSuggestions(
          { query: queryKey, entityTypes: normalisedTypes, limit },
          { token, signal: controller.signal }
        );
        if (!active) return;
        setSuggestions(response?.data ?? []);
      } catch (err) {
        if (controller.signal.aborted) {
          return;
        }
        setError(err.message ?? 'Unable to load suggestions');
        setSuggestions([]);
      } finally {
        if (!active) return;
        setLoading(false);
      }
    }, debounceMs);

    return () => {
      active = false;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }
    };
  }, [debounceMs, enabled, isAuthenticated, limit, normalisedTypes, queryKey, token]);

  return {
    suggestions,
    loading,
    error,
    hasSuggestions: suggestions.length > 0
  };
}

export default useExplorerSearchSuggestions;
