import { useCallback, useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';

import DashboardStateMessage from '../../components/dashboard/DashboardStateMessage.jsx';
import DashboardActionFeedback from '../../components/dashboard/DashboardActionFeedback.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { fetchCommunities } from '../../api/communityApi.js';
import ChannelSidebar from './community/instructorChats/ChannelSidebar.jsx';
import MessageTimeline from './community/instructorChats/MessageTimeline.jsx';
import MessageComposer from './community/instructorChats/MessageComposer.jsx';
import PresencePanel from './community/instructorChats/PresencePanel.jsx';
import RoleManagementPanel from './community/instructorChats/RoleManagementPanel.jsx';
import EventPlanner from './community/instructorChats/EventPlanner.jsx';
import ResourceLibraryPanel from './community/instructorChats/ResourceLibraryPanel.jsx';
import useCommunityChatWorkspace from './community/instructorChats/useCommunityChatWorkspace.js';
import { resolveInstructorAccess } from './instructor/instructorAccess.js';

const initialComposerState = {
  messageType: 'text',
  body: '',
  attachmentUrl: '',
  attachmentLabel: '',
  liveTopic: '',
  meetingUrl: '',
  metadataNote: '',
  targetMemberId: ''
};

const initialPresenceForm = {
  status: 'online',
  client: 'web',
  ttlMinutes: 15,
  metadata: '{}'
};

const initialRoleCreateForm = {
  name: '',
  roleKey: '',
  description: '',
  canBroadcast: false,
  canModerate: false,
  canHostVoice: false,
  isDefaultAssignable: true
};

const initialRoleAssignmentForm = {
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
  isOnline: true,
  timezone: ''
};

const initialResourceForm = {
  title: '',
  description: '',
  resourceType: 'external_link',
  linkUrl: '',
  assetId: '',
  tags: '',
  visibility: 'members'
};

const parseMetadata = (value) => {
  if (!value || !value.trim()) return {};
  try {
    return JSON.parse(value);
  } catch (_error) {
    return { note: value };
  }
};

export default function InstructorCommunityChats() {
  const { session, isAuthenticated } = useAuth();
  const token = session?.tokens?.accessToken ?? null;
  const outletContext = useOutletContext();
  const role = outletContext?.role ?? null;
  const access = resolveInstructorAccess(role);
  const hasAccess = access.granted;

  const [communitiesState, setCommunitiesState] = useState({ items: [], loading: false, error: null });
  const [selectedCommunityId, setSelectedCommunityId] = useState(null);
  const [communityReloadToken, setCommunityReloadToken] = useState(0);

  const [composerState, setComposerState] = useState(initialComposerState);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [presenceForm, setPresenceForm] = useState(initialPresenceForm);
  const [roleCreateForm, setRoleCreateForm] = useState(initialRoleCreateForm);
  const [roleAssignmentForm, setRoleAssignmentForm] = useState(initialRoleAssignmentForm);
  const [eventForm, setEventForm] = useState(initialEventForm);
  const [resourceForm, setResourceForm] = useState(initialResourceForm);

  const {
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
    refreshWorkspace,
    socialGraph
  } = useCommunityChatWorkspace({
    communityId: hasAccess ? selectedCommunityId : null,
    token: hasAccess ? token : null
  });

  useEffect(() => {
    if (!isAuthenticated || !token || !hasAccess) {
      setCommunitiesState({ items: [], loading: false, error: null });
      setSelectedCommunityId(null);
      return undefined;
    }

    let cancelled = false;
    setCommunitiesState((prev) => ({ ...prev, loading: true, error: null }));
    fetchCommunities(token)
      .then((response) => {
        if (cancelled) return;
        const items = Array.isArray(response?.data) ? response.data : [];
        setCommunitiesState({ items, loading: false, error: null });
        setSelectedCommunityId((current) => {
          if (current && items.some((community) => String(community.id) === current)) {
            return current;
          }
          return items[0] ? String(items[0].id) : null;
        });
      })
      .catch((error) => {
        if (cancelled) return;
        const normalised = error instanceof Error ? error : new Error('Failed to load communities');
        setCommunitiesState({ items: [], loading: false, error: normalised });
      });

    return () => {
      cancelled = true;
    };
  }, [hasAccess, isAuthenticated, token, communityReloadToken]);

  useEffect(() => {
    setComposerState(initialComposerState);
    setPresenceForm(initialPresenceForm);
    setRoleCreateForm(initialRoleCreateForm);
    setRoleAssignmentForm(initialRoleAssignmentForm);
    setEventForm(initialEventForm);
    setResourceForm(initialResourceForm);
  }, [selectedCommunityId]);

  const communityOptions = useMemo(
    () =>
      communitiesState.items.map((community) => ({
        id: String(community.id),
        title: community.name ?? `Community ${community.id}`
      })),
    [communitiesState.items]
  );

  const handleSendMessage = async () => {
    if (!composerState.body.trim()) {
      setWorkspaceNotice({
        tone: 'error',
        message: 'Message body required',
        detail: 'Add content to your update before sending.'
      });
      return;
    }
    setSendingMessage(true);
    const attachments = composerState.attachmentUrl
      ? [
          {
            url: composerState.attachmentUrl,
            title: composerState.attachmentLabel || undefined
          }
        ]
      : [];
    const metadata = composerState.metadataNote ? { note: composerState.metadataNote } : {};
    if (composerState.messageType === 'live') {
      if (composerState.liveTopic) metadata.topic = composerState.liveTopic;
      if (composerState.meetingUrl) metadata.meetingUrl = composerState.meetingUrl;
    }
    if (composerState.targetMemberId) {
      metadata.directTargetMemberId = composerState.targetMemberId;
    }
    try {
      await sendMessage({
        messageType: composerState.messageType,
        body: composerState.body,
        attachments,
        metadata
      });
      setComposerState(initialComposerState);
    } catch (error) {
      setWorkspaceNotice({
        tone: 'error',
        message: 'Failed to send message',
        detail: error?.message ?? 'Please retry shortly.'
      });
    } finally {
      setSendingMessage(false);
    }
  };

  const handleLoadMoreMessages = async (before) => {
    const targetTimestamp = before ?? messagesState.items[0]?.createdAt;
    if (!targetTimestamp) return;
    try {
      await loadMessages({ channelId: activeChannelId, before: targetTimestamp, refresh: false });
    } catch (error) {
      setWorkspaceNotice({
        tone: 'error',
        message: 'Failed to load earlier messages',
        detail: error?.message ?? 'Try refreshing the workspace.'
      });
    }
  };

  const handleSelectDirectRecipient = useCallback(
    (recipient) => {
      if (!recipient?.id) return;
      setComposerState((current) => ({
        ...current,
        messageType: current.messageType === 'system' ? 'text' : current.messageType,
        targetMemberId: recipient.id
      }));
      setWorkspaceNotice({
        tone: 'info',
        message: 'Composer ready for direct intro',
        detail: `Messaging focus set to ${recipient.displayName}.`
      });
    },
    [setWorkspaceNotice]
  );

  const handleReactToMessage = async (messageId, emoji) => {
    try {
      await reactToMessage({ channelId: activeChannelId, messageId, emoji });
    } catch (error) {
      setWorkspaceNotice({
        tone: 'error',
        message: 'Unable to add reaction',
        detail: error?.message ?? 'Please try again.'
      });
    }
  };

  const handleRemoveReaction = async (messageId, emoji) => {
    try {
      await removeReaction({ channelId: activeChannelId, messageId, emoji });
    } catch (error) {
      setWorkspaceNotice({
        tone: 'error',
        message: 'Unable to remove reaction',
        detail: error?.message ?? 'Please try again.'
      });
    }
  };

  const handleModerateMessage = async (messageId, action) => {
    try {
      await moderateMessage({ channelId: activeChannelId, messageId, action, reason: 'Updated via instructor dashboard' });
    } catch (error) {
      setWorkspaceNotice({
        tone: 'error',
        message: 'Unable to update message moderation',
        detail: error?.message ?? 'Please try again.'
      });
    }
  };

  const handlePresenceSubmit = async () => {
    try {
      const metadata = parseMetadata(presenceForm.metadata);
      await updatePresenceStatus({
        status: presenceForm.status,
        client: presenceForm.client,
        ttlMinutes: Number(presenceForm.ttlMinutes) || 15,
        metadata
      });
      loadPresence();
    } catch (error) {
      setWorkspaceNotice({
        tone: 'error',
        message: 'Unable to update presence',
        detail: error?.message ?? 'Please try again.'
      });
    }
  };

  const handleCreateRole = async () => {
    if (!roleCreateForm.name || !roleCreateForm.roleKey) {
      setWorkspaceNotice({
        tone: 'error',
        message: 'Role details required',
        detail: 'Enter a name and key for the role before creating it.'
      });
      return;
    }
    try {
      await createRoleEntry({
        name: roleCreateForm.name,
        roleKey: roleCreateForm.roleKey,
        description: roleCreateForm.description,
        permissions: {
          broadcast: roleCreateForm.canBroadcast,
          moderate: roleCreateForm.canModerate,
          voice: roleCreateForm.canHostVoice
        },
        isDefaultAssignable: roleCreateForm.isDefaultAssignable
      });
      setRoleCreateForm(initialRoleCreateForm);
      loadRoles();
    } catch (error) {
      setWorkspaceNotice({
        tone: 'error',
        message: 'Unable to create role',
        detail: error?.message ?? 'Please try again.'
      });
    }
  };

  const handleAssignRole = async () => {
    if (!roleAssignmentForm.userId || !roleAssignmentForm.roleKey) {
      setWorkspaceNotice({
        tone: 'error',
        message: 'Assignment details required',
        detail: 'Provide a member ID and role to assign.'
      });
      return;
    }
    try {
      await assignRoleToMember({
        userId: roleAssignmentForm.userId.trim(),
        roleKey: roleAssignmentForm.roleKey
      });
      setRoleAssignmentForm(initialRoleAssignmentForm);
      loadRoles();
    } catch (error) {
      setWorkspaceNotice({
        tone: 'error',
        message: 'Unable to assign role',
        detail: error?.message ?? 'Please try again.'
      });
    }
  };

  const handleCreateEvent = async () => {
    if (!eventForm.title || !eventForm.startAt || !eventForm.endAt) {
      setWorkspaceNotice({
        tone: 'error',
        message: 'Event details required',
        detail: 'Provide a title, start time, and end time for the event.'
      });
      return;
    }
    const start = new Date(eventForm.startAt);
    const end = new Date(eventForm.endAt);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      setWorkspaceNotice({
        tone: 'error',
        message: 'Invalid dates',
        detail: 'Ensure the event start and end times are valid.'
      });
      return;
    }
    try {
      await createEventEntry({
        title: eventForm.title,
        summary: eventForm.summary || undefined,
        startAt: start.toISOString(),
        endAt: end.toISOString(),
        meetingUrl: eventForm.meetingUrl || null,
        visibility: eventForm.visibility,
        attendanceLimit: eventForm.attendanceLimit ? Number(eventForm.attendanceLimit) : undefined,
        isOnline: Boolean(eventForm.isOnline),
        timezone: eventForm.timezone || undefined
      });
      setEventForm(initialEventForm);
      loadEvents();
    } catch (error) {
      setWorkspaceNotice({
        tone: 'error',
        message: 'Unable to schedule event',
        detail: error?.message ?? 'Please try again.'
      });
    }
  };

  const handleCreateResource = async () => {
    if (!resourceForm.title) {
      setWorkspaceNotice({
        tone: 'error',
        message: 'Resource title required',
        detail: 'Add a title before publishing a resource.'
      });
      return;
    }
    if (resourceForm.resourceType === 'content_asset' && !resourceForm.assetId) {
      setWorkspaceNotice({
        tone: 'error',
        message: 'Asset ID required',
        detail: 'Provide an asset ID for content assets.'
      });
      return;
    }
    if (resourceForm.resourceType !== 'content_asset' && !resourceForm.linkUrl) {
      setWorkspaceNotice({
        tone: 'error',
        message: 'Link required',
        detail: 'Provide a link URL for this resource type.'
      });
      return;
    }
    try {
      const tags = resourceForm.tags
        ? resourceForm.tags
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean)
        : [];
      const payload = {
        title: resourceForm.title,
        description: resourceForm.description || undefined,
        resourceType: resourceForm.resourceType,
        visibility: resourceForm.visibility,
        tags
      };
      if (resourceForm.resourceType === 'content_asset') {
        payload.assetId = Number(resourceForm.assetId);
      } else {
        payload.linkUrl = resourceForm.linkUrl;
      }
      await createResourceEntry(payload);
      setResourceForm(initialResourceForm);
      loadResources();
    } catch (error) {
      setWorkspaceNotice({
        tone: 'error',
        message: 'Unable to publish resource',
        detail: error?.message ?? 'Please try again.'
      });
    }
  };

  if (!isAuthenticated) {
    return (
      <DashboardStateMessage
        title="Sign in required"
        description="Sign in to manage community chats and live operations."
      />
    );
  }

  if (!hasAccess) {
    return (
      <DashboardStateMessage
        variant={access.message.variant}
        title={access.message.title}
        description={access.message.description}
      />
    );
  }

  if (communitiesState.loading && communitiesState.items.length === 0) {
    return (
      <DashboardStateMessage
        variant="loading"
        title="Loading instructor communities"
        description="Fetching the communities you moderate so we can load the chat workspace."
      />
    );
  }

  if (communitiesState.error) {
    return (
      <DashboardStateMessage
        variant="error"
        title="Unable to load communities"
        description={communitiesState.error.message ?? 'Please refresh to try again.'}
        actionLabel="Retry"
        onAction={() => setCommunityReloadToken((value) => value + 1)}
      />
    );
  }

  if (!selectedCommunityId) {
    return (
      <DashboardStateMessage
        title="No communities available"
        description="Create or join a community to manage chats and live operations."
      />
    );
  }

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <p className="dashboard-kicker text-primary">Community chat operations</p>
        <h1 className="dashboard-title">Instructor community chats</h1>
        <p className="dashboard-subtitle">
          Monitor live conversations, coordinate moderation, and keep resources in sync across every instructor-led community.
        </p>
      </header>

      {workspaceNotice ? (
        <DashboardActionFeedback
          tone={workspaceNotice.tone}
          message={workspaceNotice.message}
          detail={workspaceNotice.detail}
          onDismiss={() => setWorkspaceNotice(null)}
        />
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <ChannelSidebar
          communities={communityOptions}
          selectedCommunityId={selectedCommunityId}
          onSelectCommunity={(communityId) => {
            setSelectedCommunityId(communityId);
            selectChannel(null);
            loadChannels();
          }}
          channels={channelsState.items}
          loading={channelsState.loading}
          error={channelsState.error}
          onRefresh={refreshWorkspace}
          activeChannelId={activeChannelId}
          onSelectChannel={(channelId) => {
            selectChannel(channelId);
            loadMessages({ channelId, refresh: true });
          }}
          interactive={interactive}
          socialGraph={socialGraph}
          directMessages={socialGraph?.directMessages}
          onSelectDirectRecipient={handleSelectDirectRecipient}
        />

        <div className="flex flex-col gap-6">
          <MessageTimeline
            channel={activeChannel?.channel ?? null}
            messages={messagesState.items}
            loading={messagesState.loading}
            error={messagesState.error}
            hasMore={messagesState.hasMore}
            onLoadMore={handleLoadMoreMessages}
            onReact={handleReactToMessage}
            onRemoveReaction={handleRemoveReaction}
            onModerate={handleModerateMessage}
            graph={socialGraph}
          />

          <MessageComposer
            value={composerState}
            onChange={setComposerState}
            onSend={handleSendMessage}
            onReset={() => setComposerState(initialComposerState)}
            sending={sendingMessage}
            disabled={!interactive || !activeChannelId}
            availableRecipients={socialGraph?.recipients ?? []}
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <PresencePanel
          presence={presenceState.items}
          loading={presenceState.loading}
          error={presenceState.error}
          onRefresh={loadPresence}
          formValue={presenceForm}
          onFormChange={setPresenceForm}
          onSubmit={handlePresenceSubmit}
          interactive={interactive}
          insights={socialGraph?.stats?.presence}
        />

        <RoleManagementPanel
          roles={rolesState.items}
          assignments={rolesState.assignments}
          loading={rolesState.loading}
          error={rolesState.error}
          onRefresh={loadRoles}
          createForm={roleCreateForm}
          onCreateChange={setRoleCreateForm}
          onCreateSubmit={handleCreateRole}
          assignmentForm={roleAssignmentForm}
          onAssignmentChange={setRoleAssignmentForm}
          onAssignmentSubmit={handleAssignRole}
          interactive={interactive}
          roleInsights={socialGraph?.roleInsights ?? []}
        />

        <div className="grid gap-6">
          <EventPlanner
            events={eventsState.items}
            loading={eventsState.loading}
            error={eventsState.error}
            onRefresh={loadEvents}
            formValue={eventForm}
            onFormChange={setEventForm}
            onSubmit={handleCreateEvent}
            interactive={interactive}
          />

          <ResourceLibraryPanel
            resources={resourcesState.items}
            loading={resourcesState.loading}
            error={resourcesState.error}
            onRefresh={loadResources}
            formValue={resourceForm}
            onFormChange={setResourceForm}
            onSubmit={handleCreateResource}
            interactive={interactive}
          />
        </div>
      </div>

      {outletContext?.dashboard?.community?.insights ? (
        <section className="rounded-3xl border border-dashed border-slate-200 p-6 text-sm text-slate-600">
          <h2 className="text-base font-semibold text-slate-900">Community intelligence</h2>
          <p className="mt-2 text-xs text-slate-500">
            Use the community dashboard to review engagement metrics, programme health, and monetisation insights that power this
            chat workspace.
          </p>
        </section>
      ) : null}
    </div>
  );
}
