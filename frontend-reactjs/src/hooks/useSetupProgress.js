import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { fetchSetupStatus } from '../api/setupApi.js';
import { API_BASE_URL } from '../api/httpClient.js';

const STREAM_ENDPOINT = `${API_BASE_URL}/setup/events`;
const DEFAULT_POLL_INTERVAL_MS = 5_000;
const STREAM_RETRY_DELAY_MS = 15_000;
const DEFAULT_HISTORY_LIMIT = 5;

function parseEventData(event) {
  try {
    return JSON.parse(event.data ?? '{}');
  } catch (error) {
    console.warn('Failed to parse setup event payload', error);
    return {};
  }
}

const hasWindow = typeof window !== 'undefined';
const hasEventSource = hasWindow && typeof window.EventSource !== 'undefined';

export default function useSetupProgress({
  autoStart = true,
  pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
  historyLimit = DEFAULT_HISTORY_LIMIT
} = {}) {
  const [snapshot, setSnapshot] = useState({ state: null, tasks: [], presets: [], defaults: {}, history: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [connectionState, setConnectionState] = useState('idle');

  const eventSourceRef = useRef(null);
  const pollIntervalRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const startStreamRef = useRef(null);
  const mountedRef = useRef(false);
  const historyLimitRef = useRef(historyLimit);

  const applySnapshot = useCallback((data) => {
    if (!mountedRef.current) {
      return;
    }
    setSnapshot({
      state: data?.state ?? null,
      tasks: data?.tasks ?? [],
      presets: data?.presets ?? [],
      defaults: data?.defaults ?? {},
      history: data?.history ?? []
    });
    setLoading(false);
    setError(null);
  }, []);

  const fetchSnapshot = useCallback(
    async (limit = historyLimitRef.current) => {
      try {
        const data = await fetchSetupStatus({ historyLimit: limit });
        applySnapshot(data);
        historyLimitRef.current = limit;
        return data;
      } catch (err) {
        if (!mountedRef.current) {
          return null;
        }
        console.error('Failed to fetch setup status', err);
        setError(err.message ?? 'Failed to load setup status');
        setLoading(false);
        return null;
      }
    },
    [applySnapshot]
  );

  const closeEventSource = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  const startPolling = useCallback(() => {
    stopPolling();
    setConnectionState('polling');
    fetchSnapshot();
    pollIntervalRef.current = setInterval(() => fetchSnapshot(), pollIntervalMs);
  }, [fetchSnapshot, pollIntervalMs, stopPolling]);

  const scheduleReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      return;
    }
    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectTimeoutRef.current = null;
      if (!mountedRef.current) {
        return;
      }
      if (startStreamRef.current) {
        startStreamRef.current();
      }
    }, STREAM_RETRY_DELAY_MS);
  }, []);

  const startStream = useCallback(() => {
    startStreamRef.current = startStream;
    if (!hasEventSource) {
      startPolling();
      return;
    }

    stopPolling();
    closeEventSource();

    try {
      const source = new EventSource(STREAM_ENDPOINT, { withCredentials: true });
      eventSourceRef.current = source;
      setConnectionState('streaming');
      setError(null);

      const handleState = (event) => {
        const data = parseEventData(event);
        if (data) {
          applySnapshot(data);
        }
      };

      source.addEventListener('state', handleState);
      source.onmessage = handleState;

      source.onerror = () => {
        if (!mountedRef.current) {
          return;
        }
        closeEventSource();
        setError('Lost connection to setup event stream');
        startPolling();
        scheduleReconnect();
      };
    } catch (err) {
      console.error('Failed to start setup event stream', err);
      setError(err.message ?? 'Failed to subscribe to setup updates');
      startPolling();
      scheduleReconnect();
    }
  }, [applySnapshot, closeEventSource, scheduleReconnect, startPolling]);

  useEffect(() => {
    startStreamRef.current = startStream;
  }, [startStream]);

  useEffect(() => {
    mountedRef.current = true;
    if (autoStart) {
      fetchSnapshot();
      startStream();
    }
    return () => {
      mountedRef.current = false;
      closeEventSource();
      stopPolling();
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [autoStart, closeEventSource, fetchSnapshot, startStream, stopPolling]);

  const snapshotMemo = useMemo(
    () => ({
      state: snapshot.state,
      tasks: snapshot.tasks,
      presets: snapshot.presets,
      defaults: snapshot.defaults,
      history: snapshot.history
    }),
    [snapshot]
  );

  return {
    ...snapshotMemo,
    loading,
    error,
    connectionState,
    refresh: fetchSnapshot,
    reconnect: startStream,
    loadHistory: (limit = 25) => fetchSnapshot(limit)
  };
}
