import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { listCommunityPresence, updateCommunityPresence } from '../api/communityChatApi.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useRealtime } from '../context/RealtimeContext.jsx';

function normaliseCommunityId(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
}

function normaliseChannelId(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
}

function sanitisePresenceResponse(response) {
  if (!response) {
    return [];
  }
  const data = Array.isArray(response?.data) ? response.data : response;
  return Array.isArray(data) ? data : [];
}

function buildError(message, payload) {
  if (message instanceof Error) {
    return message;
  }
  const error = new Error(typeof message === 'string' && message ? message : 'Community realtime error');
  if (payload && typeof payload === 'object') {
    error.payload = payload;
  }
  return error;
}

export default function useCommunityRealtime({
  communityId,
  channelId,
  enabled = true,
  autoPresence = true,
  onMessage,
  onPresence,
  onTyping,
  onError
} = {}) {
  const { session, isAuthenticated } = useAuth();
  const { socket, connected } = useRealtime();

  const token = session?.tokens?.accessToken ?? null;
  const numericCommunityId = normaliseCommunityId(communityId);
  const numericChannelId = normaliseChannelId(channelId);
  const [presence, setPresence] = useState([]);
  const [status, setStatus] = useState('idle');
  const [lastError, setLastError] = useState(null);
  const [joined, setJoined] = useState(false);

  const messageHandlerRef = useRef(onMessage);
  const presenceHandlerRef = useRef(onPresence);
  const typingHandlerRef = useRef(onTyping);
  const errorHandlerRef = useRef(onError);
  const channelRef = useRef(numericChannelId);

  useEffect(() => {
    messageHandlerRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    presenceHandlerRef.current = onPresence;
  }, [onPresence]);

  useEffect(() => {
    typingHandlerRef.current = onTyping;
  }, [onTyping]);

  useEffect(() => {
    errorHandlerRef.current = onError;
  }, [onError]);

  useEffect(() => {
    channelRef.current = numericChannelId;
  }, [numericChannelId]);

  const canUseRealtime = useMemo(
    () => Boolean(enabled && isAuthenticated && socket && numericCommunityId),
    [enabled, isAuthenticated, socket, numericCommunityId]
  );

  const handleError = useCallback((error, payload) => {
    if (!error) {
      return;
    }
    const resolvedError = buildError(error, payload);
    setLastError(resolvedError);
    errorHandlerRef.current?.(resolvedError, payload);
  }, []);

  const refreshPresence = useCallback(
    async ({ signal } = {}) => {
      if (!canUseRealtime || !token) {
        setPresence([]);
        return [];
      }
      try {
        const response = await listCommunityPresence({
          communityId: numericCommunityId,
          token,
          signal
        });
        const items = sanitisePresenceResponse(response);
        setPresence(items);
        setStatus('ready');
        setLastError(null);
        presenceHandlerRef.current?.({ communityId: numericCommunityId, presence: items });
        return items;
      } catch (error) {
        if (signal?.aborted) {
          return [];
        }
        handleError(error);
        setStatus('error');
        return [];
      }
    },
    [canUseRealtime, token, numericCommunityId, handleError]
  );

  const updatePresence = useCallback(
    async (payload = {}) => {
      if (!canUseRealtime || !token) {
        return null;
      }
      try {
        const response = await updateCommunityPresence({
          communityId: numericCommunityId,
          token,
          payload
        });
        setLastError(null);
        return response?.data ?? response ?? null;
      } catch (error) {
        handleError(error);
        throw error;
      }
    },
    [canUseRealtime, token, numericCommunityId, handleError]
  );

  const sendTyping = useCallback(
    (isTyping = true, options = {}) => {
      if (!canUseRealtime || !socket) {
        return;
      }
      const targetChannelId = normaliseChannelId(options.channelId ?? channelRef.current);
      if (!targetChannelId) {
        return;
      }
      socket.emit('community.typing', {
        communityId: numericCommunityId,
        channelId: targetChannelId,
        isTyping: Boolean(isTyping),
        metadata: options.metadata ?? {}
      });
    },
    [canUseRealtime, socket, numericCommunityId]
  );

  useEffect(() => {
    if (!canUseRealtime) {
      setPresence([]);
      setStatus(enabled ? 'disabled' : 'idle');
      setJoined(false);
      return () => {};
    }

    setStatus('connecting');
    socket.emit('community.join', { communityId: numericCommunityId });

    const handleJoined = () => {
      setJoined(true);
      setStatus('ready');
      refreshPresence();
    };

    const handleRealtimeError = (payload) => {
      if (payload?.communityId && normaliseCommunityId(payload.communityId) !== numericCommunityId) {
        return;
      }
      handleError(payload?.message ?? payload, payload);
    };

    socket.on('community.joined', handleJoined);
    socket.on('community.error', handleRealtimeError);

    return () => {
      socket.off('community.joined', handleJoined);
      socket.off('community.error', handleRealtimeError);
      if (socket.connected) {
        socket.emit('community.leave', { communityId: numericCommunityId });
      }
      setJoined(false);
    };
  }, [canUseRealtime, socket, numericCommunityId, refreshPresence, handleError, enabled]);

  useEffect(() => {
    if (!canUseRealtime || !socket) {
      return () => {};
    }

    const handleMessage = (payload) => {
      if (normaliseCommunityId(payload?.communityId) !== numericCommunityId) {
        return;
      }
      messageHandlerRef.current?.(payload);
    };

    const handlePresenceEvent = (payload) => {
      if (normaliseCommunityId(payload?.communityId) !== numericCommunityId) {
        return;
      }
      const items = sanitisePresenceResponse(payload?.presence);
      setPresence(items);
      setStatus('ready');
      setLastError(null);
      presenceHandlerRef.current?.({ communityId: numericCommunityId, presence: items, source: 'realtime' });
    };

    const handleTypingEvent = (payload) => {
      if (normaliseCommunityId(payload?.communityId) !== numericCommunityId) {
        return;
      }
      typingHandlerRef.current?.(payload);
    };

    const handleRealtimeError = (payload) => {
      if (payload?.communityId && normaliseCommunityId(payload.communityId) !== numericCommunityId) {
        return;
      }
      handleError(payload?.message ?? payload, payload);
    };

    socket.on('community.message', handleMessage);
    socket.on('community.presence', handlePresenceEvent);
    socket.on('community.typing', handleTypingEvent);
    socket.on('community.error', handleRealtimeError);

    return () => {
      socket.off('community.message', handleMessage);
      socket.off('community.presence', handlePresenceEvent);
      socket.off('community.typing', handleTypingEvent);
      socket.off('community.error', handleRealtimeError);
    };
  }, [canUseRealtime, socket, numericCommunityId, handleError]);

  useEffect(() => {
    if (!canUseRealtime || !socket) {
      return () => {};
    }

    const currentChannelId = normaliseChannelId(channelId);
    const previousChannelId = channelRef.current;

    if (previousChannelId && previousChannelId !== currentChannelId) {
      socket.emit('community.channel.leave', {
        communityId: numericCommunityId,
        channelId: previousChannelId
      });
    }

    if (currentChannelId) {
      socket.emit('community.channel.join', {
        communityId: numericCommunityId,
        channelId: currentChannelId
      });
    }

    channelRef.current = currentChannelId;

    return () => {
      if (currentChannelId && socket.connected) {
        socket.emit('community.channel.leave', {
          communityId: numericCommunityId,
          channelId: currentChannelId
        });
      }
      channelRef.current = null;
    };
  }, [canUseRealtime, socket, numericCommunityId, channelId]);

  useEffect(() => {
    if (!canUseRealtime) {
      return () => {};
    }

    const controller = new AbortController();
    setStatus('loading');
    refreshPresence({ signal: controller.signal });
    return () => controller.abort();
  }, [canUseRealtime, refreshPresence]);

  useEffect(() => {
    if (!canUseRealtime || !autoPresence) {
      return () => {};
    }

    let active = true;
    const heartbeat = async () => {
      if (!active) {
        return;
      }
      try {
        await updatePresence({ status: 'online', metadata: { source: 'web' } });
      } catch (error) {
        if (!active) {
          return;
        }
        handleError(error);
      }
    };

    heartbeat();
    const interval = setInterval(heartbeat, 4 * 60 * 1000);

    return () => {
      active = false;
      clearInterval(interval);
      updatePresence({ status: 'offline', ttlMinutes: 1 }).catch(() => {});
    };
  }, [canUseRealtime, autoPresence, updatePresence, handleError]);

  return {
    connected: Boolean(canUseRealtime && connected),
    status,
    presence,
    lastError,
    joined,
    sendTyping,
    refreshPresence: () => refreshPresence(),
    updatePresence
  };
}
