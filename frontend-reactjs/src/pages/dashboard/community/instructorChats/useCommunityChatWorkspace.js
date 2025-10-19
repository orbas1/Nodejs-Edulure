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

const emptyCollection = { items: [], loading: false, error: null };

const normaliseChannelEntry = (entry) => {
  const channel = entry?.channel ?? entry ?? {};
  return {
    id: String(channel.id ?? ''),
    channel,
    membership: entry?.membership ?? null,
    latestMessage: entry?.latestMessage ?? null,
    unreadCount: Number(entry?.unreadCount ?? 0)
  };
};

const normaliseMessage = (message) => {
  if (!message) return null;
  const attachments = Array.isArray(message.attachments) ? message.attachments : [];
  const metadata = typeof message.metadata === 'object' && message.metadata !== null ? message.metadata : {};
  const author = message.author ?? {};
  const displayName = [author.firstName, author.lastName]
    .filter((part) => Boolean(part && part.trim()))
    .join(' ');
  return {
    id: String(message.id),
    channelId: message.channelId,
    body: message.body ?? '',
    messageType: message.messageType ?? 'text',
    attachments,
    metadata,
    status: message.status ?? 'visible',
    pinned: Boolean(message.pinned),
    threadRootId: message.threadRootId ?? null,
    replyToMessageId: message.replyToMessageId ?? null,
    createdAt: message.createdAt ?? message.deliveredAt ?? null,
    updatedAt: message.updatedAt ?? null,
    author: {
      id: author.id ?? message.authorId ?? null,
      displayName: displayName || author.email || `Member ${message.authorId ?? ''}`,
      role: author.role ?? null,
      email: author.email ?? null
    },
    reactions: Array.isArray(message.reactions) ? message.reactions : [],
    viewerReactions: Array.isArray(message.viewerReactions) ? message.viewerReactions : []
  };
};

const normalisePresence = (session) => ({
  id: session?.id ? String(session.id) : `${session?.userId ?? 'session'}-${session?.sessionId ?? ''}`,
  userId: session?.userId ?? null,
  sessionId: session?.sessionId ?? null,
  client: session?.client ?? 'web',
  status: session?.status ?? 'online',
  connectedAt: session?.connectedAt ?? null,
  lastSeenAt: session?.lastSeenAt ?? null,
  expiresAt: session?.expiresAt ?? null,
  metadata: session?.metadata ?? {}
});

