import { useCallback, useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';

import DashboardStateMessage from '../../components/dashboard/DashboardStateMessage.jsx';
import DashboardActionFeedback from '../../components/dashboard/DashboardActionFeedback.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import ChannelSidebar from './community/instructorChats/ChannelSidebar.jsx';
import MessageTimeline from './community/instructorChats/MessageTimeline.jsx';
import MessageComposer from './community/instructorChats/MessageComposer.jsx';
import PresencePanel from './community/instructorChats/PresencePanel.jsx';
import RoleManagementPanel from './community/instructorChats/RoleManagementPanel.jsx';
import EventPlanner from './community/instructorChats/EventPlanner.jsx';
import ResourceLibraryPanel from './community/instructorChats/ResourceLibraryPanel.jsx';
import useCommunityChatWorkspace from './community/instructorChats/useCommunityChatWorkspace.js';

const initialComposerState = {
  messageType: 'text',
  body: '',
  attachmentUrl: '',
  attachmentLabel: '',
  liveTopic: '',
  meetingUrl: '',
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

const buildInitialPresenceForm = (userId) => ({
  userId: userId ?? 'instructor',
  status: 'online',
  client: 'web',
  ttlMinutes: 15,
  metadata: ''
});

function buildFallbackWorkspace(option) {
  if (!option) {
    return {
      channels: [],
      messages: {},
      presence: [],
      roles: [],
      events: [],
      resources: []
    };
  }

  const baseId = option.id;
  const baseTitle = option.title ?? 'Community';
  const now = new Date();
  const isoNow = now.toISOString();
  const generalChannelId = `${baseId}-general`;
  const broadcastChannelId = `${baseId}-broadcast`;

  return {
    channels: [
      {
        id: generalChannelId,
        name: `${baseTitle} lounge`,
        channelType: 'general',
        members: option.metrics?.active ?? 0,
        unreadCount: option.metrics?.pending ?? 0,
        updatedAt: isoNow
      },
      {
        id: broadcastChannelId,
        name: 'Announcements',
        channelType: 'broadcast',
        members: option.metrics?.active ?? 0,
        unreadCount: 0,
        updatedAt: isoNow
      },
      {
        id: `${baseId}-voice`,
        name: 'Voice studio',
        channelType: 'voice',
        members: option.metrics?.moderators ?? 0,
        unreadCount: 0,
        updatedAt: isoNow
      }
    ],
    messages: {
      [generalChannelId]: [
        {
          id: `${generalChannelId}-msg-1`,
          body: 'Welcome to the production lounge. Drop questions for the studio pod or surface blockers from your cohorts.',
          messageType: 'text',
          attachmentUrl: '',
          attachmentLabel: '',
          author: { displayName: 'Ops Lead', role: 'moderator' },
          createdAt: isoNow,
          reactions: [{ emoji: '👍', count: 6 }]
        },
        {
          id: `${generalChannelId}-msg-2`,
          body: 'Reminder: upload your cohort retro decks before Friday so the insight squad can prep highlights.',
          messageType: 'announcement',
          attachmentUrl: 'https://assets.edulure.com/templates/retro-checklist.pdf',
          attachmentLabel: 'Retro checklist',
          author: { displayName: 'Producer HQ', role: 'producer' },
          createdAt: new Date(now.getTime() - 3600000).toISOString(),
          reactions: [{ emoji: '💬', count: 3 }]
        }
      ],
      [broadcastChannelId]: [
        {
          id: `${broadcastChannelId}-msg-1`,
          body: 'Community AMA goes live tomorrow at 17:00 UTC. Please route questions to the prep thread.',
          messageType: 'announcement',
          author: { displayName: 'Community Director', role: 'admin' },
          createdAt: new Date(now.getTime() - 7200000).toISOString()
        }
      ]
    },
    presence: [
      {
        id: `${baseId}-presence-1`,
        userId: `${baseId}-mod-1`,
        displayName: 'Avery Quinn',
        role: 'moderator',
        status: 'online',
        expiresAt: new Date(now.getTime() + 1800000).toISOString()
      },
      {
        id: `${baseId}-presence-2`,
        userId: `${baseId}-mod-2`,
        displayName: 'Jordan Lee',
        role: 'producer',
        status: 'idle',
        expiresAt: new Date(now.getTime() + 3600000).toISOString()
      }
    ],
    roles: [
      {
        id: `${baseId}-role-1`,
        name: 'Community moderator',
        roleKey: 'community.moderator',
        members: option.metrics?.moderators ?? 0,
        canBroadcast: true,
        canModerate: true,
        canHostVoice: true
      },
      {
        id: `${baseId}-role-2`,
        name: 'Broadcast host',
        roleKey: 'community.broadcast_host',
        members: 2,
        canBroadcast: true,
        canModerate: false,
        canHostVoice: false
      }
    ],
    events: [
      {
        id: `${baseId}-event-1`,
        title: 'Weekly studio office hours',
        summary: 'Live voice coaching and production QA.',
        startAt: new Date(now.getTime() + 86400000).toISOString(),
        meetingUrl: 'https://live.edulure.com/office-hours',
        visibility: 'members'
      }
    ],
    resources: [
      {
        id: `${baseId}-resource-1`,
        title: 'Onboarding playbook',
        description: 'Standard operating procedures for new moderators.',
        resourceType: 'external_link',
        linkUrl: 'https://guides.edulure.com/onboarding.pdf',
        tags: 'operations, onboarding',
        visibility: 'moderators',
        createdAt: isoNow
      },
      {
        id: `${baseId}-resource-2`,
        title: 'Content calendar template',
        resourceType: 'file',
        linkUrl: 'https://assets.edulure.com/templates/content-calendar.xlsx',
        tags: 'planning',
        visibility: 'members',
        createdAt: isoNow
      }
    ]
  };
}

export default function InstructorCommunityChats() {
  const { dashboard, refresh } = useOutletContext();
  const { session } = useAuth();
  const token = session?.tokens?.accessToken ?? null;
  const currentUserId = session?.user?.id ?? 'instructor';

  const communityOptions = useMemo(() => {
    const deck = Array.isArray(dashboard?.communities?.manageDeck) ? dashboard.communities.manageDeck : [];
    return deck
      .map((community) => ({
        id: community.id?.replace('community-', '') ?? community.id ?? '',
        title: community.title ?? 'Community',
        role: community.role ?? 'member',
        metrics: community.metrics ?? { active: 0, pending: 0, moderators: 0 }
      }))
      .filter((community) => community.id);
  }, [dashboard?.communities?.manageDeck]);

  const [selectedCommunityId, setSelectedCommunityId] = useState(() => communityOptions[0]?.id ?? null);
  useEffect(() => {
    if (!communityOptions.length) {
      setSelectedCommunityId(null);
      return;
    }
    setSelectedCommunityId((prev) => (prev && communityOptions.some((community) => community.id === prev) ? prev : communityOptions[0].id));
  }, [communityOptions]);

  const fallbackMap = useMemo(() => {
    const entries = communityOptions.map((community) => [community.id, buildFallbackWorkspace(community)]);
    return Object.fromEntries(entries);
  }, [communityOptions]);

  const fallbackWorkspace = selectedCommunityId ? fallbackMap[selectedCommunityId] : buildFallbackWorkspace(null);

  const workspace = useCommunityChatWorkspace({ communityId: selectedCommunityId, token, fallback: fallbackWorkspace });

  const activeChannel = useMemo(
    () => workspace.channelsState.items.find((channel) => channel.id === workspace.activeChannelId) ?? null,
    [workspace.channelsState.items, workspace.activeChannelId]
  );

  const selectedCommunity = useMemo(
    () => communityOptions.find((community) => community.id === selectedCommunityId) ?? null,
    [communityOptions, selectedCommunityId]
  );

  const [composer, setComposer] = useState(initialComposerState);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [roleForm, setRoleForm] = useState(initialRoleForm);
  const [assignmentForm, setAssignmentForm] = useState(initialAssignmentForm);
  const [eventForm, setEventForm] = useState(initialEventForm);
  const [resourceForm, setResourceForm] = useState(initialResourceForm);
  const [presenceForm, setPresenceForm] = useState(buildInitialPresenceForm(currentUserId));
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    setPresenceForm(buildInitialPresenceForm(currentUserId));
  }, [currentUserId, selectedCommunityId]);

  useEffect(() => {
    if (!workspace.activeChannelId) return undefined;
    const controller = new AbortController();
    workspace.loadMessages({ channelId: workspace.activeChannelId, refresh: true }, controller.signal);
    return () => controller.abort();
  }, [workspace.activeChannelId, workspace.loadMessages]);

  useEffect(() => {
    setComposer(initialComposerState);
  }, [workspace.activeChannelId, selectedCommunityId]);

  const handleSendMessage = useCallback(async () => {
    if (!workspace.activeChannelId) {
      setFeedback({ tone: 'warning', message: 'Select a channel', detail: 'Choose a channel before broadcasting updates.' });
      return;
    }
    if (!composer.body.trim()) {
      setFeedback({ tone: 'warning', message: 'Message body required', detail: 'Compose a message before sending.' });
      return;
    }

    setSendingMessage(true);
    try {
      await workspace.sendMessage({
        channelId: workspace.activeChannelId,
        messageType: composer.messageType,
        body: composer.body.trim(),
        attachmentUrl: composer.attachmentUrl || undefined,
        attachmentLabel: composer.attachmentLabel || undefined,
        liveTopic: composer.liveTopic || undefined,
        meetingUrl: composer.meetingUrl || undefined,
        metadata: composer.metadataNote ? { note: composer.metadataNote } : undefined
      });
      setComposer(initialComposerState);
    } catch (error) {
      setFeedback({
        tone: 'error',
        message: 'Unable to send message',
        detail: error instanceof Error ? error.message : 'An unexpected error occurred while contacting the chat service.'
      });
    } finally {
      setSendingMessage(false);
    }
  }, [composer, workspace]);

  const handleLoadMore = useCallback(
    (before) => {
      if (!before) return;
      workspace.loadMessages({ channelId: workspace.activeChannelId, before });
    },
    [workspace]
  );

  const handleReact = useCallback(
    (messageId, emoji) => {
      if (!workspace.activeChannelId) return;
      workspace.reactToMessage({ channelId: workspace.activeChannelId, messageId, emoji });
    },
    [workspace]
  );

  const handleRemoveReaction = useCallback(
    (messageId, emoji) => {
      if (!workspace.activeChannelId) return;
      workspace.removeReaction({ channelId: workspace.activeChannelId, messageId, emoji });
    },
    [workspace]
  );

  const handleModerate = useCallback(
    (messageId, moderationPayload) => {
      if (!workspace.activeChannelId) return;
      workspace.moderateMessage({ channelId: workspace.activeChannelId, messageId, payload: moderationPayload });
    },
    [workspace]
  );

  const handleCreateRole = useCallback(async () => {
    if (!roleForm.name.trim() || !roleForm.roleKey.trim()) {
      setFeedback({ tone: 'warning', message: 'Role details incomplete', detail: 'Provide a name and role key before creating.' });
      return;
    }
    try {
      await workspace.createRoleEntry({
        ...roleForm,
        name: roleForm.name.trim(),
        roleKey: roleForm.roleKey.trim()
      });
      setRoleForm(initialRoleForm);
    } catch (error) {
      setFeedback({
        tone: 'error',
        message: 'Unable to create role',
        detail: error instanceof Error ? error.message : 'An unexpected error occurred while saving the role.'
      });
    }
  }, [roleForm, workspace]);

  const handleAssignRole = useCallback(async () => {
    if (!assignmentForm.userId.trim() || !assignmentForm.roleKey.trim()) {
      setFeedback({
        tone: 'warning',
        message: 'Assignment details missing',
        detail: 'Specify a member ID and role key before assigning.'
      });
      return;
    }
    try {
      await workspace.assignRoleToMember({
        userId: assignmentForm.userId.trim(),
        payload: { roleKey: assignmentForm.roleKey.trim() }
      });
      setAssignmentForm(initialAssignmentForm);
    } catch (error) {
      setFeedback({
        tone: 'error',
        message: 'Unable to assign role',
        detail: error instanceof Error ? error.message : 'An unexpected error occurred while updating the member permissions.'
      });
    }
  }, [assignmentForm, workspace]);

  const handleScheduleEvent = useCallback(async () => {
    if (!eventForm.title.trim()) {
      setFeedback({ tone: 'warning', message: 'Event title required', detail: 'Provide a title before scheduling the event.' });
      return;
    }
    try {
      await workspace.createEventEntry({
        ...eventForm,
        title: eventForm.title.trim(),
        summary: eventForm.summary?.trim() ?? '',
        attendanceLimit: eventForm.attendanceLimit ? Number(eventForm.attendanceLimit) : undefined
      });
      setEventForm(initialEventForm);
    } catch (error) {
      setFeedback({
        tone: 'error',
        message: 'Unable to schedule event',
        detail: error instanceof Error ? error.message : 'An unexpected error occurred while scheduling the event.'
      });
    }
  }, [eventForm, workspace]);

  const handlePublishResource = useCallback(async () => {
    if (!resourceForm.title.trim() || !resourceForm.linkUrl.trim()) {
      setFeedback({
        tone: 'warning',
        message: 'Resource details incomplete',
        detail: 'Add a title and link before publishing.'
      });
      return;
    }
    try {
      await workspace.createResourceEntry({
        ...resourceForm,
        title: resourceForm.title.trim(),
        description: resourceForm.description?.trim() ?? '',
        linkUrl: resourceForm.linkUrl.trim(),
        tags: resourceForm.tags?.trim() ?? ''
      });
      setResourceForm(initialResourceForm);
    } catch (error) {
      setFeedback({
        tone: 'error',
        message: 'Unable to publish resource',
        detail: error instanceof Error ? error.message : 'An unexpected error occurred while publishing the resource.'
      });
    }
  }, [resourceForm, workspace]);

  const handleUpdatePresence = useCallback(async () => {
    try {
      await workspace.updatePresenceStatus({
        ...presenceForm,
        metadata: presenceForm.metadata ? { note: presenceForm.metadata } : undefined
      });
      setPresenceForm((prev) => ({ ...prev, metadata: '' }));
    } catch (error) {
      setFeedback({
        tone: 'error',
        message: 'Unable to update presence',
        detail: error instanceof Error ? error.message : 'An unexpected error occurred while syncing presence.'
      });
    }
  }, [presenceForm, workspace]);

  const dismissFeedback = useCallback(() => setFeedback(null), []);
  const dismissWorkspaceNotice = useCallback(() => workspace.setWorkspaceNotice(null), [workspace]);

  if (!communityOptions.length) {
    return (
      <DashboardStateMessage
        title="Communities unavailable"
        description="We could not find any active communities linked to your instructor account. Create one from the community builder to unlock the chat workspace."
        actionLabel="Refresh"
        onAction={() => refresh?.()}
      />
    );
  }

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="dashboard-kicker text-primary">Instructor control</p>
            <h1 className="text-2xl font-semibold text-slate-900">Community chat command centre</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              Coordinate moderation, surface programme signals, and ship announcements across every space. Channels, live presence, roles, and resources are wired for full CRUD so your operations stay production ready.
            </p>
          </div>
          {selectedCommunity ? (
            <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-xs text-slate-500">
              <p className="text-sm font-semibold text-slate-800">{selectedCommunity.title}</p>
              <div className="flex items-center gap-4">
                <span>{selectedCommunity.metrics?.active ?? 0} active</span>
                <span>{selectedCommunity.metrics?.pending ?? 0} pending</span>
                <span>{selectedCommunity.metrics?.moderators ?? 0} moderators</span>
              </div>
              <span className="inline-flex w-max rounded-full border border-slate-300 px-3 py-1 text-[11px] uppercase tracking-wide text-slate-500">
                Your role: {selectedCommunity.role}
              </span>
            </div>
          ) : null}
        </div>
      </div>

      {workspace.workspaceNotice ? (
        <DashboardActionFeedback feedback={workspace.workspaceNotice} onDismiss={dismissWorkspaceNotice} />
      ) : null}
      {feedback ? <DashboardActionFeedback feedback={feedback} onDismiss={dismissFeedback} /> : null}

      <div className="grid gap-6 xl:grid-cols-[320px,1fr]">
        <ChannelSidebar
          communities={communityOptions}
          selectedCommunityId={selectedCommunityId ?? undefined}
          onSelectCommunity={setSelectedCommunityId}
          channels={workspace.channelsState.items}
          loading={workspace.channelsState.loading}
          error={workspace.channelsState.error}
          onRefresh={() => {
            workspace.refreshWorkspace();
            refresh?.();
          }}
          activeChannelId={workspace.activeChannelId}
          onSelectChannel={(channelId) => workspace.selectChannel(channelId)}
          interactive={workspace.interactive}
        />

        <div className="flex flex-col gap-6">
          <MessageTimeline
            channel={activeChannel}
            messages={workspace.messagesState.items}
            loading={workspace.messagesState.loading}
            error={workspace.messagesState.error}
            hasMore={workspace.messagesState.hasMore ?? false}
            onLoadMore={handleLoadMore}
            onReact={handleReact}
            onRemoveReaction={handleRemoveReaction}
            onModerate={handleModerate}
          />

          <MessageComposer
            value={composer}
            onChange={setComposer}
            onSend={handleSendMessage}
            onReset={() => setComposer(initialComposerState)}
            sending={sendingMessage}
            disabled={!workspace.activeChannelId}
          />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <PresencePanel
          presence={workspace.presenceState.items}
          loading={workspace.presenceState.loading}
          error={workspace.presenceState.error}
          onRefresh={() => workspace.loadPresence()}
          formValue={presenceForm}
          onFormChange={setPresenceForm}
          onSubmit={handleUpdatePresence}
          interactive={workspace.interactive}
        />

        <RoleManagementPanel
          roles={workspace.rolesState.items}
          loading={workspace.rolesState.loading}
          error={workspace.rolesState.error}
          onRefresh={() => workspace.loadRoles()}
          createForm={roleForm}
          onCreateChange={setRoleForm}
          onCreateSubmit={handleCreateRole}
          assignmentForm={assignmentForm}
          onAssignmentChange={setAssignmentForm}
          onAssignmentSubmit={handleAssignRole}
          interactive={workspace.interactive}
        />

        <div className="space-y-6">
          <EventPlanner
            events={workspace.eventsState.items}
            loading={workspace.eventsState.loading}
            error={workspace.eventsState.error}
            onRefresh={() => workspace.loadEvents()}
            formValue={eventForm}
            onFormChange={setEventForm}
            onSubmit={handleScheduleEvent}
            interactive={workspace.interactive}
          />

          <ResourceLibraryPanel
            resources={workspace.resourcesState.items}
            loading={workspace.resourcesState.loading}
            error={workspace.resourcesState.error}
            onRefresh={() => workspace.loadResources()}
            formValue={resourceForm}
            onFormChange={setResourceForm}
            onSubmit={handlePublishResource}
            interactive={workspace.interactive}
          />
        </div>
      </div>
    </div>
  );
}
