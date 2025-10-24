import PropTypes from 'prop-types';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';

import { API_BASE_URL } from '../api/httpClient.js';
import { useAuth } from './AuthContext.jsx';

const RealtimeContext = createContext({
  socket: null,
  status: 'disconnected',
  connected: false,
  connectedAt: null,
  lastEventAt: null,
  latencyMs: null,
  subscribe: () => () => {},
  emit: () => {}
});

function resolveRealtimeUrl() {
  const configured = import.meta.env.VITE_REALTIME_URL;
  if (configured) {
    return configured.replace(/\/$/, '');
  }
  try {
    const apiBase = new URL(API_BASE_URL);
    return apiBase.origin;
  } catch (error) {
    console.warn('Unable to resolve realtime URL from API_BASE_URL', error);
    return 'http://localhost:4100';
  }
}

export function RealtimeProvider({ children }) {
  const { session, isAuthenticated } = useAuth();
  const token = session?.tokens?.accessToken ?? null;
  const [state, setState] = useState({ socket: null, status: 'disconnected' });
  const [connectionMeta, setConnectionMeta] = useState({ connectedAt: null, lastEventAt: null, latencyMs: null });
  const subscriptionsRef = useRef(new Map());

  useEffect(() => {
    if (!isAuthenticated || !token) {
      setState((prev) => {
        if (prev.socket) {
          prev.socket.disconnect();
        }
        return { socket: null, status: 'disconnected' };
      });
      setConnectionMeta({ connectedAt: null, lastEventAt: null, latencyMs: null });
      return undefined;
    }

    const url = resolveRealtimeUrl();
    const socket = io(url, {
      transports: ['websocket'],
      auth: { token },
      autoConnect: true
    });

    setState({ socket, status: 'connecting' });
    const handshakeStartedAt = Date.now();

    const handleConnect = () => {
      setState({ socket, status: 'connected' });
      setConnectionMeta({
        connectedAt: new Date().toISOString(),
        lastEventAt: null,
        latencyMs: Date.now() - handshakeStartedAt
      });
    };
    const handleDisconnect = () => {
      setState((prev) => ({ ...prev, status: 'disconnected' }));
      setConnectionMeta((prev) => ({ ...prev, latencyMs: null }));
    };
    const handleAnyEvent = () => {
      setConnectionMeta((prev) => ({
        ...prev,
        lastEventAt: new Date().toISOString()
      }));
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.onAny(handleAnyEvent);

    return () => {
      subscriptionsRef.current.forEach(({ event, handler }) => {
        socket.off(event, handler);
      });
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.offAny(handleAnyEvent);
      socket.disconnect();
    };
  }, [isAuthenticated, token]);

  useEffect(() => {
    const socket = state.socket;
    if (!socket) {
      return undefined;
    }
    subscriptionsRef.current.forEach(({ event, handler }) => {
      socket.on(event, handler);
    });
    return () => {
      subscriptionsRef.current.forEach(({ event, handler }) => {
        socket.off(event, handler);
      });
    };
  }, [state.socket]);

  const subscribe = useCallback(
    (event, handler) => {
      if (!event || typeof handler !== 'function') {
        return () => {};
      }
      const subscriptionId = `${event}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
      const entry = { event, handler };
      subscriptionsRef.current.set(subscriptionId, entry);
      if (state.socket) {
        state.socket.on(event, handler);
      }
      return () => {
        if (subscriptionsRef.current.has(subscriptionId)) {
          subscriptionsRef.current.delete(subscriptionId);
        }
        if (state.socket) {
          state.socket.off(event, handler);
        }
      };
    },
    [state.socket]
  );

  const emit = useCallback(
    (event, payload = {}, options = {}) => {
      if (!event || !state.socket) {
        return;
      }
      const metadata = {
        timestamp: new Date().toISOString(),
        ...options.metadata
      };
      state.socket.emit(event, { payload, metadata });
    },
    [state.socket]
  );

  const value = useMemo(
    () => ({
      socket: state.socket,
      status: state.status,
      connected: state.status === 'connected',
      connectedAt: connectionMeta.connectedAt,
      lastEventAt: connectionMeta.lastEventAt,
      latencyMs: connectionMeta.latencyMs,
      subscribe,
      emit
    }),
    [connectionMeta, emit, state.socket, state.status, subscribe]
  );

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

RealtimeProvider.propTypes = {
  children: PropTypes.node.isRequired
};

export function useRealtime() {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }
  return context;
}

