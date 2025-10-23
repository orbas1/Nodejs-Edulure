import { useCallback } from 'react';

import { searchExplorer } from '../api/explorerApi.js';
import { useAuth } from '../context/AuthContext.jsx';

export function useSearchProvider() {
  const { session } = useAuth();
  const token = session?.tokens?.accessToken;

  const executeSearch = useCallback(
    (payload, { signal } = {}) => searchExplorer(payload, { token, signal }),
    [token]
  );

  return {
    search: executeSearch
  };
}

export default useSearchProvider;
