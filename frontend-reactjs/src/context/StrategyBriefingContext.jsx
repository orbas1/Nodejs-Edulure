import PropTypes from 'prop-types';
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';

import strategyBriefingApi from '../api/strategyBriefingApi.js';

const defaultAnnex = {
  strategyNarratives: [],
  productBacklog: [],
  designDependencies: { tokens: [], qa: [], references: [] },
  operationsChecklist: [],
  refreshedAt: null
};

const defaultData = {
  generatedAt: null,
  summary: { midpoint: null, range: null, valuationDate: null },
  capabilitySignals: [],
  riskAdjustments: [],
  recommendations: [],
  annex: defaultAnnex
};

const defaultValue = {
  ...defaultData,
  status: 'idle',
  error: null,
  refresh: () => {}
};

const StrategyBriefingContext = createContext(defaultValue);

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

export function StrategyBriefingProvider({ role, token, children }) {
  const [state, setState] = useState({ status: 'idle', data: defaultData, error: null });
  const abortRef = useRef(null);
  const resolvedRole = normaliseRole(role);

  const load = useMemo(
    () =>
      async function loadBriefing(currentRole, currentToken, { signal } = {}) {
        const response = await strategyBriefingApi.fetch({ role: currentRole ?? undefined, token: currentToken, signal });
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
        console.error('Failed to load strategy briefing', error);
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
        console.error('Failed to refresh strategy briefing', error);
        setState({ status: 'error', data: defaultData, error });
      }
    };
  }, [load, resolvedRole, token]);

  const value = useMemo(
    () => ({
      ...defaultData,
      ...state.data,
      status: state.status,
      error: state.error,
      refresh
    }),
    [state, refresh]
  );

  return <StrategyBriefingContext.Provider value={value}>{children}</StrategyBriefingContext.Provider>;
}

StrategyBriefingProvider.propTypes = {
  role: PropTypes.string,
  token: PropTypes.string,
  children: PropTypes.node.isRequired
};

StrategyBriefingProvider.defaultProps = {
  role: 'user',
  token: undefined
};

export function useStrategyBriefing() {
  return useContext(StrategyBriefingContext);
}

export default StrategyBriefingContext;