export default function useCommunityChatWorkspace({ communityId, token }) {
  const interactive = Boolean(communityId && token);
  const lastCommunityRef = useRef(null);
  const loadedChannelsRef = useRef(new Set());

  const [channelsState, setChannelsState] = useState(emptyCollection);
  const [activeChannelId, setActiveChannelId] = useState(null);
  const [messageCache, setMessageCache] = useState({});
  const [presenceState, setPresenceState] = useState(emptyCollection);
  const [rolesState, setRolesState] = useState({ ...emptyCollection, assignments: [] });
  const [eventsState, setEventsState] = useState(emptyCollection);
  const [resourcesState, setResourcesState] = useState(emptyCollection);
  const [workspaceNotice, setWorkspaceNotice] = useState(null);

  useEffect(() => {
    if (communityId !== lastCommunityRef.current) {
      lastCommunityRef.current = communityId;
      loadedChannelsRef.current = new Set();
      setChannelsState(emptyCollection);
      setActiveChannelId(null);
      setMessageCache({});
      setPresenceState(emptyCollection);
      setRolesState({ ...emptyCollection, assignments: [] });
      setEventsState(emptyCollection);
      setResourcesState(emptyCollection);
      setWorkspaceNotice(null);
    }
  }, [communityId]);

  const selectChannel = useCallback((channelId) => {
    setActiveChannelId(channelId ? String(channelId) : null);
  }, []);

  const loadChannels = useCallback(
    async (signal) => {
      if (!interactive) {
        setChannelsState(emptyCollection);
        return;
      }
      setChannelsState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const { data } = await listCommunityChannels({ communityId, token, signal });
        const items = Array.isArray(data)
          ? data
              .map(normaliseChannelEntry)
              .filter((entry) => entry.id)
          : [];
        setChannelsState({ items, loading: false, error: null });
        setActiveChannelId((current) => {
          if (current && items.some((item) => item.id === current)) {
            return current;
          }
          return items[0]?.id ?? null;
        });
      } catch (error) {
        if (signal?.aborted) return;
        setChannelsState((prev) => ({ ...prev, loading: false, error }));
      }
    },
    [communityId, interactive, token]
  );

  const loadMessages = useCallback(
    async ({ channelId, before, refresh = false } = {}, signal) => {
      if (!interactive) return;
      const targetChannelId = String(channelId ?? activeChannelId ?? '');
      if (!communityId || !targetChannelId) return;

      setMessageCache((prev) => {
        const existing = prev[targetChannelId] ?? { ...emptyCollection, hasMore: false };
        return {
          ...prev,
          [targetChannelId]: {
            ...existing,
            loading: true,
            error: null,
            items: refresh ? [] : existing.items,
            hasMore: existing.hasMore ?? false
          }
        };
      });

      try {
        const response = await listCommunityMessages({
          communityId,
          channelId: targetChannelId,
          token,
          limit: MESSAGE_PAGE_SIZE,
          before,
          signal
        });
        const fetched = Array.isArray(response.data)
          ? response.data.map(normaliseMessage).filter(Boolean)
          : [];
        const chronological = fetched.slice().reverse();
        setMessageCache((prev) => {
          const existing = prev[targetChannelId] ?? { ...emptyCollection, hasMore: false };
          const nextItems = refresh
            ? chronological
            : [...chronological, ...(existing.items ?? [])];
          return {
            ...prev,
            [targetChannelId]: {
              items: nextItems,
              loading: false,
              error: null,
              hasMore: fetched.length === MESSAGE_PAGE_SIZE
            }
          };
        });
        markCommunityChannelRead({ communityId, channelId: targetChannelId, token }).catch(() => undefined);
      } catch (error) {
        if (signal?.aborted) return;
        setMessageCache((prev) => {
          const existing = prev[targetChannelId] ?? { ...emptyCollection, hasMore: false };
          return {
            ...prev,
            [targetChannelId]: {
              ...existing,
              loading: false,
              error
            }
          };
        });
      }
    },
    [activeChannelId, communityId, interactive, token]
  );

  const loadPresence = useCallback(
    async (signal) => {
      if (!interactive) {
        setPresenceState(emptyCollection);
        return;
      }
      setPresenceState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const { data } = await listCommunityPresence({ communityId, token, signal });
        const items = Array.isArray(data) ? data.map(normalisePresence) : [];
        setPresenceState({ items, loading: false, error: null });
      } catch (error) {
        if (signal?.aborted) return;
        setPresenceState((prev) => ({ ...prev, loading: false, error }));
      }
    },
    [communityId, interactive, token]
  );

  const loadRoles = useCallback(
    async (signal) => {
      if (!interactive) {
        setRolesState({ ...emptyCollection, assignments: [] });
        return;
      }
      setRolesState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const { data } = await listCommunityRoles({ communityId, token, signal });
        const definitions = Array.isArray(data?.definitions) ? data.definitions : [];
        const assignments = Array.isArray(data?.assignments) ? data.assignments : [];
        setRolesState({ items: definitions, assignments, loading: false, error: null });
      } catch (error) {
        if (signal?.aborted) return;
        setRolesState((prev) => ({ ...prev, loading: false, error }));
      }
    },
    [communityId, interactive, token]
  );

  const loadEvents = useCallback(
    async (signal) => {
      if (!interactive) {
        setEventsState(emptyCollection);
        return;
      }
      setEventsState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const { data } = await listCommunityEvents({ communityId, token, signal });
        const items = Array.isArray(data) ? data : [];
        setEventsState({ items, loading: false, error: null });
      } catch (error) {
        if (signal?.aborted) return;
        setEventsState((prev) => ({ ...prev, loading: false, error }));
      }
    },
    [communityId, interactive, token]
  );

  const loadResources = useCallback(
    async (signal) => {
      if (!interactive) {
        setResourcesState(emptyCollection);
        return;
      }
      setResourcesState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const { data } = await fetchCommunityResources({ communityId, token, signal });
        const items = Array.isArray(data) ? data : [];
        setResourcesState({ items, loading: false, error: null });
      } catch (error) {
        if (signal?.aborted) return;
        setResourcesState((prev) => ({ ...prev, loading: false, error }));
      }
    },
    [communityId, interactive, token]
  );

  const refreshWorkspace = useCallback(() => {
    if (!interactive) return () => undefined;
    const controller = new AbortController();
    loadChannels(controller.signal);
    loadPresence(controller.signal);
    loadRoles(controller.signal);
    loadEvents(controller.signal);
    loadResources(controller.signal);
    return () => controller.abort();
  }, [interactive, loadChannels, loadEvents, loadPresence, loadResources, loadRoles]);

  useEffect(() => {
    if (!interactive) return undefined;
    const abort = refreshWorkspace();
    return () => {
      if (typeof abort === 'function') abort();
    };
  }, [interactive, refreshWorkspace]);

  useEffect(() => {
    if (!interactive || !activeChannelId) return undefined;
    if (loadedChannelsRef.current.has(activeChannelId)) return undefined;
    const controller = new AbortController();
    loadMessages({ channelId: activeChannelId, refresh: true }, controller.signal);
    loadedChannelsRef.current.add(activeChannelId);
    return () => controller.abort();
  }, [activeChannelId, interactive, loadMessages]);

  const appendMessage = useCallback((channelId, message) => {
    if (!channelId || !message) return;
    setMessageCache((prev) => {
      const existing = prev[channelId] ?? { ...emptyCollection, hasMore: false };
      return {
        ...prev,
        [channelId]: {
          ...existing,
          items: [...(existing.items ?? []), message]
        }
      };
    });
  }, []);

  const updateMessage = useCallback((channelId, messageId, updater) => {
    if (!channelId || !messageId || typeof updater !== 'function') return;
    setMessageCache((prev) => {
      const existing = prev[channelId];
      if (!existing) return prev;
      const items = existing.items.map((item) => (item.id === String(messageId) ? updater(item) : item));
      return {
        ...prev,
        [channelId]: { ...existing, items }
      };
    });
  }, []);

  const sendMessage = useCallback(
    async ({ channelId, messageType, body, attachments = [], metadata = {} }) => {
      const targetChannelId = String(channelId ?? activeChannelId ?? '');
      if (!interactive || !communityId || !targetChannelId) {
        throw new Error('Select a channel before sending messages.');
      }
      const payload = {
        messageType: messageType ?? 'text',
        body,
        attachments,
        metadata
      };
      const { data } = await postCommunityMessage({ communityId, channelId: targetChannelId, token, payload });
      const message = normaliseMessage(data);
      appendMessage(targetChannelId, message);
      setWorkspaceNotice({
        tone: 'success',
        message: 'Message delivered',
        detail: 'Your update has been published to the channel.'
      });
      return message;
    },
    [activeChannelId, appendMessage, communityId, interactive, token]
  );

  const reactToMessage = useCallback(
    async ({ channelId, messageId, emoji }) => {
      if (!interactive || !communityId) return;
      const targetChannelId = String(channelId ?? activeChannelId ?? '');
      if (!targetChannelId || !messageId || !emoji) return;
      await addCommunityMessageReaction({ communityId, channelId: targetChannelId, messageId, token, emoji });
      updateMessage(targetChannelId, messageId, (message) => {
        const reactions = Array.isArray(message.reactions) ? [...message.reactions] : [];
        const existing = reactions.find((reaction) => reaction.emoji === emoji);
        if (existing) {
          existing.count = Number(existing.count ?? 0) + 1;
        } else {
          reactions.push({ emoji, count: 1 });
        }
        const viewerReactions = Array.isArray(message.viewerReactions)
          ? Array.from(new Set([...message.viewerReactions, emoji]))
          : [emoji];
        return { ...message, reactions, viewerReactions };
      });
    },
    [activeChannelId, communityId, interactive, token, updateMessage]
  );

  const removeReaction = useCallback(
    async ({ channelId, messageId, emoji }) => {
      if (!interactive || !communityId) return;
      const targetChannelId = String(channelId ?? activeChannelId ?? '');
      if (!targetChannelId || !messageId || !emoji) return;
      await removeCommunityMessageReaction({ communityId, channelId: targetChannelId, messageId, token, emoji });
      updateMessage(targetChannelId, messageId, (message) => {
        const reactions = Array.isArray(message.reactions)
          ? message.reactions.filter((reaction) => reaction.emoji !== emoji)
          : [];
        const viewerReactions = Array.isArray(message.viewerReactions)
          ? message.viewerReactions.filter((reaction) => reaction !== emoji)
          : [];
        return { ...message, reactions, viewerReactions };
      });
    },
    [activeChannelId, communityId, interactive, token, updateMessage]
  );

  const moderateMessage = useCallback(
    async ({ channelId, messageId, action, reason }) => {
      if (!interactive || !communityId) return;
      const targetChannelId = String(channelId ?? activeChannelId ?? '');
      if (!targetChannelId || !messageId || !action) return;
      const { data } = await moderateCommunityMessage({
        communityId,
        channelId: targetChannelId,
        messageId,
        token,
        payload: { action, reason }
      });
      const updated = normaliseMessage(data?.message ?? data);
      if (updated) {
        updateMessage(targetChannelId, messageId, () => updated);
      }
      setWorkspaceNotice({
        tone: 'success',
        message: 'Message moderation updated',
        detail: 'The message visibility has been updated.'
      });
    },
    [activeChannelId, communityId, interactive, token, updateMessage]
  );

  const updatePresenceStatus = useCallback(
    async ({ status, client, ttlMinutes, metadata }) => {
      if (!interactive || !communityId) return null;
      const payload = {
        status: status ?? 'online',
        client: client ?? 'web',
        ttlMinutes: Number(ttlMinutes ?? 15),
        metadata: metadata ?? {}
      };
      const { data } = await updateCommunityPresence({ communityId, token, payload });
      const session = normalisePresence(data);
      setPresenceState((prev) => {
        const items = prev.items.some((item) => item.sessionId === session.sessionId)
          ? prev.items.map((item) => (item.sessionId === session.sessionId ? session : item))
          : [...prev.items, session];
        return { ...prev, items };
      });
      setWorkspaceNotice({
        tone: 'success',
        message: 'Presence updated',
        detail: 'Your availability has been broadcast to the community.'
      });
      return session;
    },
    [communityId, interactive, token]
  );

  const createRoleEntry = useCallback(
    async (payload) => {
      if (!interactive || !communityId) return null;
      const { data } = await createCommunityRole({ communityId, token, payload });
      setRolesState((prev) => ({
        ...prev,
        items: [...prev.items, data]
      }));
      setWorkspaceNotice({
        tone: 'success',
        message: 'Role created',
        detail: 'New role definition available for assignment.'
      });
      return data;
    },
    [communityId, interactive, token]
  );

  const assignRoleToMember = useCallback(
    async ({ userId, roleKey }) => {
      if (!interactive || !communityId || !userId || !roleKey) return;
      await assignCommunityRole({ communityId, userId, token, payload: { roleKey } });
      setWorkspaceNotice({
        tone: 'success',
        message: 'Member role updated',
        detail: 'Assignment saved successfully.'
      });
      loadRoles();
    },
    [communityId, interactive, loadRoles, token]
  );

  const createEventEntry = useCallback(
    async (payload) => {
      if (!interactive || !communityId) return null;
      const { data } = await createCommunityEvent({ communityId, token, payload });
      setEventsState((prev) => ({ ...prev, items: [data, ...prev.items] }));
      setWorkspaceNotice({
        tone: 'success',
        message: 'Event scheduled',
        detail: 'Community members will be notified.'
      });
      return data;
    },
    [communityId, interactive, token]
  );

  const createResourceEntry = useCallback(
    async (payload) => {
      if (!interactive || !communityId) return null;
      const { data } = await createCommunityResource({ communityId, token, payload });
      setResourcesState((prev) => ({ ...prev, items: [data, ...prev.items] }));
      setWorkspaceNotice({
        tone: 'success',
        message: 'Resource published',
        detail: 'Resource is now available in the library.'
      });
      return data;
    },
    [communityId, interactive, token]
  );

  const activeChannel = useMemo(
    () => channelsState.items.find((entry) => entry.id === activeChannelId) ?? null,
    [activeChannelId, channelsState.items]
  );

  const messagesState = useMemo(
    () =>
      messageCache[activeChannelId] ?? {
        items: [],
        loading: false,
        error: null,
        hasMore: false
      },
    [activeChannelId, messageCache]
  );

  return {
    interactive,
    channelsState,
    activeChannelId,
    activeChannel,
    selectChannel,
    loadChannels,
    messagesState,
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
    refreshWorkspace
  };
}
