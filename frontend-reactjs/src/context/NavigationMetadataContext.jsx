import PropTypes from 'prop-types';
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';

import navigationAnnexApi from '../api/navigationAnnexApi.js';

const defaultData = {
  initiatives: { primary: [], quickActions: [], dashboard: [] },
  operationsChecklist: [],
  designDependencies: { tokens: [], qa: [], references: [] },
  strategyNarratives: [],
  productBacklog: [],
  documentationIndex: [],
  refreshedAt: null
};

const defaultValue = {
  ...defaultData,
  status: 'idle',
  error: null,
  refresh: () => {}
};

const NavigationMetadataContext = createContext(defaultValue);

function normaliseRole(role) {
  if (!role || typeof role !== 'string') {
    return null;
  }
  const trimmed = role.trim().toLowerCase();
  if (!trimmed) {
    return null;
  }
  if (trimmed === 'guest') {
    return 'user';
  }
  return trimmed;
}

export function NavigationMetadataProvider({ role, token, children }) {
  const [state, setState] = useState({ status: 'idle', data: defaultData, error: null });
  const abortRef = useRef(null);
  const resolvedRole = normaliseRole(role);

  const load = useMemo(
    () =>
      async function loadMetadata(currentRole, currentToken, { signal } = {}) {
        const response = await navigationAnnexApi.fetch({ role: currentRole ?? undefined, token: currentToken, signal });
        return response;
      },
    []
  );

  useEffect(() => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;
    let cancelled = false;

    setState((prev) => ({ ...prev, status: 'loading', error: null }));

    load(resolvedRole, token, { signal: controller.signal })
      .then((data) => {
        if (cancelled) return;
        setState({ status: 'loaded', data: { ...defaultData, ...data }, error: null });
      })
      .catch((error) => {
        if (cancelled || controller.signal.aborted) {
          return;
        }
        console.error('Failed to load navigation annex metadata', error);
        setState({ status: 'error', data: defaultData, error });
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [load, resolvedRole, token]);

  const refresh = useMemo(() => {
    return async () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
      const controller = new AbortController();
      abortRef.current = controller;
      setState((prev) => ({ ...prev, status: 'loading', error: null }));
      try {
        const data = await load(resolvedRole, token, { signal: controller.signal });
        setState({ status: 'loaded', data: { ...defaultData, ...data }, error: null });
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }
        console.error('Failed to refresh navigation annex metadata', error);
        setState({ status: 'error', data: defaultData, error });
      }
    };
  }, [load, resolvedRole, token]);

  const value = useMemo(() => ({
    ...defaultData,
    ...state.data,
    status: state.status,
    error: state.error,
    refresh
  }), [state, refresh]);

  return <NavigationMetadataContext.Provider value={value}>{children}</NavigationMetadataContext.Provider>;
}

NavigationMetadataProvider.propTypes = {
  role: PropTypes.string,
  token: PropTypes.string,
  children: PropTypes.node.isRequired
};

NavigationMetadataProvider.defaultProps = {
  role: 'user',
  token: undefined
};

export function useNavigationMetadata() {
  return useContext(NavigationMetadataContext);
}

export { NavigationMetadataContext };
export default NavigationMetadataContext;
