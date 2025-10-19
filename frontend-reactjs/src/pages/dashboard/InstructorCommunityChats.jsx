import { useCallback, useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  ChatBubbleBottomCenterTextIcon,
  ArrowPathIcon,
  PaperAirplaneIcon,
  VideoCameraIcon,
  MusicalNoteIcon,
  DocumentTextIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

import DashboardStateMessage from '../../components/dashboard/DashboardStateMessage.jsx';
import DashboardActionFeedback from '../../components/dashboard/DashboardActionFeedback.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
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
} from '../../api/communityChatApi.js';
import {
  fetchCommunityResources,
  createCommunityResource,
  listCommunityRoles,
  createCommunityRole,
  assignCommunityRole,
  listCommunityEvents,
  createCommunityEvent
} from '../../api/communityApi.js';

const MESSAGE_PAGE_SIZE = 25;

const channelTypeLabels = {
  general: { label: 'Discussion', icon: ChatBubbleBottomCenterTextIcon },
  broadcast: { label: 'Broadcast', icon: ShieldCheckIcon },
  voice: { label: 'Voice room', icon: MusicalNoteIcon },
  'voice-stage': { label: 'Stage', icon: VideoCameraIcon },
  live: { label: 'Live session', icon: VideoCameraIcon }
};

function resolveChannelLabel(channel) {
  const typeMeta = channelTypeLabels[channel.channelType];
  if (!typeMeta) {
    return { label: 'Channel', icon: ChatBubbleBottomCenterTextIcon };
  }
  return typeMeta;
}

function parseCommunityId(rawId) {
  if (!rawId) return null;
  if (rawId.startsWith('community-')) {
    return rawId.replace('community-', '');
  }
  return rawId;
}

function formatDateTime(value, options = {}) {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en', {
    dateStyle: options.dateStyle ?? 'medium',
    timeStyle: options.timeStyle ?? 'short'
  }).format(date);
}

function formatRelative(value) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const diff = Date.now() - date.getTime();
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  const minutes = Math.round(diff / 60000);
  if (Math.abs(minutes) < 60) {
    return rtf.format(-minutes, 'minute');
  }
  const hours = Math.round(diff / 3600000);
  if (Math.abs(hours) < 24) {
    return rtf.format(-hours, 'hour');
  }
  const days = Math.round(diff / 86400000);
  return rtf.format(-days, 'day');
}

function normaliseMessages(messages) {
  return [...messages].sort((a, b) => {
    const timeA = new Date(a.createdAt ?? a.deliveredAt ?? 0).getTime();
    const timeB = new Date(b.createdAt ?? b.deliveredAt ?? 0).getTime();
    return timeA - timeB;
  });
}

const initialComposerState = {
  messageType: 'text',
  body: '',
  attachmentUrl: '',
  attachmentLabel: '',
  liveTopic: '',
  metadataNote: ''
};

const initialRoleForm = {
  name: '',
  roleKey: '',
  description: '',
  canBroadcast: true,
  canModerate: false,
  canHostVoice: false
};

const initialAssignmentForm = {
  userId: '',
  roleKey: ''
};

const initialEventForm = {
  title: '',
  summary: '',
  startAt: '',
  endAt: '',
  meetingUrl: '',
  visibility: 'members',
  attendanceLimit: '',
  isOnline: true
};

const initialResourceForm = {
  title: '',
  description: '',
  resourceType: 'external_link',
  linkUrl: '',
  tags: '',
  visibility: 'members'
};

const initialPresenceForm = {
  status: 'online',
  client: 'web',
  ttlMinutes: 15,
  metadata: ''
};

