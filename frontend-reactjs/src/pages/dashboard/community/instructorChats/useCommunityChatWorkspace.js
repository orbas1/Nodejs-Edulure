import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  listCommunityChannels,
  listCommunityMessages,
  postCommunityMessage,
  markCommunityChannelRead,
  addCommunityMessageReaction,
  removeCommunityMessageReaction,
  moderateCommunityMessage,
  listCommunityPresence,
  updateCommunityPresence
} from '../../../../api/communityChatApi.js';
import {
  fetchCommunityResources,
  createCommunityResource,
  listCommunityRoles,
  createCommunityRole,
  assignCommunityRole,
  listCommunityEvents,
  createCommunityEvent
} from '../../../../api/communityApi.js';

const MESSAGE_PAGE_SIZE = 30;

const initialCollection = (items = []) => ({ items, loading: false, error: null });

function deriveHasMore(meta, length) {
  if (!meta) return length === MESSAGE_PAGE_SIZE;
  if (meta?.hasMore !== undefined) return Boolean(meta.hasMore);
  if (meta?.pagination?.hasMore !== undefined) return Boolean(meta.pagination.hasMore);
  if (meta?.pagination?.next !== undefined) return Boolean(meta.pagination.next);
  if (meta?.page && meta?.totalPages) return meta.page < meta.totalPages;
  return length === MESSAGE_PAGE_SIZE;
}

