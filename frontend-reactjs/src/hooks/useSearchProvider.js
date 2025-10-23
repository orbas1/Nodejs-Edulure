import { useCallback, useMemo } from 'react';

import { searchExplorer } from '../api/explorerApi.js';
import { useAuth } from '../context/AuthContext.jsx';

function sanitiseEntityList(value, fallback = []) {
  const list = Array.isArray(value) ? value : fallback;
  if (!Array.isArray(list) || !list.length) {
    return [];
  }
  return list
    .map((entry) => (typeof entry === 'string' ? entry.trim().toLowerCase() : null))
    .filter(Boolean);
}

function sanitisePage(value, fallback = 1) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return fallback;
  }
  return Math.floor(numeric);
}

function sanitisePerPage(value, fallback = 10) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return fallback;
  }
  return Math.min(50, Math.floor(numeric));
}

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function useSearchProvider({ entityTypes = [], defaultPage = 1, defaultPerPage = 10 } = {}) {
  const { session } = useAuth();
  const token = session?.tokens?.accessToken;

  const defaultEntities = useMemo(() => sanitiseEntityList(entityTypes), [entityTypes]);

  const performSearch = useCallback(
    async (payload = {}, { signal } = {}) => {
      if (!token) {
        throw Object.assign(new Error('Authentication required to search explorer'), { status: 401 });
      }

      const resolvedEntities = sanitiseEntityList(payload.entityTypes, defaultEntities);
      const safePage = sanitisePage(payload.page ?? defaultPage);
      const safePerPage = sanitisePerPage(payload.perPage ?? defaultPerPage);

      const request = {
        query: typeof payload.query === 'string' ? payload.query : '',
        entityTypes: resolvedEntities.length ? resolvedEntities : undefined,
        filters: isPlainObject(payload.filters) ? payload.filters : {},
        globalFilters: isPlainObject(payload.globalFilters) ? payload.globalFilters : {},
        sort: isPlainObject(payload.sort) ? payload.sort : {},
        page: safePage,
        perPage: safePerPage
      };

      const response = await searchExplorer(request, { token, signal });
      if (!response?.success) {
        throw new Error(response?.message ?? 'Search failed');
      }

      return response.data;
    },
    [token, defaultEntities, defaultPage, defaultPerPage]
  );

  return {
    performSearch,
    token,
    defaultEntities
  };
}

export default useSearchProvider;
