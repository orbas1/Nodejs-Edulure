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

const DEFAULT_CAPABILITIES = {
  post: false,
  broadcast: false,
  moderate: false,
  manageRoles: false,
  manageResources: false,
  scheduleEvents: false,
  hostVoice: false
};

const DEFAULT_ROLE_PERMISSIONS = {
  post: true,
  broadcast: false,
  moderate: false,
  manageRoles: false,
  manageResources: false,
  scheduleEvents: false,
  hostVoice: false
};

function mergePermissions(base, override = {}) {
  return Object.keys({ ...base, ...override }).reduce((acc, key) => {
    acc[key] = Boolean(override[key] ?? base[key]);
    return acc;
  }, {});
}

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

const normaliseRoleDefinition = (role) => {
  if (!role) return null;
  const roleKey = role.roleKey ?? role.key ?? role.name ?? '';
  if (!roleKey) return null;
  return {
    ...role,
    roleKey,
    name: role.name ?? role.label ?? roleKey,
    permissions: mergePermissions(DEFAULT_ROLE_PERMISSIONS, role.permissions)
  };
};

const normaliseRoleAssignment = (assignment) => {
  if (!assignment) return null;
  const roleKey =
    assignment.roleKey ??
    assignment.role ??
    assignment.role_id ??
    assignment.roleId ??
    (typeof assignment === 'string' ? assignment : '');
  if (!roleKey) return null;
  return {
    ...assignment,
    roleKey: String(roleKey).trim(),
    userId: assignment.userId ?? assignment.memberId ?? assignment.user_id ?? null,
    isViewer: Boolean(assignment.isViewer ?? assignment.viewer ?? assignment.isSelf)
  };
};

const deriveViewerCapabilities = (definitions, assignments) => {
  if (!Array.isArray(definitions) || !Array.isArray(assignments)) {
    return { ...DEFAULT_CAPABILITIES };
  }
  const roleMap = new Map(definitions.map((definition) => [definition.roleKey, definition.permissions]));
  const capabilityAccumulator = { ...DEFAULT_CAPABILITIES };
  const viewerAssignments = assignments.filter((assignment) => assignment?.isViewer || assignment?.userId === 'self');
  if (viewerAssignments.length === 0) {
    return capabilityAccumulator;
  }
  viewerAssignments.forEach((assignment) => {
    const permissions = roleMap.get(assignment.roleKey) ?? DEFAULT_ROLE_PERMISSIONS;
    Object.entries(permissions).forEach(([key, enabled]) => {
      if (enabled) {
        capabilityAccumulator[key] = true;
      }
    });
  });
  return capabilityAccumulator;
};