export function useCommunityChatWorkspace({ communityId, token, fallback }) {
  const interactive = Boolean(token && communityId);
  const lastLoadedCommunity = useRef(null);

  const [channelsState, setChannelsState] = useState(initialCollection(fallback?.channels ?? []));
  const [activeChannelId, setActiveChannelId] = useState(fallback?.channels?.[0]?.id ?? null);
  const [messageCache, setMessageCache] = useState({});
  const [presenceState, setPresenceState] = useState(initialCollection(fallback?.presence ?? []));
  const [rolesState, setRolesState] = useState(initialCollection(fallback?.roles ?? []));
  const [eventsState, setEventsState] = useState(initialCollection(fallback?.events ?? []));
  const [resourcesState, setResourcesState] = useState(initialCollection(fallback?.resources ?? []));
  const [workspaceNotice, setWorkspaceNotice] = useState(null);

  useEffect(() => {
    setChannelsState((prev) => ({ ...prev, items: fallback?.channels ?? prev.items }));
    setPresenceState((prev) => ({ ...prev, items: fallback?.presence ?? prev.items }));
    setRolesState((prev) => ({ ...prev, items: fallback?.roles ?? prev.items }));
    setEventsState((prev) => ({ ...prev, items: fallback?.events ?? prev.items }));
    setResourcesState((prev) => ({ ...prev, items: fallback?.resources ?? prev.items }));
  }, [fallback?.channels, fallback?.presence, fallback?.roles, fallback?.events, fallback?.resources]);

  useEffect(() => {
    if (communityId !== lastLoadedCommunity.current) {
      lastLoadedCommunity.current = communityId;
      setChannelsState(initialCollection(fallback?.channels ?? []));
      setActiveChannelId(fallback?.channels?.[0]?.id ?? null);
      setMessageCache({});
      setPresenceState(initialCollection(fallback?.presence ?? []));
      setRolesState(initialCollection(fallback?.roles ?? []));
      setEventsState(initialCollection(fallback?.events ?? []));
      setResourcesState(initialCollection(fallback?.resources ?? []));
      setWorkspaceNotice(null);
    }
  }, [communityId, fallback?.channels, fallback?.events, fallback?.presence, fallback?.resources, fallback?.roles]);

  const selectChannel = useCallback((channelId) => {
    setActiveChannelId(channelId);
  }, []);

  const loadChannels = useCallback(
    async (signal) => {
      if (!communityId) {
        setChannelsState(initialCollection([]));
        setActiveChannelId(null);
        return;
      }

      if (!interactive) {
        setChannelsState(initialCollection(fallback?.channels ?? []));
        setActiveChannelId((prev) => prev ?? fallback?.channels?.[0]?.id ?? null);
        return;
      }

      setChannelsState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const { data } = await listCommunityChannels({ communityId, token, signal });
        const nextChannels = Array.isArray(data) ? data : [];
        setChannelsState({ items: nextChannels, loading: false, error: null });
        setActiveChannelId((prev) => prev ?? nextChannels[0]?.id ?? null);
      } catch (error) {
        if (signal?.aborted) return;
        setChannelsState((prev) => ({ ...prev, loading: false, error }));
      }
    },
    [communityId, interactive, token, fallback?.channels]
  );

  const loadMessages = useCallback(
    async ({ channelId, before, refresh = false } = {}, signal) => {
      const targetChannel = channelId ?? activeChannelId;
      if (!communityId || !targetChannel) return;

      const existing = messageCache[targetChannel] ?? {
        items: fallback?.messages?.[targetChannel] ?? [],
        hasMore: false,
        loading: false,
        error: null
      };

      if (!interactive) {
        setMessageCache((prev) => ({
          ...prev,
          [targetChannel]: { ...existing, items: fallback?.messages?.[targetChannel] ?? existing.items }
        }));
        return;
      }

      setMessageCache((prev) => ({
        ...prev,
        [targetChannel]: {
          ...existing,
          loading: true,
          error: null,
          items: refresh ? [] : existing.items
        }
      }));

      try {
        const response = await listCommunityMessages({
          communityId,
          channelId: targetChannel,
          token,
          limit: MESSAGE_PAGE_SIZE,
          before,
          signal
        });
        const fetched = Array.isArray(response.data) ? response.data : [];
        const combined = refresh ? fetched : [...fetched.reverse(), ...existing.items];
        setMessageCache((prev) => ({
          ...prev,
          [targetChannel]: {
            items: combined,
            hasMore: deriveHasMore(response.meta, fetched.length),
            loading: false,
            error: null
          }
        }));
        await markCommunityChannelRead({ communityId, channelId: targetChannel, token });
      } catch (error) {
        if (signal?.aborted) return;
        setMessageCache((prev) => ({
          ...prev,
          [targetChannel]: {
            ...existing,
            loading: false,
            error
          }
        }));
      }
    },
    [activeChannelId, communityId, interactive, token, messageCache, fallback?.messages]
  );

  const loadPresence = useCallback(
    async (signal) => {
      if (!communityId) {
        setPresenceState(initialCollection([]));
        return;
      }
      if (!interactive) {
        setPresenceState(initialCollection(fallback?.presence ?? []));
        return;
      }
      setPresenceState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const { data } = await listCommunityPresence({ communityId, token, signal });
        setPresenceState({ items: Array.isArray(data) ? data : [], loading: false, error: null });
      } catch (error) {
        if (signal?.aborted) return;
        setPresenceState((prev) => ({ ...prev, loading: false, error }));
      }
    },
    [communityId, interactive, token, fallback?.presence]
  );

  const loadRoles = useCallback(
    async (signal) => {
      if (!communityId) {
        setRolesState(initialCollection([]));
        return;
      }
      if (!interactive) {
        setRolesState(initialCollection(fallback?.roles ?? []));
        return;
      }
      setRolesState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const { data } = await listCommunityRoles({ communityId, token, signal });
        setRolesState({ items: Array.isArray(data) ? data : [], loading: false, error: null });
      } catch (error) {
        if (signal?.aborted) return;
        setRolesState((prev) => ({ ...prev, loading: false, error }));
      }
    },
    [communityId, interactive, token, fallback?.roles]
  );

  const loadEvents = useCallback(
    async (signal) => {
      if (!communityId) {
        setEventsState(initialCollection([]));
        return;
      }
      if (!interactive) {
        setEventsState(initialCollection(fallback?.events ?? []));
        return;
      }
      setEventsState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const { data } = await listCommunityEvents({ communityId, token, signal });
        setEventsState({ items: Array.isArray(data) ? data : [], loading: false, error: null });
      } catch (error) {
        if (signal?.aborted) return;
        setEventsState((prev) => ({ ...prev, loading: false, error }));
      }
    },
    [communityId, interactive, token, fallback?.events]
  );

  const loadResources = useCallback(
    async (signal) => {
      if (!communityId) {
        setResourcesState(initialCollection([]));
        return;
      }
      if (!interactive) {
        setResourcesState(initialCollection(fallback?.resources ?? []));
        return;
      }
      setResourcesState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const { data } = await fetchCommunityResources({ communityId, token, signal });
        setResourcesState({ items: Array.isArray(data) ? data : [], loading: false, error: null });
      } catch (error) {
        if (signal?.aborted) return;
        setResourcesState((prev) => ({ ...prev, loading: false, error }));
      }
    },
    [communityId, interactive, token, fallback?.resources]
  );

  const refreshWorkspace = useCallback(() => {
    const controller = new AbortController();
    loadChannels(controller.signal);
    loadPresence(controller.signal);
    loadRoles(controller.signal);
    loadEvents(controller.signal);
    loadResources(controller.signal);
    return () => controller.abort();
  }, [loadChannels, loadEvents, loadPresence, loadResources, loadRoles]);

  useEffect(() => {
    if (!communityId) return undefined;
    const abort = refreshWorkspace();
    return () => {
      if (typeof abort === 'function') abort();
    };
  }, [communityId, refreshWorkspace]);

  const appendMessage = useCallback((channelId, message) => {
    if (!channelId || !message) return;
    setMessageCache((prev) => {
      const current = prev[channelId] ?? {
        items: [],
        hasMore: false,
        loading: false,
        error: null
      };
      const items = [...current.items, message];
      return {
        ...prev,
        [channelId]: { ...current, items }
      };
    });
  }, []);

  const updateMessage = useCallback((channelId, messageId, updater) => {
    if (!channelId || !messageId) return;
    setMessageCache((prev) => {
      const current = prev[channelId];
      if (!current) return prev;
      const items = current.items.map((item) => (item.id === messageId ? updater(item) : item));
      return {
        ...prev,
        [channelId]: { ...current, items }
      };
    });
  }, []);

  const sendMessage = useCallback(
    async (payload) => {
      const channelId = payload?.channelId ?? activeChannelId;
      if (!communityId || !channelId) throw new Error('Select a channel before sending messages.');

      if (!interactive) {
        const optimistic = {
          id: `local-${Date.now()}`,
          body: payload?.body,
          messageType: payload?.messageType ?? 'text',
          attachmentUrl: payload?.attachmentUrl,
          attachmentLabel: payload?.attachmentLabel,
          author: { displayName: 'You', role: 'instructor' },
          createdAt: new Date().toISOString(),
          metadata: payload?.metadataNote ? { note: payload.metadataNote } : undefined
        };
        appendMessage(channelId, optimistic);
        setWorkspaceNotice({
          tone: 'info',
          message: 'Offline mode',
          detail: 'Message stored locally until sync is available.'
        });
        return optimistic;
      }

      const response = await postCommunityMessage({ communityId, channelId, token, payload });
      appendMessage(channelId, response.data);
      setWorkspaceNotice({
        tone: 'success',
        message: 'Message delivered',
        detail: 'Your update has been delivered to the channel.'
      });
      return response.data;
    },
    [activeChannelId, appendMessage, communityId, interactive, token]
  );

  const reactToMessage = useCallback(
    async ({ channelId, messageId, emoji }) => {
      if (!communityId || !channelId || !messageId) return;
      if (!interactive) {
        updateMessage(channelId, messageId, (message) => {
          const reactions = Array.isArray(message.reactions) ? message.reactions : [];
          const existing = reactions.find((reaction) => reaction.emoji === emoji);
          if (existing) {
            return {
              ...message,
              reactions: reactions.map((reaction) =>
                reaction.emoji === emoji ? { ...reaction, count: (reaction.count ?? 0) + 1 } : reaction
              )
            };
          }
          return {
            ...message,
            reactions: [...reactions, { emoji, count: 1 }]
          };
        });
        return;
      }
      await addCommunityMessageReaction({ communityId, channelId, messageId, token, emoji });
      updateMessage(channelId, messageId, (message) => {
        const reactions = Array.isArray(message.reactions) ? message.reactions : [];
        const existing = reactions.find((reaction) => reaction.emoji === emoji);
        if (existing) {
          return {
            ...message,
            reactions: reactions.map((reaction) =>
              reaction.emoji === emoji ? { ...reaction, count: (reaction.count ?? 0) + 1 } : reaction
            )
          };
        }
        return {
          ...message,
          reactions: [...reactions, { emoji, count: 1 }]
        };
      });
    },
    [communityId, interactive, token, updateMessage]
  );

  const removeReaction = useCallback(
    async ({ channelId, messageId, emoji }) => {
      if (!communityId || !channelId || !messageId) return;
      if (!interactive) {
        updateMessage(channelId, messageId, (message) => ({
          ...message,
          reactions: (message.reactions ?? []).filter((reaction) => reaction.emoji !== emoji)
        }));
        return;
      }
      await removeCommunityMessageReaction({ communityId, channelId, messageId, token, emoji });
      updateMessage(channelId, messageId, (message) => ({
        ...message,
        reactions: (message.reactions ?? []).filter((reaction) => reaction.emoji !== emoji)
      }));
    },
    [communityId, interactive, token, updateMessage]
  );

  const moderateMessage = useCallback(
    async ({ channelId, messageId, payload }) => {
      if (!communityId || !channelId || !messageId) return;
      if (!interactive) {
        updateMessage(channelId, messageId, (message) => ({
          ...message,
          moderation: { status: payload?.action ?? 'flagged', note: payload?.note }
        }));
        return;
      }
      await moderateCommunityMessage({ communityId, channelId, messageId, token, payload });
      updateMessage(channelId, messageId, (message) => ({
        ...message,
        moderation: { status: payload?.action, note: payload?.note }
      }));
    },
    [communityId, interactive, token, updateMessage]
  );

  const updatePresenceStatus = useCallback(
    async (payload) => {
      if (!communityId) return;
      if (!interactive) {
        setPresenceState((prev) => ({
          ...prev,
          items: prev.items.map((record) =>
            record.userId === payload?.userId ? { ...record, status: payload.status, metadata: payload.metadata } : record
          )
        }));
        setWorkspaceNotice({
          tone: 'info',
          message: 'Presence cached',
          detail: 'Presence updated locally until you connect.'
        });
        return;
      }
      const { data } = await updateCommunityPresence({ communityId, token, payload });
      setPresenceState((prev) => ({
        ...prev,
        items: prev.items.map((record) => (record.userId === data?.userId ? { ...record, ...data } : record))
      }));
      setWorkspaceNotice({
        tone: 'success',
        message: 'Presence updated',
        detail: 'Community roster has been refreshed.'
      });
    },
    [communityId, interactive, token]
  );

  const createRoleEntry = useCallback(
    async (payload) => {
      if (!communityId) return null;
      if (!interactive) {
        const draftRole = {
          id: `local-role-${Date.now()}`,
          ...payload,
          members: 0,
          createdAt: new Date().toISOString()
        };
        setRolesState((prev) => ({ ...prev, items: [...prev.items, draftRole] }));
        setWorkspaceNotice({
          tone: 'info',
          message: 'Role drafted',
          detail: 'Role stored locally until sync resumes.'
        });
        return draftRole;
      }
      const { data } = await createCommunityRole({ communityId, token, payload });
      setRolesState((prev) => ({ ...prev, items: [...prev.items, data] }));
      setWorkspaceNotice({
        tone: 'success',
        message: 'Role created',
        detail: 'New responsibilities are now available to assign.'
      });
      return data;
    },
    [communityId, interactive, token]
  );

  const assignRoleToMember = useCallback(
    async ({ userId, payload }) => {
      if (!communityId || !userId) return;
      if (!interactive) {
        setWorkspaceNotice({
          tone: 'info',
          message: 'Assignment pending',
          detail: 'Role assignments will sync once online.'
        });
        return;
      }
      await assignCommunityRole({ communityId, userId, token, payload });
      setWorkspaceNotice({
        tone: 'success',
        message: 'Role assignment updated',
        detail: 'Member permissions updated successfully.'
      });
    },
    [communityId, interactive, token]
  );

  const createEventEntry = useCallback(
    async (payload) => {
      if (!communityId) return null;
      if (!interactive) {
        const draftEvent = {
          id: `local-event-${Date.now()}`,
          ...payload,
          status: 'draft',
          createdAt: new Date().toISOString()
        };
        setEventsState((prev) => ({ ...prev, items: [...prev.items, draftEvent] }));
        setWorkspaceNotice({
          tone: 'info',
          message: 'Event drafted',
          detail: 'Event saved locally until you reconnect.'
        });
        return draftEvent;
      }
      const { data } = await createCommunityEvent({ communityId, token, payload });
      setEventsState((prev) => ({ ...prev, items: [...prev.items, data] }));
      setWorkspaceNotice({
        tone: 'success',
        message: 'Event scheduled',
        detail: 'Members will be notified about the new session.'
      });
      return data;
    },
    [communityId, interactive, token]
  );

  const createResourceEntry = useCallback(
    async (payload) => {
      if (!communityId) return null;
      if (!interactive) {
        const draftResource = {
          id: `local-resource-${Date.now()}`,
          ...payload,
          createdAt: new Date().toISOString()
        };
        setResourcesState((prev) => ({ ...prev, items: [draftResource, ...prev.items] }));
        setWorkspaceNotice({
          tone: 'info',
          message: 'Resource drafted',
          detail: 'Resource will sync when a connection is available.'
        });
        return draftResource;
      }
      const { data } = await createCommunityResource({ communityId, token, payload });
      setResourcesState((prev) => ({ ...prev, items: [data, ...prev.items] }));
      setWorkspaceNotice({
        tone: 'success',
        message: 'Resource published',
        detail: 'Learning library has been updated.'
      });
      return data;
    },
    [communityId, interactive, token]
  );

  const activeMessages = useMemo(() => {
    if (!activeChannelId) {
      return { ...initialCollection([]), hasMore: false };
    }
    return (
      messageCache[activeChannelId] ?? {
        ...initialCollection(fallback?.messages?.[activeChannelId] ?? []),
        hasMore: false
      }
    );
  }, [activeChannelId, messageCache, fallback?.messages]);

  return {
    channelsState,
    activeChannelId,
    selectChannel,
    loadChannels,
    messagesState: activeMessages,
    loadMessages,
    presenceState,
    loadPresence,
    updatePresenceStatus,
    rolesState,
    loadRoles,
    createRoleEntry,
    assignRoleToMember,
    eventsState,
    loadEvents,
    createEventEntry,
    resourcesState,
    loadResources,
    createResourceEntry,
    sendMessage,
    reactToMessage,
    removeReaction,
    moderateMessage,
    workspaceNotice,
    setWorkspaceNotice,
    refreshWorkspace,
    interactive
  };
}

export default useCommunityChatWorkspace;
