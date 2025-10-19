import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BoltIcon,
  CalendarDaysIcon,
  ChatBubbleLeftEllipsisIcon,
  CircleStackIcon,
  MegaphoneIcon,
  MusicalNoteIcon,
  PencilSquareIcon,
  PhotoIcon,
  PlusIcon,
  SquaresPlusIcon,
  TrashIcon,
  UserGroupIcon,
  UserPlusIcon,
  UsersIcon,
  VideoCameraIcon
} from '@heroicons/react/24/outline';
import { PaperAirplaneIcon } from '@heroicons/react/24/solid';

import DashboardSectionHeader from '../../components/dashboard/DashboardSectionHeader.jsx';
import DashboardStateMessage from '../../components/dashboard/DashboardStateMessage.jsx';
import {
  fetchCommunities,
  fetchCommunityChatChannels,
  createCommunityChatChannel,
  updateCommunityChatChannel,
  deleteCommunityChatChannel,
  fetchCommunityChatMembers,
  upsertCommunityChatMember,
  removeCommunityChatMember,
  fetchCommunityChatMessages,
  postCommunityChatMessage,
  addCommunityChatReaction,
  removeCommunityChatReaction,
  fetchCommunityChatPresence,
  updateCommunityChatPresence
} from '../../api/communityApi.js';
import { useAuth } from '../../context/AuthContext.jsx';

const channelDefaults = {
  name: '',
  slug: '',
  channelType: 'general',
  description: '',
  isDefault: false,
  metadata: {
    permissions: {
      broadcast: false,
      media: true,
      voice: false,
      events: false
    },
    topics: [],
    live: {
      enabled: false,
      provider: 'internal',
      url: '',
      startAt: ''
    }
  }
};

function createChannelFormState() {
  return {
    ...channelDefaults,
    metadata: {
      permissions: { ...channelDefaults.metadata.permissions },
      topics: [...channelDefaults.metadata.topics],
      live: { ...channelDefaults.metadata.live }
    }
  };
}

const presenceOptions = [
  { value: 'online', label: 'Online · ready to collaborate' },
  { value: 'away', label: 'Away · stepping out' },
  { value: 'offline', label: 'Offline · notifications only' }
];

const channelTypeOptions = [
  { value: 'general', label: 'General collaboration' },
  { value: 'announcements', label: 'Announcements' },
  { value: 'classroom', label: 'Classroom workshops' },
  { value: 'events', label: 'Events & live sessions' },
  { value: 'resources', label: 'Resource library' }
];

const memberRoleOptions = [
  { value: 'member', label: 'Member' },
  { value: 'moderator', label: 'Moderator' }
];

const emojiPalette = ['👍', '🔥', '🎉', '💡', '❤️', '🙌', '👏'];

function formatDateTime(timestamp) {
  if (!timestamp) return 'Not scheduled';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return 'Not scheduled';
  return date.toLocaleString();
}

