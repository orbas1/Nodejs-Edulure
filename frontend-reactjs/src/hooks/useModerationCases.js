import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  applyModerationCaseAction,
  getModerationCase,
  listModerationCaseActions,
  listModerationCases
} from '../api/moderationApi.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useInterval } from './useInterval.js';

function toNumber(value, fallback = 0) {
  const parsed = Number.parseInt(value ?? fallback, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export default function useModerationCases({
  communityId,
  pollIntervalMs = 120_000,
  initialFilters = {}
} = {}) {
  const { session } = useAuth();
  const token = session?.tokens?.accessToken ?? null;
  const [filters, setFilters] = useState(initialFilters);
  const [state, setState] = useState({
    loading: true,
    error: null,
    cases: [],
    pagination: { page: 1, perPage: 25, total: 0, pageCount: 1 }
  });
  const [selectedCaseId, setSelectedCaseId] = useState(null);
  const [caseDetail, setCaseDetail] = useState(null);
  const [caseActions, setCaseActions] = useState([]);
  const [actionHistory, setActionHistory] = useState([]);
  const abortControllerRef = useRef(null);
  const detailAbortControllerRef = useRef(null);

  const isReady = Boolean(token && communityId);

  const refresh = useCallback(
    async ({ silent = false } = {}) => {
      if (!isReady) {
        setState((prev) => ({ ...prev, loading: false }));
        return;
      }

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      if (!silent) {
        setState((prev) => ({ ...prev, loading: true, error: null }));
      }

      try {
        const response = await listModerationCases({
          token,
          communityId,
          params: filters,
          signal: controller.signal
        });

        setState({
          loading: false,
          error: null,
          cases: response.items,
          pagination: response.pagination
        });
      } catch (error) {
        if (!controller.signal.aborted) {
          setState((prev) => ({ ...prev, loading: false, error }));
        }
      } finally {
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
        }
      }
    },
    [communityId, filters, isReady, token]
  );

  const loadCaseDetail = useCallback(
    async (caseId) => {
      if (!isReady || !caseId) {
        setCaseDetail(null);
        setCaseActions([]);
        return;
      }

      if (detailAbortControllerRef.current) {
        detailAbortControllerRef.current.abort();
      }

      const controller = new AbortController();
      detailAbortControllerRef.current = controller;

      try {
        const [detail, actions] = await Promise.all([
          getModerationCase({ token, communityId, caseId, signal: controller.signal }),
          listModerationCaseActions({ token, communityId, caseId, signal: controller.signal })
        ]);
        setCaseDetail(detail);
        setCaseActions(actions);
      } catch (error) {
        if (!controller.signal.aborted) {
          setCaseDetail((prev) => ({
            ...(prev ?? {}),
            error
          }));
        }
      } finally {
        if (detailAbortControllerRef.current === controller) {
          detailAbortControllerRef.current = null;
        }
      }
    },
    [communityId, isReady, token]
  );

  useEffect(() => {
    setState((prev) => ({ ...prev, loading: true }));
    refresh();
    return () => {
      abortControllerRef.current?.abort();
    };
  }, [refresh]);

  useEffect(() => {
    if (!selectedCaseId) {
      setCaseDetail(null);
      setCaseActions([]);
      return;
    }
    loadCaseDetail(selectedCaseId);
    return () => {
      detailAbortControllerRef.current?.abort();
    };
  }, [loadCaseDetail, selectedCaseId]);

  useInterval(() => {
    if (!isReady) {
      return;
    }
    refresh({ silent: true });
    if (selectedCaseId) {
      loadCaseDetail(selectedCaseId);
    }
  }, pollIntervalMs);

  const performAction = useCallback(
    async ({
      caseId,
      action,
      notes,
      riskScore,
      archivePost,
      restoreStatus,
      assignedTo,
      followUpAt,
      followUpReason,
      acknowledgeSuggestion
    }) => {
      const targetCaseId = caseId ?? selectedCaseId;
      if (!targetCaseId) {
        throw new Error('A moderation case must be selected before performing an action.');
      }

      await applyModerationCaseAction({
        token,
        communityId,
        caseId: targetCaseId,
        payload: {
          action,
          notes,
          riskScore,
          archivePost,
          restoreStatus,
          assignedTo,
          followUpAt,
          followUpReason,
          acknowledgeSuggestion
        }
      });

      const actionableCase = caseDetail?.case;
      if (actionableCase && ['approve', 'reject', 'suppress'].includes(action)) {
        setActionHistory((prev) => [
          ...prev,
          {
            caseId: targetCaseId,
            previousStatus: actionableCase.status,
            previousPostStatus: actionableCase.post?.status ?? 'published'
          }
        ]);
      }

      await refresh({ silent: true });
      await loadCaseDetail(targetCaseId);
    },
    [caseDetail, communityId, loadCaseDetail, refresh, selectedCaseId, token]
  );

  const undoLastAction = useCallback(async () => {
    const historyLength = actionHistory.length;
    if (!historyLength) {
      return null;
    }
    const lastEntry = actionHistory[historyLength - 1];
    try {
      await applyModerationCaseAction({
        token,
        communityId,
        caseId: lastEntry.caseId,
        payload: {
          action: 'restore',
          restoreStatus: lastEntry.previousPostStatus ?? 'published',
          notes: 'Undo previous moderation action'
        }
      });
      setActionHistory((prev) => prev.slice(0, prev.length - 1));
      await refresh({ silent: true });
      if (selectedCaseId === lastEntry.caseId) {
        await loadCaseDetail(lastEntry.caseId);
      }
      return true;
    } catch (error) {
      return false;
    }
  }, [actionHistory, communityId, loadCaseDetail, refresh, selectedCaseId, token]);

  const pagination = useMemo(() => {
    const info = state.pagination ?? {};
    return {
      page: toNumber(info.page, 1),
      perPage: toNumber(info.perPage, 25),
      total: toNumber(info.total, state.cases.length),
      pageCount: toNumber(info.pageCount, 1)
    };
  }, [state.cases.length, state.pagination]);

  return {
    loading: state.loading,
    error: state.error,
    cases: state.cases,
    pagination,
    filters,
    setFilters,
    refresh,
    selectedCaseId,
    setSelectedCaseId,
    selectedCase: caseDetail?.case ?? null,
    selectedCaseActions: caseActions,
    performAction,
    undoLastAction,
    actionHistory,
    lastAction: actionHistory.length ? actionHistory[actionHistory.length - 1] : null
  };
}
