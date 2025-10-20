import PropTypes from 'prop-types';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';

import { API_BASE_URL } from '../api/httpClient.js';
import { useAuth } from './AuthContext.jsx';

const RealtimeContext = createContext({ socket: null, status: 'disconnected', connected: false });

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

  useEffect(() => {
    if (!isAuthenticated || !token) {
      setState((prev) => {
        if (prev.socket) {
          prev.socket.disconnect();
        }
        return { socket: null, status: 'disconnected' };
      });
      return undefined;
    }

    const url = resolveRealtimeUrl();
    const socket = io(url, {
      transports: ['websocket'],
      auth: { token },
      autoConnect: true
    });

    setState({ socket, status: 'connecting' });

    const handleConnect = () => setState({ socket, status: 'connected' });
    const handleDisconnect = () => setState((prev) => ({ ...prev, status: 'disconnected' }));

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.disconnect();
    };
  }, [isAuthenticated, token]);

  const value = useMemo(
    () => ({ socket: state.socket, status: state.status, connected: state.status === 'connected' }),
    [state]
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

