import { useCallback, useEffect, useRef, useState } from 'react';

import { fetchExplorerSuggestions } from '../api/explorerApi.js';
import { useAuth } from '../context/AuthContext.jsx';

export function useGlobalSearchSuggestions({ auto = false, limit = 12, sinceDays = 14 } = {}) {
  const { session } = useAuth();
  const token = session?.tokens?.accessToken;

  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  const load = useCallback(
    async ({ signal } = {}) => {
      if (!token) {
        setSuggestions([]);
        return [];
      }

      if (abortRef.current) {
        abortRef.current.abort();
      }

      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      setError(null);

      try {
        const response = await fetchExplorerSuggestions({
          token,
          limit,
          sinceDays,
          signal: signal ?? controller.signal
        });
        const items = Array.isArray(response?.data) ? response.data : [];
        setSuggestions(items);
        return items;
      } catch (err) {
        if (err.name === 'CanceledError' || err.name === 'AbortError') {
          return [];
        }
        setError(err.message ?? 'Unable to load search suggestions');
        setSuggestions([]);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [limit, sinceDays, token]
  );

  useEffect(() => {
    if (!auto || !token) {
      return undefined;
    }
    load();
    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, [auto, load, token]);

  const refresh = useCallback(() => load(), [load]);

  return {
    suggestions,
    loading,
    error,
    refresh
  };
}

export default useGlobalSearchSuggestions;