export default function InstructorCommunityChats() {
  const { dashboard, refresh } = useOutletContext();
  const { session } = useAuth();
  const token = session?.tokens?.accessToken ?? null;

  const communityOptions = useMemo(() => {
    const deck = Array.isArray(dashboard?.communities?.manageDeck) ? dashboard.communities.manageDeck : [];
    return deck
      .map((card) => ({
        id: parseCommunityId(card.id),
        title: card.title ?? 'Community',
        metrics: card.metrics ?? { active: 0, pending: 0, moderators: 0 },
        role: card.role ?? 'member'
      }))
      .filter((option) => option.id);
  }, [dashboard?.communities?.manageDeck]);

  const [selectedCommunityId, setSelectedCommunityId] = useState(() => communityOptions[0]?.id ?? null);
  useEffect(() => {
    if (!communityOptions.length) {
      setSelectedCommunityId(null);
      return;
    }
    setSelectedCommunityId((prev) => (prev ? prev : communityOptions[0].id));
  }, [communityOptions]);

  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [workspaceError, setWorkspaceError] = useState(null);
  const [channels, setChannels] = useState([]);
  const [activeChannelId, setActiveChannelId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [presence, setPresence] = useState([]);
  const [roles, setRoles] = useState([]);
  const [events, setEvents] = useState([]);
  const [resources, setResources] = useState([]);
  const [feedback, setFeedback] = useState(null);

  const [composer, setComposer] = useState(initialComposerState);
  const [roleForm, setRoleForm] = useState(initialRoleForm);
  const [assignmentForm, setAssignmentForm] = useState(initialAssignmentForm);
  const [eventForm, setEventForm] = useState(initialEventForm);
  const [resourceForm, setResourceForm] = useState(initialResourceForm);
  const [presenceForm, setPresenceForm] = useState(initialPresenceForm);

  const selectedCommunity = useMemo(
    () => communityOptions.find((option) => option.id === selectedCommunityId) ?? null,
    [communityOptions, selectedCommunityId]
  );

  const loadWorkspace = useCallback(
    async (communityId) => {
      if (!communityId || !token) {
        return;
      }
      setWorkspaceLoading(true);
      setWorkspaceError(null);
      try {
        const [channelRes, presenceRes, roleRes, eventsRes, resourcesRes] = await Promise.all([
          listCommunityChannels({ communityId, token }),
          listCommunityPresence({ communityId, token }),
          listCommunityRoles({ communityId, token }),
          listCommunityEvents({ communityId, token, params: { limit: 12 } }),
          fetchCommunityResources({ communityId, token, limit: 8 })
        ]);
        setChannels(Array.isArray(channelRes.data) ? channelRes.data : []);
        setPresence(Array.isArray(presenceRes.data) ? presenceRes.data : []);
        setRoles(Array.isArray(roleRes.data) ? roleRes.data : []);
        setEvents(Array.isArray(eventsRes.data) ? eventsRes.data : []);
        setResources(Array.isArray(resourcesRes.data) ? resourcesRes.data : []);
        const firstChannel = channelRes.data?.[0]?.channel?.id ?? null;
        setActiveChannelId(firstChannel);
        setMessages([]);
        setHasMoreMessages(false);
      } catch (error) {
        setWorkspaceError(error?.message ?? 'Failed to load chat workspace.');
      } finally {
        setWorkspaceLoading(false);
      }
    },
    [token]
  );

  useEffect(() => {
    if (selectedCommunityId && token) {
      loadWorkspace(selectedCommunityId);
    }
  }, [selectedCommunityId, token, loadWorkspace]);

  useEffect(() => {
    if (!selectedCommunityId || !activeChannelId || !token) {
      setMessages([]);
      setHasMoreMessages(false);
      return;
    }
    let cancelled = false;
    async function fetchMessages() {
      setMessagesLoading(true);
      try {
        const response = await listCommunityMessages({
          communityId: selectedCommunityId,
          channelId: activeChannelId,
          token,
          limit: MESSAGE_PAGE_SIZE
        });
        if (cancelled) return;
        const items = Array.isArray(response.data) ? response.data : [];
        setMessages(normaliseMessages(items));
        const count = response.meta?.pagination?.count ?? items.length;
        setHasMoreMessages(count >= MESSAGE_PAGE_SIZE);
      } catch (error) {
        if (cancelled) return;
        setFeedback({ tone: 'error', message: error?.message ?? 'Failed to load messages' });
      } finally {
        if (!cancelled) {
          setMessagesLoading(false);
        }
      }
    }
    fetchMessages();
    return () => {
      cancelled = true;
    };
  }, [selectedCommunityId, activeChannelId, token]);

  const handleRefreshChannels = useCallback(() => {
    if (selectedCommunityId) {
      loadWorkspace(selectedCommunityId);
    }
  }, [selectedCommunityId, loadWorkspace]);

  const handleLoadOlderMessages = useCallback(async () => {
    if (!selectedCommunityId || !activeChannelId || !token || !messages.length) {
      return;
    }
    const oldest = messages[0];
    const cursor = oldest?.createdAt ?? oldest?.deliveredAt;
    if (!cursor) {
      setHasMoreMessages(false);
      return;
    }
    try {
      const response = await listCommunityMessages({
        communityId: selectedCommunityId,
        channelId: activeChannelId,
        token,
        limit: MESSAGE_PAGE_SIZE,
        before: cursor
      });
      const items = Array.isArray(response.data) ? response.data : [];
      if (!items.length) {
        setHasMoreMessages(false);
        return;
      }
      setMessages((prev) => [...normaliseMessages(items), ...prev]);
      const count = response.meta?.pagination?.count ?? items.length;
      setHasMoreMessages(count >= MESSAGE_PAGE_SIZE);
    } catch (error) {
      setFeedback({ tone: 'error', message: error?.message ?? 'Unable to load older messages' });
    }
  }, [selectedCommunityId, activeChannelId, token, messages]);

  const handleSelectChannel = useCallback((channelId) => {
    setActiveChannelId(channelId);
  }, []);

  const activeChannelSummary = useMemo(
    () => channels.find((entry) => entry.channel?.id === activeChannelId) ?? null,
    [channels, activeChannelId]
  );

  const canModerate = useMemo(() => {
    const role = activeChannelSummary?.membership?.role ?? selectedCommunity?.role;
    return ['moderator', 'admin', 'owner'].includes(role);
  }, [activeChannelSummary?.membership?.role, selectedCommunity?.role]);

  const handleMarkChannelRead = useCallback(
    async (channelId) => {
      if (!selectedCommunityId || !token) {
        setFeedback({ tone: 'error', message: 'Sign in required to update read state.' });
        return;
      }
      const summary = channels.find((entry) => entry.channel?.id === channelId);
      try {
        const latestMessageId = summary?.latestMessage?.id ?? messages[messages.length - 1]?.id ?? undefined;
        const response = await markCommunityChannelRead({
          communityId: selectedCommunityId,
          channelId,
          token,
          payload: latestMessageId ? { messageId: latestMessageId } : {}
        });
        const updatedMembership = response.data ?? null;
        setChannels((prev) =>
          prev.map((entry) =>
            entry.channel.id === channelId
              ? { ...entry, membership: updatedMembership ?? entry.membership, unreadCount: 0 }
              : entry
          )
        );
        setFeedback({ tone: 'success', message: 'Channel marked as read.' });
      } catch (error) {
        setFeedback({ tone: 'error', message: error?.message ?? 'Failed to mark channel as read.' });
      }
    },
    [selectedCommunityId, token, channels, messages]
  );

  const handleSendMessage = useCallback(
    async (event) => {
      event.preventDefault();
      if (!selectedCommunityId || !activeChannelId || !token) {
        setFeedback({ tone: 'error', message: 'Select a community channel before sending.' });
        return;
      }
      const trimmedBody = composer.body.trim();
      if (!trimmedBody) {
        setFeedback({ tone: 'warning', message: 'Message body cannot be empty.' });
        return;
      }
      const attachments = composer.attachmentUrl
        ? [
            {
              url: composer.attachmentUrl.trim(),
              title: composer.attachmentLabel.trim() || undefined
            }
          ]
        : [];
      const metadata = {};
      if (composer.liveTopic) metadata.topic = composer.liveTopic;
      if (composer.metadataNote) metadata.note = composer.metadataNote;
      if (composer.messageType === 'live') {
        metadata.kind = 'live-session';
      }
      const optimisticMessage = {
        id: `temp-${Date.now()}`,
        communityId: selectedCommunityId,
        channelId: activeChannelId,
        authorId: session?.user?.id ?? null,
        messageType: composer.messageType,
        body: trimmedBody,
        attachments,
        metadata,
        status: 'visible',
        reactions: [],
        viewerReactions: [],
        createdAt: new Date().toISOString(),
        author: {
          id: session?.user?.id ?? null,
          firstName: session?.user?.firstName ?? session?.user?.name ?? 'You',
          lastName: session?.user?.lastName ?? '',
          email: session?.user?.email ?? '',
          role: session?.user?.role ?? 'member'
        }
      };
      setMessages((prev) => [...prev, optimisticMessage]);
      setChannels((prev) =>
        prev.map((entry) =>
          entry.channel.id === activeChannelId
            ? { ...entry, latestMessage: optimisticMessage, unreadCount: 0 }
            : entry
        )
      );
      setComposer(initialComposerState);
      try {
        const response = await postCommunityMessage({
          communityId: selectedCommunityId,
          channelId: activeChannelId,
          token,
          payload: {
            messageType: composer.messageType,
            body: trimmedBody,
            attachments,
            metadata
          }
        });
        if (response.data) {
          setMessages((prev) =>
            prev.map((message) => (message.id === optimisticMessage.id ? response.data : message))
          );
          setChannels((prev) =>
            prev.map((entry) =>
              entry.channel.id === activeChannelId
                ? { ...entry, latestMessage: response.data, unreadCount: 0 }
                : entry
            )
          );
        }
        setFeedback({ tone: 'success', message: 'Message sent to the community.' });
      } catch (error) {
        setMessages((prev) => prev.filter((message) => message.id !== optimisticMessage.id));
        setFeedback({ tone: 'error', message: error?.message ?? 'Failed to send message.' });
      }
    },
    [selectedCommunityId, activeChannelId, token, composer, session?.user]
  );

  const handleToggleReaction = useCallback(
    async (message, emoji) => {
      if (!selectedCommunityId || !activeChannelId || !token) {
        setFeedback({ tone: 'error', message: 'Unable to react without an active community.' });
        return;
      }
      const hasReaction = message.viewerReactions?.includes(emoji);
      try {
        const api = hasReaction ? removeCommunityMessageReaction : addCommunityMessageReaction;
        const response = await api({
          communityId: selectedCommunityId,
          channelId: activeChannelId,
          messageId: message.id,
          token,
          emoji
        });
        if (response.data) {
          setMessages((prev) =>
            prev.map((entry) =>
              entry.id === message.id
                ? { ...entry, reactions: response.data.reactions ?? [], viewerReactions: response.data.viewerReactions ?? [] }
                : entry
            )
          );
        }
      } catch (error) {
        setFeedback({ tone: 'error', message: error?.message ?? 'Unable to update reaction.' });
      }
    },
    [selectedCommunityId, activeChannelId, token]
  );

  const handleModerateMessage = useCallback(
    async (message, action) => {
      if (!canModerate || !selectedCommunityId || !activeChannelId || !token) {
        setFeedback({ tone: 'error', message: 'You do not have permission to moderate messages.' });
        return;
      }
      const reason = window.prompt('Provide an optional reason for this action', '') ?? '';
      try {
        const response = await moderateCommunityMessage({
          communityId: selectedCommunityId,
          channelId: activeChannelId,
          messageId: message.id,
          token,
          payload: { action, reason }
        });
        if (response.data?.message) {
          const updated = response.data.message;
          setMessages((prev) => prev.map((entry) => (entry.id === message.id ? { ...entry, status: updated.status } : entry)));
        }
        setFeedback({ tone: 'success', message: 'Moderation action applied.' });
      } catch (error) {
        setFeedback({ tone: 'error', message: error?.message ?? 'Failed to moderate message.' });
      }
    },
    [canModerate, selectedCommunityId, activeChannelId, token]
  );

  const handleRoleSubmit = useCallback(
    async (event) => {
      event.preventDefault();
      if (!selectedCommunityId || !token) {
        setFeedback({ tone: 'error', message: 'Select a community before creating roles.' });
        return;
      }
      if (!roleForm.name.trim()) {
        setFeedback({ tone: 'warning', message: 'Role name is required.' });
        return;
      }
      try {
        const response = await createCommunityRole({
          communityId: selectedCommunityId,
          token,
          payload: {
            name: roleForm.name.trim(),
            roleKey: roleForm.roleKey.trim() || undefined,
            description: roleForm.description.trim() || undefined,
            permissions: {
              broadcast: roleForm.canBroadcast,
              moderate: roleForm.canModerate,
              voice: roleForm.canHostVoice
            }
          }
        });
        if (response.data) {
          setRoles((prev) => [response.data, ...prev]);
        }
        setRoleForm(initialRoleForm);
        setFeedback({ tone: 'success', message: 'Community role created.' });
      } catch (error) {
        setFeedback({ tone: 'error', message: error?.message ?? 'Unable to create role.' });
      }
    },
    [roleForm, selectedCommunityId, token]
  );

  const handleAssignmentSubmit = useCallback(
    async (event) => {
      event.preventDefault();
      if (!selectedCommunityId || !token) {
        setFeedback({ tone: 'error', message: 'Select a community before assigning roles.' });
        return;
      }
      const userId = Number.parseInt(assignmentForm.userId, 10);
      if (!Number.isFinite(userId)) {
        setFeedback({ tone: 'warning', message: 'Provide a valid member identifier.' });
        return;
      }
      if (!assignmentForm.roleKey.trim()) {
        setFeedback({ tone: 'warning', message: 'Select a role to assign.' });
        return;
      }
      try {
        await assignCommunityRole({
          communityId: selectedCommunityId,
          userId,
          token,
          payload: { roleKey: assignmentForm.roleKey.trim() }
        });
        setAssignmentForm(initialAssignmentForm);
        setFeedback({ tone: 'success', message: 'Member role updated.' });
      } catch (error) {
        setFeedback({ tone: 'error', message: error?.message ?? 'Unable to update member role.' });
      }
    },
    [assignmentForm, selectedCommunityId, token]
  );

  const handleEventSubmit = useCallback(
    async (event) => {
      event.preventDefault();
      if (!selectedCommunityId || !token) {
        setFeedback({ tone: 'error', message: 'Community selection required to create events.' });
        return;
      }
      if (!eventForm.title.trim() || !eventForm.startAt || !eventForm.endAt) {
        setFeedback({ tone: 'warning', message: 'Event title and schedule are required.' });
        return;
      }
      try {
        const response = await createCommunityEvent({
          communityId: selectedCommunityId,
          token,
          payload: {
            title: eventForm.title.trim(),
            summary: eventForm.summary.trim() || undefined,
            startAt: new Date(eventForm.startAt).toISOString(),
            endAt: new Date(eventForm.endAt).toISOString(),
            meetingUrl: eventForm.meetingUrl.trim() || undefined,
            visibility: eventForm.visibility,
            attendanceLimit: eventForm.attendanceLimit ? Number(eventForm.attendanceLimit) : undefined,
            isOnline: eventForm.isOnline,
            metadata: eventForm.isOnline ? { mode: 'virtual' } : {}
          }
        });
        if (response.data) {
          setEvents((prev) => [response.data, ...prev]);
        }
        setEventForm(initialEventForm);
        setFeedback({ tone: 'success', message: 'Event scheduled for the community.' });
      } catch (error) {
        setFeedback({ tone: 'error', message: error?.message ?? 'Failed to create event.' });
      }
    },
    [eventForm, selectedCommunityId, token]
  );

  const handleResourceSubmit = useCallback(
    async (event) => {
      event.preventDefault();
      if (!selectedCommunityId || !token) {
        setFeedback({ tone: 'error', message: 'Select a community before adding resources.' });
        return;
      }
      if (!resourceForm.title.trim()) {
        setFeedback({ tone: 'warning', message: 'Resource title is required.' });
        return;
      }
      if (resourceForm.resourceType !== 'content_asset' && !resourceForm.linkUrl.trim()) {
        setFeedback({ tone: 'warning', message: 'Provide a link for this resource.' });
        return;
      }
      try {
        const response = await createCommunityResource({
          communityId: selectedCommunityId,
          token,
          payload: {
            title: resourceForm.title.trim(),
            description: resourceForm.description.trim() || undefined,
            resourceType: resourceForm.resourceType,
            linkUrl: resourceForm.linkUrl.trim() || undefined,
            tags: resourceForm.tags
              .split(',')
              .map((tag) => tag.trim())
              .filter(Boolean),
            visibility: resourceForm.visibility,
            status: 'published'
          }
        });
        if (response.data) {
          setResources((prev) => [response.data, ...prev].slice(0, 12));
        }
        setResourceForm(initialResourceForm);
        setFeedback({ tone: 'success', message: 'Resource published to the library.' });
      } catch (error) {
        setFeedback({ tone: 'error', message: error?.message ?? 'Unable to publish resource.' });
      }
    },
    [resourceForm, selectedCommunityId, token]
  );

  const handlePresenceSubmit = useCallback(
    async (event) => {
      event.preventDefault();
      if (!selectedCommunityId || !token) {
        setFeedback({ tone: 'error', message: 'Select a community before updating presence.' });
        return;
      }
      let metadata = {};
      if (presenceForm.metadata.trim()) {
        try {
          metadata = JSON.parse(presenceForm.metadata);
        } catch (_error) {
          metadata = { note: presenceForm.metadata.trim() };
        }
      }
      try {
        const response = await updateCommunityPresence({
          communityId: selectedCommunityId,
          token,
          payload: {
            status: presenceForm.status,
            client: presenceForm.client,
            ttlMinutes: Number(presenceForm.ttlMinutes) || 5,
            metadata
          }
        });
        if (response.data) {
          setPresence((prev) => {
            const existingIndex = prev.findIndex((entry) => entry.id === response.data.id);
            if (existingIndex >= 0) {
              const next = [...prev];
              next[existingIndex] = response.data;
              return next;
            }
            return [response.data, ...prev];
          });
        }
        setPresenceForm(initialPresenceForm);
        setFeedback({ tone: 'success', message: 'Presence updated.' });
      } catch (error) {
        setFeedback({ tone: 'error', message: error?.message ?? 'Unable to update presence.' });
      }
    },
    [presenceForm, selectedCommunityId, token]
  );

  const handleShareResource = useCallback((resource) => {
    setComposer((prev) => ({
      ...prev,
      body: prev.body ? `${prev.body}\n${resource.title}: ${resource.linkUrl ?? ''}` : `${resource.title}: ${resource.linkUrl ?? ''}`,
      attachmentUrl: resource.linkUrl ?? prev.attachmentUrl,
      attachmentLabel: resource.title ?? prev.attachmentLabel
    }));
  }, []);

  const handleAnnounceEvent = useCallback((eventRecord) => {
    const summaryLine = `${eventRecord.title} — ${formatDateTime(eventRecord.startAt, {
      dateStyle: 'medium',
      timeStyle: 'short'
    })}`;
    setComposer((prev) => ({
      ...prev,
      messageType: 'event',
      body: prev.body ? `${prev.body}\n${summaryLine}` : summaryLine,
      attachmentLabel: eventRecord.title,
      attachmentUrl: eventRecord.meetingUrl ?? prev.attachmentUrl,
      metadataNote: eventRecord.summary ?? ''
    }));
  }, []);

  if (!token) {
    return (
      <DashboardStateMessage
        title="Sign in required"
        description="Authenticate to manage your community chat operations and publish updates to members."
      />
    );
  }

  if (!communityOptions.length) {
    return (
      <DashboardStateMessage
        title="No managed communities"
        description="Once you launch a community space it will appear here with full chat controls and moderation tools."
        actionLabel="Refresh"
        onAction={() => refresh?.()}
      />
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="dashboard-kicker">Community chats</p>
          <h1 className="dashboard-title">Live operations control</h1>
          <p className="dashboard-subtitle">
            Spin up live sessions, share media, and moderate member spaces in real time just like a production-grade
            Discord server.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <select
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            value={selectedCommunityId ?? ''}
            onChange={(event) => setSelectedCommunityId(event.target.value)}
          >
            {communityOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.title}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="dashboard-pill inline-flex items-center gap-2 px-4 py-2 text-sm"
            onClick={handleRefreshChannels}
          >
            <ArrowPathIcon className="h-4 w-4" /> Refresh workspace
          </button>
        </div>
      </header>

      {feedback ? <DashboardActionFeedback feedback={feedback} onDismiss={() => setFeedback(null)} /> : null}

      {workspaceError ? (
        <div className="dashboard-section border-rose-200 bg-rose-50 text-rose-700">
          <div className="flex items-start gap-3">
            <ExclamationTriangleIcon className="mt-1 h-5 w-5" />
            <div>
              <p className="font-semibold">{workspaceError}</p>
              <p className="mt-1 text-sm">Retry once your network connection is stable.</p>
            </div>
          </div>
        </div>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
        <aside className="dashboard-section space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="dashboard-kicker">Channels</p>
              <h2 className="text-base font-semibold text-slate-900">Conversation spaces</h2>
            </div>
            <span className="rounded-xl bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {channels.length} live
            </span>
          </div>
          <ul className="space-y-3">
            {channels.map((entry) => {
              const { label, icon: Icon } = resolveChannelLabel(entry.channel);
              const isActive = entry.channel.id === activeChannelId;
              return (
                <li key={entry.channel.id}>
                  <button
                    type="button"
                    onClick={() => handleSelectChannel(entry.channel.id)}
                    className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                      isActive
                        ? 'border-primary/50 bg-primary/5 text-primary'
                        : 'border-slate-200 text-slate-700 hover:border-primary/40 hover:bg-primary/5'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Icon className="h-5 w-5" />
                        <div>
                          <p className="font-semibold">{entry.channel.name}</p>
                          <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
                        </div>
                      </div>
                      {entry.unreadCount > 0 ? (
                        <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-white">
                          {entry.unreadCount}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                      <span>Last activity {formatRelative(entry.latestMessage?.createdAt ?? entry.channel.updatedAt)}</span>
                      <button
                        type="button"
                        className="underline"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleMarkChannelRead(entry.channel.id);
                        }}
                      >
                        Mark read
                      </button>
                    </div>
                  </button>
                </li>
              );
            })}
            {workspaceLoading && channels.length === 0 ? (
              <li className="rounded-2xl border border-slate-200 bg-white/60 p-4 text-sm text-slate-500">
                Loading channel roster…
              </li>
            ) : null}
          </ul>
        </aside>

        <article className="dashboard-section flex flex-col gap-5">
          <header className="flex flex-col gap-2 border-b border-slate-100 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="dashboard-kicker">{activeChannelSummary?.channel?.name ?? 'Channel'}</p>
                <h2 className="text-lg font-semibold text-slate-900">Live feed</h2>
              </div>
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {activeChannelSummary?.membership?.role ? `You are ${activeChannelSummary.membership.role}` : ''}
              </span>
            </div>
            <p className="text-sm text-slate-600">
              Broadcast updates, kick off live co-working, or drop rich media. Members see changes instantly.
            </p>
          </header>

          {activeChannelId ? (
            <div className="flex flex-col gap-4">
              <form onSubmit={handleSendMessage} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="flex flex-col text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Message type
                    <select
                      className="mt-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      value={composer.messageType}
                      onChange={(event) => setComposer((prev) => ({ ...prev, messageType: event.target.value }))}
                    >
                      <option value="text">Discussion</option>
                      <option value="event">Event announcement</option>
                      <option value="live">Live session</option>
                    </select>
                  </label>
                  <label className="flex flex-col text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Attach link
                    <input
                      type="url"
                      placeholder="https://"
                      value={composer.attachmentUrl}
                      onChange={(event) => setComposer((prev) => ({ ...prev, attachmentUrl: event.target.value }))}
                      className="mt-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </label>
                  <label className="flex flex-col text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Attachment label
                    <input
                      type="text"
                      value={composer.attachmentLabel}
                      onChange={(event) => setComposer((prev) => ({ ...prev, attachmentLabel: event.target.value }))}
                      className="mt-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </label>
                  <label className="flex flex-col text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Metadata note
                    <input
                      type="text"
                      value={composer.metadataNote}
                      onChange={(event) => setComposer((prev) => ({ ...prev, metadataNote: event.target.value }))}
                      className="mt-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </label>
                </div>
                {composer.messageType === 'live' ? (
                  <label className="mt-4 flex flex-col text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Live session topic
                    <input
                      type="text"
                      value={composer.liveTopic}
                      onChange={(event) => setComposer((prev) => ({ ...prev, liveTopic: event.target.value }))}
                      className="mt-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </label>
                ) : null}
                <label className="mt-4 flex flex-col text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Message body
                  <textarea
                    rows={4}
                    value={composer.body}
                    onChange={(event) => setComposer((prev) => ({ ...prev, body: event.target.value }))}
                    placeholder="Share an update with your members…"
                    className="mt-1 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </label>
                <div className="mt-4 flex items-center justify-end">
                  <button type="submit" className="dashboard-primary-pill inline-flex items-center gap-2 px-5 py-2">
                    <PaperAirplaneIcon className="h-4 w-4" />
                    Send update
                  </button>
                </div>
              </form>

              <div className="space-y-4">
                {hasMoreMessages ? (
                  <button
                    type="button"
                    className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:border-primary/40 hover:text-primary"
                    onClick={handleLoadOlderMessages}
                  >
                    Load earlier messages
                  </button>
                ) : null}

                <ol className="space-y-4">
                  {messages.map((message) => (
                    <li key={message.id} className="rounded-2xl border border-slate-200 p-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                            {message.author?.firstName?.[0] ?? 'M'}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-900">
                              {message.author?.firstName || message.author?.email || 'Member'}{' '}
                              {message.author?.lastName}
                            </p>
                            <p className="text-xs text-slate-500">
                              {formatDateTime(message.createdAt ?? message.deliveredAt)} · {message.messageType}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                          {canModerate ? (
                            <>
                              <button
                                type="button"
                                className="dashboard-pill px-3 py-1"
                                onClick={() => handleModerateMessage(message, 'hide')}
                              >
                                Hide
                              </button>
                              <button
                                type="button"
                                className="dashboard-pill px-3 py-1"
                                onClick={() => handleModerateMessage(message, 'restore')}
                              >
                                Restore
                              </button>
                            </>
                          ) : null}
                          <button
                            type="button"
                            className="dashboard-pill px-3 py-1"
                            onClick={() => handleToggleReaction(message, '👍')}
                          >
                            👍 {message.reactions?.find((reaction) => reaction.emoji === '👍')?.count ?? 0}
                          </button>
                          <button
                            type="button"
                            className="dashboard-pill px-3 py-1"
                            onClick={() => handleToggleReaction(message, '🎉')}
                          >
                            🎉 {message.reactions?.find((reaction) => reaction.emoji === '🎉')?.count ?? 0}
                          </button>
                          <button
                            type="button"
                            className="dashboard-pill px-3 py-1"
                            onClick={() => handleToggleReaction(message, '🚀')}
                          >
                            🚀 {message.reactions?.find((reaction) => reaction.emoji === '🚀')?.count ?? 0}
                          </button>
                        </div>
                      </div>
                      {message.status !== 'visible' ? (
                        <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-rose-500">
                          {message.status}
                        </p>
                      ) : null}
                      <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">{message.body}</p>
                      {message.attachments?.length ? (
                        <ul className="mt-3 flex flex-wrap gap-3 text-sm text-primary">
                          {message.attachments.map((attachment, index) => (
                            <li key={`${message.id}-attachment-${index}`}>
                              <a
                                href={attachment.url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-2 rounded-full bg-primary/5 px-4 py-1 text-sm font-semibold text-primary hover:bg-primary/10"
                              >
                                <DocumentTextIcon className="h-4 w-4" />
                                {attachment.title ?? 'Attachment'}
                              </a>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </li>
                  ))}
                  {messagesLoading ? (
                    <li className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                      Fetching latest messages…
                    </li>
                  ) : null}
                </ol>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
              Select a channel to view live conversations and run operations.
            </div>
          )}
        </article>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="dashboard-section space-y-5">
          <header>
            <p className="dashboard-kicker">Roles & permissions</p>
            <h2 className="text-lg font-semibold text-slate-900">Moderator coverage</h2>
            <p className="text-sm text-slate-600">
              Create production roles, then assign them to trusted members to manage events, broadcasts, and voice rooms.
            </p>
          </header>
          <form className="space-y-4" onSubmit={handleRoleSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col text-xs font-semibold uppercase tracking-wide text-slate-500">
                Name
                <input
                  type="text"
                  value={roleForm.name}
                  onChange={(event) => setRoleForm((prev) => ({ ...prev, name: event.target.value }))}
                  className="mt-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  required
                />
              </label>
              <label className="flex flex-col text-xs font-semibold uppercase tracking-wide text-slate-500">
                Role key
                <input
                  type="text"
                  value={roleForm.roleKey}
                  onChange={(event) => setRoleForm((prev) => ({ ...prev, roleKey: event.target.value }))}
                  className="mt-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="ops-lead"
                />
              </label>
            </div>
            <label className="flex flex-col text-xs font-semibold uppercase tracking-wide text-slate-500">
              Description
              <textarea
                rows={2}
                value={roleForm.description}
                onChange={(event) => setRoleForm((prev) => ({ ...prev, description: event.target.value }))}
                className="mt-1 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="Manages weekly live sessions and post-show wrap-ups"
              />
            </label>
            <div className="flex flex-wrap gap-3 text-sm text-slate-600">
              <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2">
                <input
                  type="checkbox"
                  checked={roleForm.canBroadcast}
                  onChange={(event) => setRoleForm((prev) => ({ ...prev, canBroadcast: event.target.checked }))}
                />
                Broadcast channels
              </label>
              <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2">
                <input
                  type="checkbox"
                  checked={roleForm.canModerate}
                  onChange={(event) => setRoleForm((prev) => ({ ...prev, canModerate: event.target.checked }))}
                />
                Moderate chat
              </label>
              <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2">
                <input
                  type="checkbox"
                  checked={roleForm.canHostVoice}
                  onChange={(event) => setRoleForm((prev) => ({ ...prev, canHostVoice: event.target.checked }))}
                />
                Host voice rooms
              </label>
            </div>
            <div className="flex justify-end">
              <button type="submit" className="dashboard-primary-pill px-5 py-2">
                Create role
              </button>
            </div>
          </form>

          <form className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4" onSubmit={handleAssignmentSubmit}>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Assign role</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col text-xs font-semibold text-slate-500">
                Member ID
                <input
                  type="number"
                  value={assignmentForm.userId}
                  onChange={(event) => setAssignmentForm((prev) => ({ ...prev, userId: event.target.value }))}
                  className="mt-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  required
                />
              </label>
              <label className="flex flex-col text-xs font-semibold text-slate-500">
                Role
                <select
                  value={assignmentForm.roleKey}
                  onChange={(event) => setAssignmentForm((prev) => ({ ...prev, roleKey: event.target.value }))}
                  className="mt-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  required
                >
                  <option value="">Select</option>
                  {roles.map((role) => (
                    <option key={role.id ?? role.roleKey ?? role.name} value={role.roleKey ?? role.name}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="mt-4 flex justify-end">
              <button type="submit" className="dashboard-pill px-4 py-2">
                Assign role
              </button>
            </div>
          </form>

          <ul className="space-y-3">
            {roles.map((role) => (
              <li key={role.id ?? role.roleKey ?? role.name} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{role.name}</p>
                    <p className="text-xs uppercase tracking-wide text-slate-500">{role.roleKey}</p>
                  </div>
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    {role.members ?? 0} members
                  </span>
                </div>
                {role.description ? <p className="mt-2 text-sm text-slate-600">{role.description}</p> : null}
              </li>
            ))}
            {roles.length === 0 ? (
              <li className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                No custom roles yet. Create one to delegate community operations.
              </li>
            ) : null}
          </ul>
        </div>

        <div className="dashboard-section space-y-5">
          <header>
            <p className="dashboard-kicker">Presence & live sessions</p>
            <h2 className="text-lg font-semibold text-slate-900">Team availability</h2>
            <p className="text-sm text-slate-600">
              Broadcast when you are live or heads-down so members know when to drop into voice rooms or DM you.
            </p>
          </header>

          <form className="grid gap-3 sm:grid-cols-2" onSubmit={handlePresenceSubmit}>
            <label className="flex flex-col text-xs font-semibold uppercase tracking-wide text-slate-500">
              Status
              <select
                value={presenceForm.status}
                onChange={(event) => setPresenceForm((prev) => ({ ...prev, status: event.target.value }))}
                className="mt-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="online">Online</option>
                <option value="away">Away</option>
                <option value="offline">Offline</option>
              </select>
            </label>
            <label className="flex flex-col text-xs font-semibold uppercase tracking-wide text-slate-500">
              Client
              <select
                value={presenceForm.client}
                onChange={(event) => setPresenceForm((prev) => ({ ...prev, client: event.target.value }))}
                className="mt-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="web">Web</option>
                <option value="mobile">Mobile</option>
                <option value="provider">Provider</option>
                <option value="admin">Admin</option>
              </select>
            </label>
            <label className="flex flex-col text-xs font-semibold uppercase tracking-wide text-slate-500">
              TTL (minutes)
              <input
                type="number"
                min={1}
                value={presenceForm.ttlMinutes}
                onChange={(event) => setPresenceForm((prev) => ({ ...prev, ttlMinutes: event.target.value }))}
                className="mt-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </label>
            <label className="sm:col-span-2 flex flex-col text-xs font-semibold uppercase tracking-wide text-slate-500">
              Metadata (JSON or note)
              <input
                type="text"
                value={presenceForm.metadata}
                onChange={(event) => setPresenceForm((prev) => ({ ...prev, metadata: event.target.value }))}
                className="mt-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder='{"stage":"co-working"}'
              />
            </label>
            <div className="sm:col-span-2 flex justify-end">
              <button type="submit" className="dashboard-pill px-4 py-2">
                Update presence
              </button>
            </div>
          </form>

          <ul className="space-y-3">
            {presence.map((entry) => (
              <li key={entry.id ?? `${entry.userId}-${entry.client}`} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-semibold text-slate-900">User {entry.userId}</p>
                    <p className="text-xs text-slate-500">{entry.client} · {entry.status}</p>
                  </div>
                  <span className="text-xs text-slate-500">
                    TTL {entry.ttlMinutes ?? 5}m · {formatRelative(entry.updatedAt ?? entry.connectedAt)}
                  </span>
                </div>
                {entry.metadata ? (
                  <p className="mt-2 text-xs text-slate-500">{JSON.stringify(entry.metadata)}</p>
                ) : null}
              </li>
            ))}
            {presence.length === 0 ? (
              <li className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                No live presence signals yet. Update status to let members know when you are online.
              </li>
            ) : null}
          </ul>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="dashboard-section space-y-5">
          <header>
            <p className="dashboard-kicker">Programming</p>
            <h2 className="text-lg font-semibold text-slate-900">Events pipeline</h2>
            <p className="text-sm text-slate-600">
              Schedule launches, AMAs, and live cohorts, then announce them to members with one click.
            </p>
          </header>
          <form className="space-y-4" onSubmit={handleEventSubmit}>
            <label className="flex flex-col text-xs font-semibold uppercase tracking-wide text-slate-500">
              Title
              <input
                type="text"
                value={eventForm.title}
                onChange={(event) => setEventForm((prev) => ({ ...prev, title: event.target.value }))}
                className="mt-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                required
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col text-xs font-semibold text-slate-500">
                Starts
                <input
                  type="datetime-local"
                  value={eventForm.startAt}
                  onChange={(event) => setEventForm((prev) => ({ ...prev, startAt: event.target.value }))}
                  className="mt-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  required
                />
              </label>
              <label className="flex flex-col text-xs font-semibold text-slate-500">
                Ends
                <input
                  type="datetime-local"
                  value={eventForm.endAt}
                  onChange={(event) => setEventForm((prev) => ({ ...prev, endAt: event.target.value }))}
                  className="mt-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  required
                />
              </label>
            </div>
            <label className="flex flex-col text-xs font-semibold uppercase tracking-wide text-slate-500">
              Meeting link
              <input
                type="url"
                value={eventForm.meetingUrl}
                onChange={(event) => setEventForm((prev) => ({ ...prev, meetingUrl: event.target.value }))}
                className="mt-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="https://"
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col text-xs font-semibold text-slate-500">
                Visibility
                <select
                  value={eventForm.visibility}
                  onChange={(event) => setEventForm((prev) => ({ ...prev, visibility: event.target.value }))}
                  className="mt-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="members">Members</option>
                  <option value="admins">Admins</option>
                  <option value="owners">Owners</option>
                </select>
              </label>
              <label className="flex flex-col text-xs font-semibold text-slate-500">
                Attendance limit
                <input
                  type="number"
                  min={1}
                  value={eventForm.attendanceLimit}
                  onChange={(event) => setEventForm((prev) => ({ ...prev, attendanceLimit: event.target.value }))}
                  className="mt-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </label>
            </div>
            <label className="flex items-center gap-3 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={eventForm.isOnline}
                onChange={(event) => setEventForm((prev) => ({ ...prev, isOnline: event.target.checked }))}
              />
              Online event
            </label>
            <label className="flex flex-col text-xs font-semibold uppercase tracking-wide text-slate-500">
              Summary
              <textarea
                rows={2}
                value={eventForm.summary}
                onChange={(event) => setEventForm((prev) => ({ ...prev, summary: event.target.value }))}
                className="mt-1 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="Outline agenda, speakers, or formats"
              />
            </label>
            <div className="flex justify-end">
              <button type="submit" className="dashboard-primary-pill px-5 py-2">
                Schedule event
              </button>
            </div>
          </form>

          <ul className="space-y-3">
            {events.map((eventRecord) => (
              <li key={eventRecord.id ?? eventRecord.slug ?? eventRecord.title} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{eventRecord.title}</p>
                    <p className="text-xs text-slate-500">
                      {formatDateTime(eventRecord.startAt)} · {eventRecord.visibility}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="dashboard-pill px-3 py-1"
                    onClick={() => handleAnnounceEvent(eventRecord)}
                  >
                    Announce
                  </button>
                </div>
                {eventRecord.summary ? <p className="mt-2 text-sm text-slate-600">{eventRecord.summary}</p> : null}
              </li>
            ))}
            {events.length === 0 ? (
              <li className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                No events scheduled yet. Publish one to kick off your next live session.
              </li>
            ) : null}
          </ul>
        </div>

        <div className="dashboard-section space-y-5">
          <header>
            <p className="dashboard-kicker">Media & resources</p>
            <h2 className="text-lg font-semibold text-slate-900">Library distribution</h2>
            <p className="text-sm text-slate-600">
              Upload runbooks, launch assets, and playlists so producers can share them in any channel instantly.
            </p>
          </header>
          <form className="space-y-4" onSubmit={handleResourceSubmit}>
            <label className="flex flex-col text-xs font-semibold uppercase tracking-wide text-slate-500">
              Title
              <input
                type="text"
                value={resourceForm.title}
                onChange={(event) => setResourceForm((prev) => ({ ...prev, title: event.target.value }))}
                className="mt-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                required
              />
            </label>
            <label className="flex flex-col text-xs font-semibold uppercase tracking-wide text-slate-500">
              Link URL
              <input
                type="url"
                value={resourceForm.linkUrl}
                onChange={(event) => setResourceForm((prev) => ({ ...prev, linkUrl: event.target.value }))}
                className="mt-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="https://"
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col text-xs font-semibold text-slate-500">
                Type
                <select
                  value={resourceForm.resourceType}
                  onChange={(event) => setResourceForm((prev) => ({ ...prev, resourceType: event.target.value }))}
                  className="mt-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="external_link">External link</option>
                  <option value="document">Document</option>
                  <option value="classroom_session">Classroom session</option>
                  <option value="content_asset">Platform asset</option>
                </select>
              </label>
              <label className="flex flex-col text-xs font-semibold text-slate-500">
                Visibility
                <select
                  value={resourceForm.visibility}
                  onChange={(event) => setResourceForm((prev) => ({ ...prev, visibility: event.target.value }))}
                  className="mt-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="members">Members</option>
                  <option value="admins">Admins</option>
                </select>
              </label>
            </div>
            <label className="flex flex-col text-xs font-semibold uppercase tracking-wide text-slate-500">
              Tags
              <input
                type="text"
                value={resourceForm.tags}
                onChange={(event) => setResourceForm((prev) => ({ ...prev, tags: event.target.value }))}
                className="mt-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="launch, ritual"
              />
            </label>
            <label className="flex flex-col text-xs font-semibold uppercase tracking-wide text-slate-500">
              Description
              <textarea
                rows={2}
                value={resourceForm.description}
                onChange={(event) => setResourceForm((prev) => ({ ...prev, description: event.target.value }))}
                className="mt-1 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </label>
            <div className="flex justify-end">
              <button type="submit" className="dashboard-primary-pill px-5 py-2">
                Publish resource
              </button>
            </div>
          </form>

          <ul className="space-y-3">
            {resources.map((resource) => (
              <li key={resource.id ?? resource.title} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{resource.title}</p>
                    <p className="text-xs text-slate-500">{resource.resourceType} · {resource.visibility}</p>
                  </div>
                  <button
                    type="button"
                    className="dashboard-pill px-3 py-1"
                    onClick={() => handleShareResource(resource)}
                  >
                    Share to chat
                  </button>
                </div>
                {resource.description ? <p className="mt-2 text-sm text-slate-600">{resource.description}</p> : null}
              </li>
            ))}
            {resources.length === 0 ? (
              <li className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                No resources yet. Publish operating manuals, videos, or playlists to use in live chats.
              </li>
            ) : null}
          </ul>
        </div>
      </section>
    </div>
  );
}
