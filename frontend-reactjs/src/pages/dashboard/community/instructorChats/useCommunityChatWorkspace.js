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
  listDirectMessageThreads,
  createDirectMessageThread,
  listDirectMessageMessages,
  sendDirectMessage,
  markDirectMessageThreadRead
} from '../../../../api/directMessagesApi.js';
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

const DIRECT_THREAD_PREFIX = 'dm:';

const isDirectThreadKey = (value) => typeof value === 'string' && value.startsWith(DIRECT_THREAD_PREFIX);

const extractDirectThreadId = (value) => {
  if (!isDirectThreadKey(value)) return null;
  return value.slice(DIRECT_THREAD_PREFIX.length);
};

function mergePermissions(base, override = {}) {
  return Object.keys({ ...base, ...override }).reduce((acc, key) => {
    acc[key] = Boolean(override[key] ?? base[key]);
    return acc;
  }, {});
}

function resolveMemberIdentifier(author) {
  if (!author) return null;
  if (author.id) return String(author.id);
  if (author.userId) return String(author.userId);
  if (author.email) return `email:${author.email.toLowerCase()}`;
  if (author.displayName) return `name:${author.displayName.toLowerCase()}`;
  if (author.name) return `name:${author.name.toLowerCase()}`;
  return null;
}

function normaliseTimestamp(value) {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return null;
  return timestamp;
}