function extractWorkspaceError(error, fallbackMessage) {
  if (error?.response?.data?.message) {
    return {
      message: fallbackMessage ?? 'Request failed',
      detail: error.response.data.message
    };
  }
  if (typeof error?.message === 'string') {
    return {
      message: fallbackMessage ?? error.message,
      detail: error.message
    };
  }
  if (error?.name === 'TypeError') {
    return {
      message: fallbackMessage ?? 'Network request blocked',
      detail: 'Confirm the API CORS policy allows this origin.'
    };
  }
  return {
    message: fallbackMessage ?? 'Unexpected error',
    detail: 'Try again or contact support.'
  };
}

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
  const [capabilities, setCapabilities] = useState(DEFAULT_CAPABILITIES);
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
      setCapabilities(DEFAULT_CAPABILITIES);
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
        publishErrorNotice(error, 'Unable to load channels');
      }
    },
    [communityId, interactive, token, publishErrorNotice]
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
        publishErrorNotice(error, 'Unable to load channel history');
      }
    },
    [activeChannelId, communityId, interactive, token, publishErrorNotice]
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
        publishErrorNotice(error, 'Unable to load presence data');
      }
    },
    [communityId, interactive, token, publishErrorNotice]
  );

  const loadRoles = useCallback(
    async (signal) => {
      if (!interactive) {
        setRolesState({ ...emptyCollection, assignments: [] });
        setCapabilities(DEFAULT_CAPABILITIES);
        return;
      }
      setRolesState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const { data } = await listCommunityRoles({ communityId, token, signal });
        const definitions = Array.isArray(data?.definitions)
          ? data.definitions.map((definition) => normaliseRoleDefinition(definition)).filter(Boolean)
          : [];
        const assignments = Array.isArray(data?.assignments)
          ? data.assignments.map((assignment) => normaliseRoleAssignment(assignment)).filter(Boolean)
          : [];
        setRolesState({ items: definitions, assignments, loading: false, error: null });
        setCapabilities(deriveViewerCapabilities(definitions, assignments));
      } catch (error) {
        if (signal?.aborted) return;
        setRolesState((prev) => ({ ...prev, loading: false, error }));
        setCapabilities(DEFAULT_CAPABILITIES);
        publishErrorNotice(error, 'Unable to load community roles');
      }
    },
    [communityId, interactive, token, publishErrorNotice]
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
        publishErrorNotice(error, 'Unable to load events');
      }
    },
    [communityId, interactive, token, publishErrorNotice]
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
        publishErrorNotice(error, 'Unable to load resources');
      }
    },
    [communityId, interactive, token, publishErrorNotice]
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

  const ensureCapability = useCallback(
    (keys, fallbackMessage) => {
      const required = Array.isArray(keys) ? keys : [keys];
      const permitted = required.some((key) => capabilities[key]);
      if (permitted) return;
      const message = fallbackMessage ?? 'Insufficient permissions to perform this action.';
      setWorkspaceNotice({
        tone: 'error',
        message,
        detail: 'Contact a community moderator to request additional access.'
      });
      throw new Error(message);
    },
    [capabilities]
  );

  const publishErrorNotice = useCallback((error, fallbackMessage) => {
    const { message, detail } = extractWorkspaceError(error, fallbackMessage);
    setWorkspaceNotice({ tone: 'error', message, detail });
  }, []);

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

  useEffect(() => {
    const nextCapabilities = deriveViewerCapabilities(rolesState.items ?? [], rolesState.assignments ?? []);
    setCapabilities((current) => {
      const hasChanged = Object.keys({ ...current, ...nextCapabilities }).some(
        (key) => current[key] !== nextCapabilities[key]
      );
      return hasChanged ? nextCapabilities : current;
    });
  }, [rolesState.assignments, rolesState.items]);

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
      ensureCapability(['post', 'broadcast'], 'You do not have permission to publish messages.');
      const payload = {
        messageType: messageType ?? 'text',
        body,
        attachments,
        metadata
      };
      try {
        const { data } = await postCommunityMessage({ communityId, channelId: targetChannelId, token, payload });
        const message = normaliseMessage(data);
        appendMessage(targetChannelId, message);
        setWorkspaceNotice({
          tone: 'success',
          message: 'Message delivered',
          detail: 'Your update has been published to the channel.'
        });
        return message;
      } catch (error) {
        publishErrorNotice(error, 'Unable to send message');
        throw error;
      }
    },
    [activeChannelId, appendMessage, communityId, ensureCapability, interactive, publishErrorNotice, token]
  );

  const reactToMessage = useCallback(
    async ({ channelId, messageId, emoji }) => {
      if (!interactive || !communityId) return;
      const targetChannelId = String(channelId ?? activeChannelId ?? '');
      if (!targetChannelId || !messageId || !emoji) return;
      ensureCapability(['post', 'broadcast'], 'You do not have permission to react to messages.');
      try {
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
      } catch (error) {
        publishErrorNotice(error, 'Unable to react to message');
      }
    },
    [activeChannelId, communityId, ensureCapability, interactive, publishErrorNotice, token, updateMessage]
  );

  const removeReaction = useCallback(
    async ({ channelId, messageId, emoji }) => {
      if (!interactive || !communityId) return;
      const targetChannelId = String(channelId ?? activeChannelId ?? '');
      if (!targetChannelId || !messageId || !emoji) return;
      ensureCapability(['post', 'broadcast'], 'You do not have permission to modify reactions.');
      try {
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
      } catch (error) {
        publishErrorNotice(error, 'Unable to update reactions');
      }
    },
    [activeChannelId, communityId, ensureCapability, interactive, publishErrorNotice, token, updateMessage]
  );

  const moderateMessage = useCallback(
    async ({ channelId, messageId, action, reason }) => {
      if (!interactive || !communityId) return;
      const targetChannelId = String(channelId ?? activeChannelId ?? '');
      if (!targetChannelId || !messageId || !action) return;
      ensureCapability('moderate', 'You do not have permission to moderate messages.');
      try {
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
      } catch (error) {
        publishErrorNotice(error, 'Unable to update moderation');
        throw error;
      }
    },
    [activeChannelId, communityId, ensureCapability, interactive, publishErrorNotice, token, updateMessage]
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
      try {
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
      } catch (error) {
        publishErrorNotice(error, 'Unable to update presence');
        throw error;
      }
    },
    [communityId, interactive, publishErrorNotice, token]
  );

  const createRoleEntry = useCallback(
    async (payload) => {
      if (!interactive || !communityId) return null;
      ensureCapability('manageRoles', 'You do not have permission to manage roles.');
      try {
        const { data } = await createCommunityRole({ communityId, token, payload });
        const definition = normaliseRoleDefinition(data);
        const nextItems = [...rolesState.items, definition].filter(Boolean);
        setRolesState((prev) => ({
          ...prev,
          items: nextItems
        }));
        setCapabilities(deriveViewerCapabilities(nextItems, rolesState.assignments));
        setWorkspaceNotice({
          tone: 'success',
          message: 'Role created',
          detail: 'New role definition available for assignment.'
        });
        return data;
      } catch (error) {
        publishErrorNotice(error, 'Unable to create role');
        throw error;
      }
    },
    [communityId, ensureCapability, interactive, publishErrorNotice, rolesState.assignments, rolesState.items, token]
  );

  const assignRoleToMember = useCallback(
    async ({ userId, roleKey }) => {
      if (!interactive || !communityId || !userId || !roleKey) return;
      ensureCapability('manageRoles', 'You do not have permission to assign roles.');
      try {
        await assignCommunityRole({ communityId, userId, token, payload: { roleKey } });
        setWorkspaceNotice({
          tone: 'success',
          message: 'Member role updated',
          detail: 'Assignment saved successfully.'
        });
        loadRoles();
      } catch (error) {
        publishErrorNotice(error, 'Unable to update member role');
        throw error;
      }
    },
    [communityId, ensureCapability, interactive, loadRoles, publishErrorNotice, token]
  );

  const createEventEntry = useCallback(
    async (payload) => {
      if (!interactive || !communityId) return null;
      ensureCapability('scheduleEvents', 'You do not have permission to schedule events.');
      try {
        const { data } = await createCommunityEvent({ communityId, token, payload });
        setEventsState((prev) => ({ ...prev, items: [data, ...prev.items] }));
        setWorkspaceNotice({
          tone: 'success',
          message: 'Event scheduled',
          detail: 'Community members will be notified.'
        });
        return data;
      } catch (error) {
        publishErrorNotice(error, 'Unable to schedule event');
        throw error;
      }
    },
    [communityId, ensureCapability, interactive, publishErrorNotice, token]
  );

  const createResourceEntry = useCallback(
    async (payload) => {
      if (!interactive || !communityId) return null;
      ensureCapability('manageResources', 'You do not have permission to manage resources.');
      try {
        const { data } = await createCommunityResource({ communityId, token, payload });
        setResourcesState((prev) => ({ ...prev, items: [data, ...prev.items] }));
        setWorkspaceNotice({
          tone: 'success',
          message: 'Resource published',
          detail: 'Resource is now available in the library.'
        });
        return data;
      } catch (error) {
        publishErrorNotice(error, 'Unable to publish resource');
        throw error;
      }
    },
    [communityId, ensureCapability, interactive, publishErrorNotice, token]
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
    capabilities,
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