function MessageBubble({ message, onReact, viewerReactions }) {
  const author = message.author ?? {};
  const displayName = `${author.firstName ?? ''} ${author.lastName ?? ''}`.trim() || author.email || 'Community member';
  const time = formatDateTime(message.createdAt);
  const reactions = Array.isArray(message.reactions) ? message.reactions : [];
  const active = new Set(viewerReactions ?? []);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">{displayName}</p>
          <p className="text-xs text-slate-500">{time}</p>
        </div>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          {message.messageType ?? 'message'}
        </span>
      </div>
      <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">{message.body}</p>
      {Array.isArray(message.attachments) && message.attachments.length ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {message.attachments.map((attachment, index) => (
            <a
              key={attachment.url ?? index}
              href={attachment.url}
              target="_blank"
              rel="noreferrer"
              className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600 transition hover:border-primary hover:text-primary"
            >
              <PhotoIcon className="h-4 w-4 text-slate-400 group-hover:text-primary" />
              <span className="truncate">{attachment.title ?? attachment.url}</span>
            </a>
          ))}
        </div>
      ) : null}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {emojiPalette.map((emoji) => {
          const entry = reactions.find((reaction) => reaction.emoji === emoji);
          const count = entry?.count ?? 0;
          const isActive = active.has(emoji);
          return (
            <button
              key={emoji}
              type="button"
              onClick={() => onReact(message.id, emoji, isActive)}
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold transition ${
                isActive ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600 hover:bg-primary/10 hover:text-primary'
              }`}
            >
              <span>{emoji}</span>
              <span>{count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function LearnerCommunityChats() {
  const { session } = useAuth();
  const token = session?.tokens?.accessToken ?? null;
  const userId = session?.user?.id ?? null;

  const [communities, setCommunities] = useState([]);
  const [communitiesLoading, setCommunitiesLoading] = useState(false);
  const [communitiesError, setCommunitiesError] = useState(null);
  const [selectedCommunityId, setSelectedCommunityId] = useState(null);

  const [channels, setChannels] = useState([]);
  const [channelsLoading, setChannelsLoading] = useState(false);
  const [channelsError, setChannelsError] = useState(null);
  const [selectedChannelId, setSelectedChannelId] = useState(null);

  const [channelForm, setChannelForm] = useState(() => createChannelFormState());
  const [channelEditingId, setChannelEditingId] = useState(null);
  const [channelFormStatus, setChannelFormStatus] = useState(null);
  const [channelFormSaving, setChannelFormSaving] = useState(false);

  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState(null);
  const [memberForm, setMemberForm] = useState({ userId: '', role: 'member', notificationsEnabled: true });
  const [memberFormStatus, setMemberFormStatus] = useState(null);

  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState(null);
  const [composer, setComposer] = useState({ body: '', messageType: 'text', attachments: [] });
  const [composerStatus, setComposerStatus] = useState(null);
  const [composerSending, setComposerSending] = useState(false);

  const [presence, setPresence] = useState({
    status: 'offline',
    onlineMembers: [],
    liveSessions: []
  });
  const [presenceError, setPresenceError] = useState(null);
  const [presenceSaving, setPresenceSaving] = useState(false);

  const selectedCommunity = useMemo(
    () => communities.find((entry) => String(entry.id) === String(selectedCommunityId)) ?? null,
    [communities, selectedCommunityId]
  );

  const loadCommunities = useCallback(async () => {
    if (!token) {
      setCommunities([]);
      setSelectedCommunityId(null);
      return;
    }

    setCommunitiesLoading(true);
    setCommunitiesError(null);
    try {
      const response = await fetchCommunities(token);
      const data = Array.isArray(response.data) ? response.data : [];
      setCommunities(data);
      setSelectedCommunityId((prev) => {
        if (prev && data.some((community) => String(community.id) === String(prev))) {
          return String(prev);
        }
        const firstId = data[0]?.id ?? null;
        return firstId === null ? null : String(firstId);
      });
    } catch (error) {
      setCommunitiesError(error?.message ?? 'Unable to load communities.');
    } finally {
      setCommunitiesLoading(false);
    }
  }, [token]);

  const loadChannels = useCallback(async () => {
    if (!token || !selectedCommunityId) {
      setChannels([]);
      setSelectedChannelId(null);
      return;
    }

    setChannelsLoading(true);
    setChannelsError(null);
    try {
      const response = await fetchCommunityChatChannels({ communityId: selectedCommunityId, token });
      const data = Array.isArray(response.data) ? response.data : [];
      setChannels(data);
      setSelectedChannelId((prev) => {
        if (prev && data.some((entry) => String(entry.channel?.id) === String(prev))) {
          return String(prev);
        }
        const firstId = data[0]?.channel?.id ?? null;
        return firstId === null ? null : String(firstId);
      });
    } catch (error) {
      setChannelsError(error?.message ?? 'Unable to load community chat channels.');
    } finally {
      setChannelsLoading(false);
    }
  }, [selectedCommunityId, token]);

  const loadMembers = useCallback(async () => {
    if (!token || !selectedCommunityId || !selectedChannelId) {
      setMembers([]);
      return;
    }
    setMembersLoading(true);
    setMembersError(null);
    try {
      const response = await fetchCommunityChatMembers({
        communityId: selectedCommunityId,
        channelId: selectedChannelId,
        token
      });
      setMembers(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      setMembersError(error?.message ?? 'Unable to load channel members.');
    } finally {
      setMembersLoading(false);
    }
  }, [selectedChannelId, selectedCommunityId, token]);

  const loadMessages = useCallback(async () => {
    if (!token || !selectedCommunityId || !selectedChannelId) {
      setMessages([]);
      return;
    }
    setMessagesLoading(true);
    setMessagesError(null);
    try {
      const response = await fetchCommunityChatMessages({
        communityId: selectedCommunityId,
        channelId: selectedChannelId,
        token,
        params: { limit: 50 }
      });
      const data = Array.isArray(response.data) ? response.data : [];
      setMessages(data);
    } catch (error) {
      setMessagesError(error?.message ?? 'Unable to load channel messages.');
    } finally {
      setMessagesLoading(false);
    }
  }, [selectedChannelId, selectedCommunityId, token]);

  const loadPresence = useCallback(async () => {
    if (!token || !selectedCommunityId) {
      setPresence({ status: 'offline', onlineMembers: [], liveSessions: [] });
      return;
    }
    try {
      const response = await fetchCommunityChatPresence({ communityId: selectedCommunityId, token });
      const data = response.data ?? {};
      setPresence({
        status: data.status ?? 'offline',
        onlineMembers: Array.isArray(data.onlineMembers) ? data.onlineMembers : [],
        liveSessions: Array.isArray(data.liveSessions) ? data.liveSessions : []
      });
      setPresenceError(null);
    } catch (error) {
      setPresenceError(error?.message ?? 'Unable to load presence data.');
    }
  }, [selectedCommunityId, token]);

  useEffect(() => {
    loadCommunities();
  }, [loadCommunities]);

  useEffect(() => {
    loadChannels();
  }, [loadChannels]);

  useEffect(() => {
    loadMembers();
    loadMessages();
  }, [loadMembers, loadMessages]);

  useEffect(() => {
    loadPresence();
    const interval = setInterval(loadPresence, 10000);
    return () => clearInterval(interval);
  }, [loadPresence]);

  const resetChannelForm = useCallback(() => {
    setChannelForm(createChannelFormState());
    setChannelEditingId(null);
    setChannelFormStatus(null);
  }, []);

  const beginChannelEdit = useCallback(
    (channel) => {
      if (!channel?.channel?.id) return;
      const details = channel.channel;
      setChannelEditingId(details.id === null || details.id === undefined ? null : String(details.id));
      setChannelForm({
        name: details.name ?? '',
        slug: details.slug ?? '',
        channelType: details.channelType ?? 'general',
        description: details.description ?? '',
        isDefault: Boolean(details.isDefault),
        metadata: {
          permissions: {
            broadcast: Boolean(details.metadata?.permissions?.broadcast),
            media: Boolean(details.metadata?.permissions?.media ?? true),
            voice: Boolean(details.metadata?.permissions?.voice),
            events: Boolean(details.metadata?.permissions?.events)
          },
          topics: Array.isArray(details.metadata?.topics) ? details.metadata.topics : [],
          live: {
            enabled: Boolean(details.metadata?.live?.enabled),
            provider: details.metadata?.live?.provider ?? 'internal',
            url: details.metadata?.live?.url ?? '',
            startAt: details.metadata?.live?.startAt ?? ''
          }
        }
      });
      setChannelFormStatus(null);
    },
    []
  );

  const updateChannelMetadata = useCallback((path, value) => {
    setChannelForm((prev) => {
      const next = { ...prev, metadata: { ...prev.metadata } };
      if (path.startsWith('permissions.')) {
        const key = path.split('.')[1];
        next.metadata.permissions = { ...prev.metadata.permissions, [key]: value };
      } else if (path === 'topics') {
        next.metadata.topics = value;
      } else if (path.startsWith('live.')) {
        const key = path.split('.')[1];
        next.metadata.live = { ...prev.metadata.live, [key]: value };
      }
      return next;
    });
  }, []);

  const submitChannelForm = useCallback(
    async (event) => {
      event.preventDefault();
      if (!token || !selectedCommunityId) return;
      setChannelFormSaving(true);
      setChannelFormStatus(null);
      const payload = {
        name: channelForm.name.trim(),
        slug: channelForm.slug?.trim() || undefined,
        channelType: channelForm.channelType,
        description: channelForm.description?.trim() || null,
        isDefault: channelForm.isDefault,
        metadata: {
          permissions: channelForm.metadata.permissions,
          topics: (channelForm.metadata.topics ?? []).map((topic) => topic.trim()).filter(Boolean),
          live: {
            enabled: channelForm.metadata.live.enabled,
            provider: channelForm.metadata.live.provider,
            url: channelForm.metadata.live.url?.trim() || null,
            startAt: channelForm.metadata.live.startAt || null
          }
        }
      };

      try {
        if (channelEditingId) {
          await updateCommunityChatChannel({
            communityId: selectedCommunityId,
            channelId: channelEditingId,
            token,
            payload
          });
          setChannelFormStatus({ type: 'success', message: 'Channel updated.' });
        } else {
          await createCommunityChatChannel({ communityId: selectedCommunityId, token, payload });
          setChannelFormStatus({ type: 'success', message: 'Channel created.' });
        }
        await loadChannels();
        resetChannelForm();
      } catch (error) {
        setChannelFormStatus({ type: 'error', message: error?.message ?? 'Unable to save channel.' });
      } finally {
        setChannelFormSaving(false);
      }
    },
    [channelEditingId, channelForm, loadChannels, resetChannelForm, selectedCommunityId, token]
  );

  const handleDeleteChannel = useCallback(
    async (channelId) => {
      if (!token || !selectedCommunityId || !channelId) return;
      if (!window.confirm('Delete this channel? This cannot be undone.')) return;
      try {
        await deleteCommunityChatChannel({ communityId: selectedCommunityId, channelId, token });
        if (channelEditingId === channelId) {
          resetChannelForm();
        }
        await loadChannels();
      } catch (error) {
        setChannelFormStatus({ type: 'error', message: error?.message ?? 'Unable to delete channel.' });
      }
    },
    [channelEditingId, loadChannels, resetChannelForm, selectedCommunityId, token]
  );

  const submitMemberForm = useCallback(
    async (event) => {
      event.preventDefault();
      if (!token || !selectedCommunityId || !selectedChannelId || !memberForm.userId) {
        return;
      }
      setMemberFormStatus(null);
      try {
        await upsertCommunityChatMember({
          communityId: selectedCommunityId,
          channelId: selectedChannelId,
          token,
          payload: {
            userId: memberForm.userId,
            role: memberForm.role,
            notificationsEnabled: memberForm.notificationsEnabled,
            metadata: { addedBy: userId }
          }
        });
        setMemberFormStatus({ type: 'success', message: 'Member updated.' });
        setMemberForm({ userId: '', role: 'member', notificationsEnabled: true });
        await loadMembers();
      } catch (error) {
        setMemberFormStatus({ type: 'error', message: error?.message ?? 'Unable to update member.' });
      }
    },
    [loadMembers, memberForm, selectedChannelId, selectedCommunityId, token, userId]
  );

  const handleRemoveMember = useCallback(
    async (user) => {
      if (!token || !selectedCommunityId || !selectedChannelId || !user?.membership?.userId) {
        return;
      }
      if (!window.confirm('Remove this member from the channel?')) return;
      try {
        await removeCommunityChatMember({
          communityId: selectedCommunityId,
          channelId: selectedChannelId,
          userId: user.membership.userId,
          token
        });
        await loadMembers();
      } catch (error) {
        setMemberFormStatus({ type: 'error', message: error?.message ?? 'Unable to remove member.' });
      }
    },
    [loadMembers, selectedChannelId, selectedCommunityId, token]
  );

  const updateComposerAttachment = useCallback((index, field, value) => {
    setComposer((prev) => {
      const next = [...(prev.attachments ?? [])];
      next[index] = { ...next[index], [field]: value };
      return { ...prev, attachments: next };
    });
  }, []);

  const addComposerAttachment = useCallback(() => {
    setComposer((prev) => ({
      ...prev,
      attachments: [...(prev.attachments ?? []), { title: '', url: '', type: 'resource' }]
    }));
  }, []);

  const removeComposerAttachment = useCallback((index) => {
    setComposer((prev) => {
      const next = [...(prev.attachments ?? [])];
      next.splice(index, 1);
      return { ...prev, attachments: next };
    });
  }, []);

  const submitComposer = useCallback(
    async (event) => {
      event.preventDefault();
      if (!token || !selectedCommunityId || !selectedChannelId || !composer.body.trim()) return;
      setComposerSending(true);
      setComposerStatus(null);
      const payload = {
        body: composer.body.trim(),
        messageType: composer.messageType,
        attachments: (composer.attachments ?? [])
          .filter((attachment) => attachment.url?.trim())
          .map((attachment) => ({
            title: attachment.title?.trim() || null,
            url: attachment.url.trim(),
            type: attachment.type ?? 'resource'
          })),
        metadata:
          composer.messageType === 'live'
            ? {
                live: {
                  startedBy: userId,
                  startedAt: new Date().toISOString()
                }
              }
            : { source: 'learner-dashboard' }
      };

      try {
        await postCommunityChatMessage({
          communityId: selectedCommunityId,
          channelId: selectedChannelId,
          token,
          payload
        });
        setComposerStatus({ type: 'success', message: 'Message delivered.' });
        setComposer({ body: '', messageType: 'text', attachments: [] });
        await loadMessages();
      } catch (error) {
        setComposerStatus({ type: 'error', message: error?.message ?? 'Unable to send message.' });
      } finally {
        setComposerSending(false);
      }
    },
    [composer, loadMessages, selectedChannelId, selectedCommunityId, token, userId]
  );

  const handleReaction = useCallback(
    async (messageId, emoji, isActive) => {
      if (!token || !selectedCommunityId || !selectedChannelId || !messageId) return;
      try {
        if (isActive) {
          await removeCommunityChatReaction({
            communityId: selectedCommunityId,
            channelId: selectedChannelId,
            messageId,
            token,
            payload: { emoji }
          });
        } else {
          await addCommunityChatReaction({
            communityId: selectedCommunityId,
            channelId: selectedChannelId,
            messageId,
            token,
            payload: { emoji }
          });
        }
        await loadMessages();
      } catch (error) {
        setMessagesError(error?.message ?? 'Unable to update reactions.');
      }
    },
    [loadMessages, selectedChannelId, selectedCommunityId, token]
  );

  const handlePresenceUpdate = useCallback(
    async (status) => {
      if (!token || !selectedCommunityId) return;
      setPresenceSaving(true);
      try {
        await updateCommunityChatPresence({
          communityId: selectedCommunityId,
          token,
          payload: { status }
        });
        await loadPresence();
      } catch (error) {
        setPresenceError(error?.message ?? 'Unable to update presence.');
      } finally {
        setPresenceSaving(false);
      }
    },
    [loadPresence, selectedCommunityId, token]
  );

  const handleStartLiveSession = useCallback(() => {
    setComposer((prev) => ({
      ...prev,
      messageType: 'live',
      body: prev.body || 'Live session starting now. Join us in the voice room!',
      attachments: prev.attachments
    }));
    updateChannelMetadata('live.enabled', true);
  }, [updateChannelMetadata]);

  if (!token) {
    return (
      <DashboardStateMessage
        variant="error"
        title="Sign in required"
        description="You need to be signed in to orchestrate community chat experiences."
      />
    );
  }

  if (communitiesLoading && !communities.length) {
    return (
      <DashboardStateMessage
        title="Loading community chat"
        description="Fetching communities and chat channel architecture."
      />
    );
  }

  if (communitiesError && !communities.length) {
    return (
      <DashboardStateMessage
        variant="error"
        title="Unable to load communities"
        description={communitiesError}
        actionLabel="Retry"
        onAction={loadCommunities}
      />
    );
  }

  if (!selectedCommunity) {
    return (
      <DashboardStateMessage
        title="No communities available"
        description="Join or create a community to unlock the live chat command center."
        actionLabel="Refresh"
        onAction={loadCommunities}
      />
    );
  }

  const presenceStatus = presenceOptions.find((entry) => entry.value === presence.status) ?? presenceOptions[0];

  return (
    <div className="space-y-10">
      <DashboardSectionHeader
        eyebrow="Community chat"
        title="Real-time command center"
        description="Design rich channel experiences, orchestrate live sessions, and manage moderators without leaving your dashboard."
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="dashboard-pill"
              onClick={loadChannels}
              disabled={channelsLoading}
            >
              Refresh channels
            </button>
            <button
              type="button"
              className="dashboard-primary-pill"
              onClick={handleStartLiveSession}
            >
              Launch live session
            </button>
          </div>
        }
      />

      <section className="grid gap-6 xl:grid-cols-4">
        <div className="xl:col-span-1 space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Community</p>
                <p className="mt-1 text-base font-semibold text-slate-900">{selectedCommunity.name ?? 'Community'}</p>
              </div>
              <UserGroupIcon className="h-6 w-6 text-primary" />
            </div>
            <select
              value={selectedCommunityId ?? ''}
              onChange={(event) => setSelectedCommunityId(event.target.value || null)}
              className="mt-4 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {communities.map((community) => (
                <option key={community.id} value={String(community.id)}>
                  {community.name}
                </option>
              ))}
            </select>
            <div className="mt-4 grid gap-3 text-xs text-slate-500">
              <div className="flex items-center justify-between">
                <span>Channels</span>
                <span className="font-semibold text-slate-900">{channels.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Online now</span>
                <span className="font-semibold text-emerald-600">{presence.onlineMembers.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Live sessions</span>
                <span className="font-semibold text-primary">{presence.liveSessions.length}</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">Channels</h3>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white shadow-sm transition hover:bg-primary-dark"
                onClick={resetChannelForm}
              >
                <PlusIcon className="h-4 w-4" />
                New channel
              </button>
            </div>
            <div className="space-y-2">
              {channelsLoading ? (
                <p className="text-xs text-slate-500">Loading channels…</p>
              ) : null}
              {channelsError ? (
                <p className="rounded-2xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600">{channelsError}</p>
              ) : null}
              {channels.map((entry) => {
                const channel = entry.channel;
                const isActive = String(channel.id) === String(selectedChannelId);
                return (
                  <button
                    key={channel.id}
                    type="button"
                    onClick={() => setSelectedChannelId(String(channel.id))}
                    className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                      isActive
                        ? 'border-primary bg-primary/10 text-primary shadow-sm'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-primary/60'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold uppercase tracking-wide">#{channel.slug}</span>
                      <span>{entry.memberCount ?? 0} members</span>
                    </div>
                    <p className="mt-1 text-sm font-semibold">{channel.name}</p>
                    <p className="text-xs text-slate-500">{channel.description ?? 'No description yet.'}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-wide text-slate-400">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5">{channel.channelType}</span>
                      {entry.unreadCount ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-600">
                          {entry.unreadCount} unread
                        </span>
                      ) : null}
                      {channel.metadata?.live?.enabled ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-primary">
                          <BoltIcon className="h-3 w-3" /> Live ready
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          beginChannelEdit(entry);
                        }}
                        className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-primary hover:text-primary"
                      >
                        <PencilSquareIcon className="h-3 w-3" /> Edit
                      </button>
                      {!entry.channel.isDefault ? (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleDeleteChannel(channel.id);
                          }}
                          className="inline-flex items-center gap-1 rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
                        >
                          <TrashIcon className="h-3 w-3" /> Remove
                        </button>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="xl:col-span-3 space-y-6">
          <section className="grid gap-6 lg:grid-cols-5">
            <form
              onSubmit={submitChannelForm}
              className="lg:col-span-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    {channelEditingId ? 'Edit channel' : 'Create new channel'}
                  </h2>
                  <p className="text-xs text-slate-500">Design a channel with rich permissions, media, and live controls.</p>
                </div>
                <SquaresPlusIcon className="h-6 w-6 text-primary" />
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <label className="flex flex-col text-sm font-medium text-slate-700">
                  Channel name
                  <input
                    type="text"
                    value={channelForm.name}
                    onChange={(event) => setChannelForm((prev) => ({ ...prev, name: event.target.value }))}
                    required
                    className="mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </label>
                <label className="flex flex-col text-sm font-medium text-slate-700">
                  Custom slug
                  <input
                    type="text"
                    value={channelForm.slug}
                    onChange={(event) => setChannelForm((prev) => ({ ...prev, slug: event.target.value }))}
                    placeholder="growth-room"
                    className="mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </label>
                <label className="flex flex-col text-sm font-medium text-slate-700">
                  Channel type
                  <select
                    value={channelForm.channelType}
                    onChange={(event) => setChannelForm((prev) => ({ ...prev, channelType: event.target.value }))}
                    className="mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    {channelTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col text-sm font-medium text-slate-700">
                  Default channel
                  <select
                    value={channelForm.isDefault ? 'yes' : 'no'}
                    onChange={(event) =>
                      setChannelForm((prev) => ({ ...prev, isDefault: event.target.value === 'yes' }))
                    }
                    className="mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="no">No</option>
                    <option value="yes">Yes</option>
                  </select>
                </label>
                <label className="md:col-span-2 flex flex-col text-sm font-medium text-slate-700">
                  Channel purpose
                  <textarea
                    value={channelForm.description}
                    onChange={(event) => setChannelForm((prev) => ({ ...prev, description: event.target.value }))}
                    rows={3}
                    placeholder="Describe what this channel unlocks."
                    className="mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </label>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-900">Permissions</p>
                  <p className="text-xs text-slate-500">Toggle the capabilities unlocked in this channel.</p>
                  <div className="mt-4 space-y-3 text-sm text-slate-700">
                    {[
                      { key: 'broadcast', label: 'Broadcast announcements', icon: MegaphoneIcon },
                      { key: 'media', label: 'Share media & files', icon: PhotoIcon },
                      { key: 'voice', label: 'Voice lounge', icon: MusicalNoteIcon },
                      { key: 'events', label: 'Schedule events', icon: CalendarDaysIcon }
                    ].map((item) => {
                      const Icon = item.icon;
                      return (
                        <label key={item.key} className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 shadow-sm">
                          <span className="inline-flex items-center gap-2">
                            <Icon className="h-4 w-4 text-primary" />
                            {item.label}
                          </span>
                          <input
                            type="checkbox"
                            checked={Boolean(channelForm.metadata.permissions[item.key])}
                            onChange={(event) => updateChannelMetadata(`permissions.${item.key}`, event.target.checked)}
                            className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-900">Topics & live configuration</p>
                  <div className="mt-3 space-y-3">
                    <label className="flex flex-col text-xs font-medium text-slate-600">
                      Topics (comma separated)
                      <input
                        type="text"
                        value={(channelForm.metadata.topics ?? []).join(', ')}
                        onChange={(event) =>
                          updateChannelMetadata(
                            'topics',
                            event.target.value
                              .split(',')
                              .map((topic) => topic.trim())
                              .filter(Boolean)
                          )
                        }
                        className="mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </label>
                    <label className="flex flex-col text-xs font-medium text-slate-600">
                      Live provider
                      <select
                        value={channelForm.metadata.live.provider}
                        onChange={(event) => updateChannelMetadata('live.provider', event.target.value)}
                        className="mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      >
                        <option value="internal">Edulure Live</option>
                        <option value="zoom">Zoom</option>
                        <option value="teams">Microsoft Teams</option>
                        <option value="custom">Custom RTMP</option>
                      </select>
                    </label>
                    <label className="flex flex-col text-xs font-medium text-slate-600">
                      Live URL
                      <input
                        type="url"
                        value={channelForm.metadata.live.url}
                        onChange={(event) => updateChannelMetadata('live.url', event.target.value)}
                        placeholder="https://"
                        className="mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </label>
                    <label className="flex flex-col text-xs font-medium text-slate-600">
                      Next live start
                      <input
                        type="datetime-local"
                        value={channelForm.metadata.live.startAt ?? ''}
                        onChange={(event) => updateChannelMetadata('live.startAt', event.target.value)}
                        className="mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </label>
                    <label className="flex items-center gap-3 text-xs font-medium text-slate-600">
                      <input
                        type="checkbox"
                        checked={channelForm.metadata.live.enabled}
                        onChange={(event) => updateChannelMetadata('live.enabled', event.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                      />
                      Enable live session lobby
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Attendees will see live session details instantly when this toggle is on.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={channelFormSaving}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark disabled:opacity-50"
                >
                  {channelFormSaving ? 'Saving…' : channelEditingId ? 'Save changes' : 'Create channel'}
                </button>
                <button
                  type="button"
                  onClick={resetChannelForm}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-primary hover:text-primary"
                >
                  Reset
                </button>
                {channelFormStatus ? (
                  <span
                    className={`text-xs font-semibold ${
                      channelFormStatus.type === 'error' ? 'text-rose-600' : 'text-emerald-600'
                    }`}
                  >
                    {channelFormStatus.message}
                  </span>
                ) : null}
              </div>
            </form>

            <div className="lg:col-span-2 space-y-4">
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Presence</p>
                    <p className="mt-1 text-base font-semibold text-slate-900">{presenceStatus.label}</p>
                  </div>
                  <CircleStackIcon className="h-6 w-6 text-primary" />
                </div>
                {presenceError ? (
                  <p className="mt-3 text-xs text-rose-600">{presenceError}</p>
                ) : null}
                <div className="mt-4 space-y-3">
                  {presenceOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handlePresenceUpdate(option.value)}
                      className={`w-full rounded-2xl border px-3 py-2 text-left text-xs font-semibold transition ${
                        option.value === presence.status
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-slate-200 text-slate-600 hover:border-primary hover:text-primary'
                      }`}
                      disabled={presenceSaving}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Live sessions</p>
                    <p className="mt-1 text-base font-semibold text-slate-900">
                      {presence.liveSessions.length ? 'Upcoming sessions' : 'No sessions scheduled'}
                    </p>
                  </div>
                  <VideoCameraIcon className="h-6 w-6 text-primary" />
                </div>
                <div className="mt-4 space-y-3 text-xs text-slate-600">
                  {presence.liveSessions.length ? (
                    presence.liveSessions.map((session, index) => (
                      <div key={session.id ?? index} className="rounded-2xl border border-slate-200 px-3 py-2">
                        <p className="font-semibold text-slate-900">{session.title ?? 'Community live session'}</p>
                        <p>{formatDateTime(session.startAt)}</p>
                        <p className="text-[11px] text-slate-500">Host {session.host ?? 'To be announced'}</p>
                      </div>
                    ))
                  ) : (
                    <p className="rounded-2xl bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
                      Schedule a live session by enabling the live lobby and posting a live update.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-5">
            <div className="lg:col-span-2 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Moderators & members</h3>
                  <p className="text-xs text-slate-500">Invite teammates, promote moderators, and shape access controls.</p>
                </div>
                <UsersIcon className="h-6 w-6 text-primary" />
              </div>
              <form onSubmit={submitMemberForm} className="mt-4 space-y-3 rounded-2xl bg-slate-50 p-4">
                <label className="flex flex-col text-xs font-semibold text-slate-600">
                  User ID
                  <input
                    type="text"
                    value={memberForm.userId}
                    onChange={(event) => setMemberForm((prev) => ({ ...prev, userId: event.target.value }))}
                    placeholder="Search or paste user ID"
                    className="mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </label>
                <label className="flex flex-col text-xs font-semibold text-slate-600">
                  Role
                  <select
                    value={memberForm.role}
                    onChange={(event) => setMemberForm((prev) => ({ ...prev, role: event.target.value }))}
                    className="mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    {memberRoleOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex items-center gap-3 text-xs font-semibold text-slate-600">
                  <input
                    type="checkbox"
                    checked={memberForm.notificationsEnabled}
                    onChange={(event) =>
                      setMemberForm((prev) => ({ ...prev, notificationsEnabled: event.target.checked }))
                    }
                    className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                  />
                  Enable notifications
                </label>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark"
                >
                  <UserPlusIcon className="h-4 w-4" />
                  Save member
                </button>
                {memberFormStatus ? (
                  <p
                    className={`text-xs font-semibold ${
                      memberFormStatus.type === 'error' ? 'text-rose-600' : 'text-emerald-600'
                    }`}
                  >
                    {memberFormStatus.message}
                  </p>
                ) : null}
              </form>
              <div className="mt-4 space-y-3">
                {membersLoading ? <p className="text-xs text-slate-500">Loading members…</p> : null}
                {membersError ? (
                  <p className="rounded-2xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600">{membersError}</p>
                ) : null}
                {members.map((entry) => (
                  <div
                    key={entry.membership.userId}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm"
                  >
                    <div>
                      <p className="font-semibold text-slate-900">
                        {`${entry.user?.firstName ?? ''} ${entry.user?.lastName ?? ''}`.trim() ||
                          entry.user?.email ||
                          entry.membership.userId}
                      </p>
                      <p className="text-xs text-slate-500">Role · {entry.membership.role}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(entry)}
                        className="inline-flex items-center gap-1 rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
                      >
                        <TrashIcon className="h-3 w-3" /> Remove
                      </button>
                    </div>
                  </div>
                ))}
                {!members.length && !membersLoading ? (
                  <p className="rounded-2xl bg-slate-50 px-3 py-2 text-xs text-slate-500">
                    No members yet. Add a moderator or learner to unlock this channel.
                  </p>
                ) : null}
              </div>
            </div>

            <div className="lg:col-span-3 space-y-4">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">Channel timeline</h3>
                    <p className="text-xs text-slate-500">Broadcast updates, run interactive sessions, and capture replays.</p>
                  </div>
                  <ChatBubbleLeftEllipsisIcon className="h-6 w-6 text-primary" />
                </div>

                <form onSubmit={submitComposer} className="mt-4 space-y-3 rounded-2xl bg-slate-50 p-4">
                  <label className="flex flex-col text-xs font-semibold text-slate-600">
                    Message format
                    <select
                      value={composer.messageType}
                      onChange={(event) => setComposer((prev) => ({ ...prev, messageType: event.target.value }))}
                      className="mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="text">Text update</option>
                      <option value="event">Event announcement</option>
                      <option value="live">Live session marker</option>
                    </select>
                  </label>
                  <label className="flex flex-col text-xs font-semibold text-slate-600">
                    Message
                    <textarea
                      value={composer.body}
                      onChange={(event) => setComposer((prev) => ({ ...prev, body: event.target.value }))}
                      rows={4}
                      placeholder="Share an update, drop resources, or kickoff a live session."
                      className="mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </label>
                  <div className="space-y-3">
                    {composer.attachments?.map((attachment, index) => (
                      <div key={index} className="grid gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 md:grid-cols-3">
                        <label className="flex flex-col">
                          Title
                          <input
                            type="text"
                            value={attachment.title ?? ''}
                            onChange={(event) => updateComposerAttachment(index, 'title', event.target.value)}
                            className="mt-1 rounded-lg border border-slate-200 px-2 py-1 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                          />
                        </label>
                        <label className="flex flex-col">
                          URL
                          <input
                            type="url"
                            required
                            value={attachment.url ?? ''}
                            onChange={(event) => updateComposerAttachment(index, 'url', event.target.value)}
                            className="mt-1 rounded-lg border border-slate-200 px-2 py-1 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                          />
                        </label>
                        <label className="flex flex-col">
                          Type
                          <select
                            value={attachment.type ?? 'resource'}
                            onChange={(event) => updateComposerAttachment(index, 'type', event.target.value)}
                            className="mt-1 rounded-lg border border-slate-200 px-2 py-1 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                          >
                            <option value="resource">Resource</option>
                            <option value="media">Media</option>
                            <option value="document">Document</option>
                            <option value="deck">Deck</option>
                          </select>
                        </label>
                        <div className="md:col-span-3 flex justify-end">
                          <button
                            type="button"
                            onClick={() => removeComposerAttachment(index)}
                            className="inline-flex items-center gap-1 rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
                          >
                            <TrashIcon className="h-3 w-3" /> Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={addComposerAttachment}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-primary hover:text-primary"
                    >
                      <PhotoIcon className="h-4 w-4" /> Add attachment
                    </button>
                    <button
                      type="submit"
                      disabled={composerSending}
                      className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark disabled:opacity-50"
                    >
                      <PaperAirplaneIcon className="h-4 w-4" />
                      {composerSending ? 'Sending…' : 'Send to channel'}
                    </button>
                    {composerStatus ? (
                      <span
                        className={`text-xs font-semibold ${
                          composerStatus.type === 'error' ? 'text-rose-600' : 'text-emerald-600'
                        }`}
                      >
                        {composerStatus.message}
                      </span>
                    ) : null}
                  </div>
                </form>

                <div className="mt-6 space-y-3">
                  {messagesLoading ? <p className="text-xs text-slate-500">Loading messages…</p> : null}
                  {messagesError ? (
                    <p className="rounded-2xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600">{messagesError}</p>
                  ) : null}
                  {messages.map((message) => (
                    <MessageBubble
                      key={message.id}
                      message={message}
                      onReact={handleReaction}
                      viewerReactions={message.viewerReactions}
                    />
                  ))}
                  {!messages.length && !messagesLoading ? (
                    <p className="rounded-2xl bg-slate-50 px-3 py-2 text-xs text-slate-500">
                      No messages yet. Use the composer above to seed the channel with your first update.
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}