function median(values) {
  if (!values?.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

function toMinutes(durationMs) {
  if (typeof durationMs !== 'number' || Number.isNaN(durationMs)) return null;
  return durationMs / 60000;
}

function deriveChannelSummary(channels, activityCounts) {
  if (!Array.isArray(channels) || channels.length === 0) return [];
  return channels
    .map((entry) => {
      const count = activityCounts.get(entry.id) ?? 0;
      const channel = entry.channel ?? {};
      const type = channel.channelType ?? entry.channelType ?? entry.metadata?.channelType ?? 'general';
      return {
        id: entry.id,
        name: channel.name ?? entry.id,
        type,
        activityCount: count,
        updatedAt: channel.updatedAt ?? entry.latestMessage?.createdAt ?? channel.updated_at ?? null
      };
    })
    .sort((a, b) => b.activityCount - a.activityCount || String(a.name).localeCompare(String(b.name)))
    .slice(0, 6);
}

function detectDirectChannel(entry) {
  const channel = entry?.channel ?? entry ?? {};
  const metadata = channel.metadata ?? entry.metadata ?? {};
  const type = channel.channelType ?? entry.channelType ?? metadata.channelType;
  if (!type && metadata.category === 'direct') return true;
  const normalised = String(type ?? '').toLowerCase();
  return ['direct', 'dm', 'direct_message', 'one_to_one', '1:1'].includes(normalised) || metadata.isDirect === true;
}

function buildSocialGraph({
  channels,
  messageCache,
  presence,
  roleAssignments,
  directThreads
}) {
  const channelActivity = new Map();
  const nodes = new Map();
  const connectors = new Map();
  const channelMembership = new Map();
  const messageLookup = new Map();
  const responseDurations = [];
  const directThreadEntries = Array.isArray(directThreads) ? directThreads : [];

  Object.entries(messageCache).forEach(([channelId, state]) => {
    const messages = Array.isArray(state?.items) ? state.items : [];
    channelActivity.set(channelId, (channelActivity.get(channelId) ?? 0) + messages.length);
    messages.forEach((message) => {
      const resolvedChannelId = message.channelId ?? channelId;
      const messageId = message.id ?? `${resolvedChannelId}-${Math.random()}`;
      messageLookup.set(messageId, { ...message, channelId: resolvedChannelId });
    });
  });

  const ensureNode = (author, channelId, timestamp) => {
    const id = resolveMemberIdentifier(author);
    if (!id) return null;
    if (!nodes.has(id)) {
      nodes.set(id, {
        id,
        displayName: author.displayName ?? author.name ?? author.email ?? 'Member',
        email: author.email ?? null,
        roles: new Set(),
        messageCount: 0,
        reactionCount: 0,
        channelIds: new Set(),
        peerIds: new Set(),
        lastActiveAt: null,
        presenceStatus: 'offline',
        client: null,
        metadata: {}
      });
    }
    const node = nodes.get(id);
    node.displayName = author.displayName ?? author.name ?? node.displayName;
    node.messageCount += 1;
    if (Array.isArray(author.roles)) {
      author.roles.forEach((roleKey) => node.roles.add(roleKey));
    }
    if (channelId) {
      node.channelIds.add(String(channelId));
      const members = channelMembership.get(channelId) ?? new Set();
      members.add(id);
      channelMembership.set(channelId, members);
    }
    const createdAt = normaliseTimestamp(timestamp ?? author.lastActiveAt);
    if (createdAt && (!node.lastActiveAt || createdAt > node.lastActiveAt)) {
      node.lastActiveAt = createdAt;
    }
    return node;
  };

  messageLookup.forEach((message) => {
    const node = ensureNode(message.author ?? {}, message.channelId, message.createdAt);
    if (!node) return;
    if (Array.isArray(message.reactions)) {
      node.reactionCount += message.reactions.reduce((total, reaction) => total + (reaction.count ?? 0), 0);
    }
  });

  messageLookup.forEach((message) => {
    const authorId = resolveMemberIdentifier(message.author);
    if (!authorId) return;
    const parentId = message.replyToMessageId ?? message.threadRootId;
    if (!parentId) return;
    const parent = messageLookup.get(parentId);
    if (!parent) return;
    const parentAuthorId = resolveMemberIdentifier(parent.author);
    if (!parentAuthorId || parentAuthorId === authorId) return;
    const channelId = message.channelId ?? parent.channelId;
    if (!connectors.has(authorId)) connectors.set(authorId, new Set());
    if (!connectors.has(parentAuthorId)) connectors.set(parentAuthorId, new Set());
    connectors.get(authorId).add(parentAuthorId);
    connectors.get(parentAuthorId).add(authorId);

    const duration = Math.max(0, (normaliseTimestamp(message.createdAt) ?? 0) - (normaliseTimestamp(parent.createdAt) ?? 0));
    if (duration) {
      responseDurations.push(duration);
    }

    const key = `${authorId}::${parentAuthorId}`;
    const edgeMap = messageLookup.edgeMap ?? new Map();
    messageLookup.edgeMap = edgeMap;
    if (!edgeMap.has(key)) {
      edgeMap.set(key, {
        sourceId: authorId,
        targetId: parentAuthorId,
        weight: 0,
        channels: new Set(),
        lastInteractionAt: null
      });
    }
    const existingEdge = edgeMap.get(key);
    existingEdge.weight += 1;
    if (channelId) {
      existingEdge.channels.add(String(channelId));
    }
    const timestampValue = normaliseTimestamp(message.createdAt);
    if (timestampValue && (!existingEdge.lastInteractionAt || timestampValue > existingEdge.lastInteractionAt)) {
      existingEdge.lastInteractionAt = timestampValue;
    }
  });

  const presenceLookup = new Map();
  (Array.isArray(presence) ? presence : []).forEach((session) => {
    if (!session?.userId) return;
    presenceLookup.set(String(session.userId), session);
    if (!nodes.has(String(session.userId))) {
      nodes.set(String(session.userId), {
        id: String(session.userId),
        displayName: `Member ${session.userId}`,
        email: null,
        roles: new Set(),
        messageCount: 0,
        reactionCount: 0,
        channelIds: new Set(),
        peerIds: new Set(),
        lastActiveAt: normaliseTimestamp(session.lastSeenAt ?? session.connectedAt),
        presenceStatus: session.status ?? 'online',
        client: session.client ?? 'web',
        metadata: {}
      });
    }
    const node = nodes.get(String(session.userId));
    node.presenceStatus = session.status ?? node.presenceStatus ?? 'online';
    node.client = session.client ?? node.client;
    const lastSeen = normaliseTimestamp(session.lastSeenAt ?? session.connectedAt ?? session.expiresAt);
    if (lastSeen && (!node.lastActiveAt || lastSeen > node.lastActiveAt)) {
      node.lastActiveAt = lastSeen;
    }
  });

  directThreadEntries.forEach((thread) => {
    const participants = Array.isArray(thread?.participants) ? thread.participants : [];
    const participantIds = participants
      .map((participant) => (participant?.userId ? String(participant.userId) : null))
      .filter(Boolean);

    participants.forEach((participant) => {
      const userId = participant?.userId ? String(participant.userId) : null;
      if (!userId) return;
      if (!nodes.has(userId)) {
        nodes.set(userId, {
          id: userId,
          displayName:
            participant.displayName ??
            participant.name ??
            participant.email ??
            `Member ${userId}`,
          email: participant.email ?? null,
          roles: new Set(),
          messageCount: 0,
          reactionCount: 0,
          channelIds: new Set(),
          peerIds: new Set(),
          lastActiveAt: null,
          presenceStatus: participant.presenceStatus ?? 'offline',
          client: participant.client ?? null,
          metadata: participant.metadata ?? {}
        });
      }
      const node = nodes.get(userId);
      const participantRoles = Array.isArray(participant.roles) ? participant.roles : [];
      participantRoles.forEach((roleKey) => node.roles.add(String(roleKey)));
      const lastMessageTimestamp = normaliseTimestamp(thread?.lastMessageAt);
      if (lastMessageTimestamp && (!node.lastActiveAt || lastMessageTimestamp > node.lastActiveAt)) {
        node.lastActiveAt = lastMessageTimestamp;
      }
    });

    for (let index = 0; index < participantIds.length; index += 1) {
      for (let peerIndex = index + 1; peerIndex < participantIds.length; peerIndex += 1) {
        const sourceId = participantIds[index];
        const targetId = participantIds[peerIndex];
        if (!connectors.has(sourceId)) connectors.set(sourceId, new Set());
        if (!connectors.has(targetId)) connectors.set(targetId, new Set());
        connectors.get(sourceId).add(targetId);
        connectors.get(targetId).add(sourceId);
      }
    }
  });

  const assignments = Array.isArray(roleAssignments) ? roleAssignments : [];
  assignments.forEach((assignment) => {
    if (!assignment?.roleKey) return;
    const userId = assignment.userId ? String(assignment.userId) : null;
    if (!userId) return;
    if (!nodes.has(userId)) {
      nodes.set(userId, {
        id: userId,
        displayName: `Member ${userId}`,
        email: null,
        roles: new Set(),
        messageCount: 0,
        reactionCount: 0,
        channelIds: new Set(),
        peerIds: new Set(),
        lastActiveAt: null,
        presenceStatus: 'offline',
        client: null,
        metadata: {}
      });
    }
    nodes.get(userId).roles.add(String(assignment.roleKey));
  });

  const nodeList = Array.from(nodes.values()).map((node) => {
    const peers = connectors.get(node.id) ?? new Set();
    return {
      id: node.id,
      displayName: node.displayName,
      email: node.email,
      roles: Array.from(node.roles),
      messageCount: node.messageCount,
      reactionCount: node.reactionCount,
      channelCount: node.channelIds.size,
      peerCount: peers.size,
      lastActiveAt: node.lastActiveAt ? new Date(node.lastActiveAt).toISOString() : null,
      presenceStatus: node.presenceStatus,
      client: node.client,
      metadata: node.metadata
    };
  });

  const presenceSummary = nodeList.reduce(
    (acc, node) => {
      const status = node.presenceStatus ?? 'offline';
      acc.total += 1;
      acc.byStatus[status] = (acc.byStatus[status] ?? 0) + 1;
      if (node.lastActiveAt) {
        acc.recent = [...acc.recent, node].sort((a, b) => {
          const aTime = normaliseTimestamp(a.lastActiveAt);
          const bTime = normaliseTimestamp(b.lastActiveAt);
          return bTime - aTime;
        }).slice(0, 6);
      }
      return acc;
    },
    { total: 0, byStatus: {}, recent: [] }
  );

  const edges = Array.from((messageLookup.edgeMap ?? new Map()).values()).map((edge) => ({
    ...edge,
    channels: Array.from(edge.channels),
    lastInteractionAt: edge.lastInteractionAt ? new Date(edge.lastInteractionAt).toISOString() : null
  }));

  const medianResponseMinutes = toMinutes(median(responseDurations));

  const topConnectors = nodeList
    .filter((node) => node.peerCount > 0 || node.messageCount > 0)
    .sort((a, b) => b.peerCount - a.peerCount || b.messageCount - a.messageCount)
    .slice(0, 6);

  const channelSummary = deriveChannelSummary(channels ?? [], channelActivity);

  const directChannels = directThreadEntries.map((thread) => ({
    id: thread.id,
    threadId: thread.threadId,
    name: thread.name ?? 'Direct thread',
    members: Array.isArray(thread.members) ? thread.members.map((member) => String(member)) : [],
    participants: Array.isArray(thread.participants) ? thread.participants : [],
    lastMessageAt: thread.lastMessageAt ?? null,
    lastMessageSnippet: thread.lastMessageSnippet ?? null,
    unreadCount: Number(thread.unreadCount ?? 0)
  }));

  const directMemberIds = new Set(directChannels.flatMap((thread) => thread.members));

  const directSuggestions = nodeList
    .filter((node) => !directMemberIds.has(node.id))
    .sort((a, b) => b.peerCount - a.peerCount || b.channelCount - a.channelCount)
    .slice(0, 5)
    .map((node) => ({
      id: node.id,
      displayName: node.displayName,
      peerCount: node.peerCount,
      channelCount: node.channelCount,
      presenceStatus: node.presenceStatus,
      lastActiveAt: node.lastActiveAt
    }));

  const roleStatsMap = new Map();
  assignments.forEach((assignment) => {
    if (!assignment?.roleKey) return;
    const userId = assignment.userId ? String(assignment.userId) : null;
    if (!userId) return;
    const node = nodeList.find((member) => member.id === userId);
    const entry = roleStatsMap.get(assignment.roleKey) ?? {
      roleKey: assignment.roleKey,
      members: 0,
      online: 0,
      away: 0
    };
    entry.members += 1;
    if (node?.presenceStatus === 'online') entry.online += 1;
    if (node?.presenceStatus === 'away') entry.away += 1;
    roleStatsMap.set(assignment.roleKey, entry);
  });

  const roleInsights = Array.from(roleStatsMap.values()).sort((a, b) => b.members - a.members);

  const viewerAssignments = assignments.filter((assignment) => assignment?.isViewer);
  const viewerId = viewerAssignments[0]?.userId ? String(viewerAssignments[0].userId) : null;

  const recipients = nodeList
    .filter((node) => node.id !== viewerId)
    .map((node) => ({
      id: node.id,
      displayName: node.displayName,
      presenceStatus: node.presenceStatus,
      lastActiveAt: node.lastActiveAt
    }));

  return {
    nodes: nodeList,
    nodeLookup: nodeList.reduce((acc, node) => {
      acc[node.id] = node;
      return acc;
    }, {}),
    edges,
    stats: {
      totalMembers: presenceSummary.total,
      presence: presenceSummary,
      response: {
        medianMinutes: medianResponseMinutes,
        samples: responseDurations.length
      },
      topChannels: channelSummary
    },
    topConnectors,
    directMessages: {
      threads: directChannels,
      suggestions: directSuggestions
    },
    roleInsights,
    recipients
  };
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

const parseJsonValue = (value, fallback) => {
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (_error) {
    return fallback;
  }
};

const normaliseDirectParticipant = (participant, viewerId) => {
  if (!participant) return null;
  const user = participant.user ?? {};
  const userId = participant.userId ?? user.id ?? null;
  if (!userId) return null;
  const firstName = participant.firstName ?? participant.first_name ?? user.firstName ?? user.first_name ?? null;
  const lastName = participant.lastName ?? participant.last_name ?? user.lastName ?? user.last_name ?? null;
  const email = participant.email ?? user.email ?? null;
  const nameFromParts = [firstName, lastName].filter(Boolean).join(' ');
  const displayNameCandidate =
    participant.displayName ??
    participant.name ??
    (nameFromParts ? nameFromParts : email);
  const roles = Array.isArray(participant.roles)
    ? participant.roles
    : participant.role
    ? [participant.role]
    : user.role
    ? [user.role]
    : [];
  return {
    id: String(userId),
    userId: String(userId),
    displayName: displayNameCandidate ?? `Member ${userId}`,
    email,
    role: participant.role ?? user.role ?? null,
    roles: roles.map((roleKey) => String(roleKey)),
    presenceStatus: participant.presenceStatus ?? null,
    client: participant.client ?? null,
    metadata: parseJsonValue(participant.metadata, {}),
    isViewer: viewerId ? String(userId) === String(viewerId) : false,
    lastReadAt: participant.lastReadAt ?? null
  };
};

const normaliseDirectMessageEntry = (message, threadId) => {
  if (!message) return null;
  const sender = message.sender ?? {};
  const firstName = sender.firstName ?? sender.first_name ?? null;
  const lastName = sender.lastName ?? sender.last_name ?? null;
  const email = sender.email ?? null;
  const role = sender.role ?? null;
  const metadata = parseJsonValue(message.metadata, {});
  const adapted = {
    id: message.id,
    channelId: `${DIRECT_THREAD_PREFIX}${message.threadId ?? threadId ?? ''}`,
    body: message.body ?? '',
    messageType: message.messageType ?? 'text',
    attachments: Array.isArray(message.attachments) ? message.attachments : [],
    metadata: { ...metadata, deliveryStatus: message.status ?? null },
    status: 'visible',
    createdAt: message.createdAt ?? message.deliveredAt ?? null,
    updatedAt: message.updatedAt ?? null,
    deliveredAt: message.deliveredAt ?? null,
    author: {
      id: message.senderId ?? sender.id ?? null,
      firstName,
      lastName,
      email,
      role
    },
    reactions: [],
    viewerReactions: []
  };
  return normaliseMessage(adapted);
};

const normaliseDirectThread = (entry, viewerId) => {
  if (!entry) return null;
  const thread = entry.thread ?? entry;
  const threadId = thread?.id ?? entry.threadId;
  if (!threadId) return null;
  const metadata = parseJsonValue(thread.metadata, {});
  const participantsRaw = Array.isArray(entry.participants ?? thread.participants)
    ? entry.participants ?? thread.participants
    : [];
  const participants = participantsRaw
    .map((participant) => normaliseDirectParticipant(participant, viewerId))
    .filter(Boolean);
  const members = participants.map((participant) => participant.userId);
  const peers = participants.filter((participant) => !participant.isViewer);
  const latestMessage = entry.latestMessage
    ? normaliseDirectMessageEntry(entry.latestMessage, threadId)
    : null;
  const subject = thread.subject ?? null;
  const name = subject && subject.trim().length > 0
    ? subject
    : peers.length
      ? peers.map((participant) => participant.displayName).join(', ')
      : 'Direct message';
  return {
    id: `${DIRECT_THREAD_PREFIX}${threadId}`,
    threadId: String(threadId),
    name,
    subject,
    isGroup: Boolean(thread.isGroup),
    metadata,
    participants,
    members,
    lastMessageAt: thread.lastMessageAt ?? latestMessage?.createdAt ?? null,
    lastMessageSnippet:
      thread.lastMessagePreview ?? latestMessage?.body?.slice(0, 120) ?? null,
    unreadCount: Number(entry.unreadCount ?? 0),
    latestMessage,
    channelType: 'direct',
    updatedAt: thread.updatedAt ?? thread.lastMessageAt ?? null
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

export default function useCommunityChatWorkspace({ communityId, token, viewerId }) {
  const interactive = Boolean(communityId && token);
  const lastCommunityRef = useRef(null);
  const loadedChannelsRef = useRef(new Set());

  const [channelsState, setChannelsState] = useState(emptyCollection);
  const [activeChannelId, setActiveChannelId] = useState(null);
  const [messageCache, setMessageCache] = useState({});
  const [directMessagesState, setDirectMessagesState] = useState(emptyCollection);
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
      setDirectMessagesState(emptyCollection);
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

  const loadDirectMessages = useCallback(
    async (signal) => {
      if (!interactive) {
        setDirectMessagesState(emptyCollection);
        return;
      }
      setDirectMessagesState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const { data } = await listDirectMessageThreads({ token, signal });
        const items = Array.isArray(data)
          ? data.map((entry) => normaliseDirectThread(entry, viewerId)).filter(Boolean)
          : [];
        setDirectMessagesState({ items, loading: false, error: null });
      } catch (error) {
        if (signal?.aborted) return;
        setDirectMessagesState((prev) => ({ ...prev, loading: false, error }));
        publishErrorNotice(error, 'Unable to load direct messages');
      }
    },
    [interactive, publishErrorNotice, token, viewerId]
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
        let fetched;
        if (isDirectThreadKey(targetChannelId)) {
          const threadId = extractDirectThreadId(targetChannelId);
          const response = await listDirectMessageMessages({
            threadId,
            token,
            limit: MESSAGE_PAGE_SIZE,
            before,
            signal
          });
          fetched = Array.isArray(response.data)
            ? response.data.map((message) => normaliseDirectMessageEntry(message, threadId)).filter(Boolean)
            : [];
        } else {
          const response = await listCommunityMessages({
            communityId,
            channelId: targetChannelId,
            token,
            limit: MESSAGE_PAGE_SIZE,
            before,
            signal
          });
          fetched = Array.isArray(response.data)
            ? response.data.map(normaliseMessage).filter(Boolean)
            : [];
        }
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
        if (isDirectThreadKey(targetChannelId)) {
          const threadId = extractDirectThreadId(targetChannelId);
          markDirectMessageThreadRead({ threadId, token }).catch(() => undefined);
          loadDirectMessages();
        } else {
          markCommunityChannelRead({ communityId, channelId: targetChannelId, token }).catch(() => undefined);
        }
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
    [
      activeChannelId,
      communityId,
      interactive,
      loadDirectMessages,
      publishErrorNotice,
      token
    ]
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
    loadDirectMessages(controller.signal);
    loadPresence(controller.signal);
    loadRoles(controller.signal);
    loadEvents(controller.signal);
    loadResources(controller.signal);
    return () => controller.abort();
  }, [
    interactive,
    loadChannels,
    loadDirectMessages,
    loadEvents,
    loadPresence,
    loadResources,
    loadRoles
  ]);

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
        if (isDirectThreadKey(targetChannelId)) {
          const threadId = extractDirectThreadId(targetChannelId);
          const response = await sendDirectMessage({ threadId, token, payload });
          const message = normaliseDirectMessageEntry(response?.data ?? response, threadId);
          appendMessage(targetChannelId, message);
          setWorkspaceNotice({
            tone: 'success',
            message: 'Direct message delivered',
            detail: 'Your message was sent privately to the selected participants.'
          });
          loadDirectMessages();
          markDirectMessageThreadRead({ threadId, token }).catch(() => undefined);
          return message;
        }

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
    [
      activeChannelId,
      appendMessage,
      communityId,
      ensureCapability,
      interactive,
      loadDirectMessages,
      publishErrorNotice,
      token
    ]
  );

  const sendDirectMessageToMember = useCallback(
    async ({ memberId, messageType = 'text', body, attachments = [], metadata = {} }) => {
      if (!interactive || !token) {
        throw new Error('Authenticate before sending direct messages.');
      }
      const participantId = Number(memberId);
      if (!Number.isFinite(participantId)) {
        throw new Error('Valid member id required for direct message.');
      }
      ensureCapability(['post', 'broadcast'], 'You do not have permission to publish messages.');
      const payload = {
        participantIds: [participantId],
        initialMessage: {
          messageType: messageType ?? 'text',
          body,
          attachments,
          metadata
        }
      };
      try {
        const response = await createDirectMessageThread({ token, payload });
        const thread = response?.data?.thread ?? response?.thread ?? null;
        const initialMessage = response?.data?.initialMessage ?? response?.initialMessage ?? null;
        if (!thread?.id) {
          throw new Error('Unable to resolve direct message thread');
        }
        await loadDirectMessages();
        const channelKey = `${DIRECT_THREAD_PREFIX}${thread.id}`;
        if (initialMessage) {
          const message = normaliseDirectMessageEntry(initialMessage, thread.id);
          appendMessage(channelKey, message);
        }
        markDirectMessageThreadRead({ threadId: thread.id, token }).catch(() => undefined);
        return channelKey;
      } catch (error) {
        publishErrorNotice(error, 'Unable to start direct message');
        throw error;
      }
    },
    [appendMessage, ensureCapability, interactive, loadDirectMessages, publishErrorNotice, token]
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

  const activeChannel = useMemo(() => {
    if (!activeChannelId) return null;
    const channel = channelsState.items.find((entry) => entry.id === activeChannelId);
    if (channel) return channel;
    return directMessagesState.items.find((thread) => thread.id === activeChannelId) ?? null;
  }, [activeChannelId, channelsState.items, directMessagesState.items]);

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

  const socialGraph = useMemo(
    () =>
      buildSocialGraph({
        channels: channelsState.items,
        messageCache,
        presence: presenceState.items,
        roleAssignments: rolesState.assignments,
        directThreads: directMessagesState.items
      }),
    [
      channelsState.items,
      directMessagesState.items,
      messageCache,
      presenceState.items,
      rolesState.assignments
    ]
  );

  return {
    interactive,
    capabilities,
    channelsState,
    activeChannelId,
    activeChannel,
    selectChannel,
    loadChannels,
    directMessagesState,
    loadDirectMessages,
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
    sendDirectMessageToMember,
    sendMessage,
    reactToMessage,
    removeReaction,
    moderateMessage,
    workspaceNotice,
    setWorkspaceNotice,
    refreshWorkspace,
    socialGraph
  };
}
