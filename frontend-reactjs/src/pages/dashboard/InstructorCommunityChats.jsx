import { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  ChatBubbleBottomCenterTextIcon,
  PlusIcon,
  ArrowPathIcon,
  TrashIcon,
  PencilSquareIcon,
  VideoCameraIcon,
  SpeakerWaveIcon,
  MusicalNoteIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';

const DEFAULT_CHANNELS = [
  {
    id: 'general-lounge',
    name: 'General Lounge',
    type: 'discussion',
    topic: 'Announcements, wins, and weekly goals',
    description:
      'Pinned for all members. Slow mode enabled during launches to keep updates readable. Scheduled digest summary every Friday.',
    members: 1842,
    slowMode: 30,
    isPrivate: false,
    allowMedia: true,
    permissions: ['threads', 'reactions', 'links'],
    moderators: ['Community Leads'],
    tags: ['updates', 'intros'],
    lastActivity: '8 minutes ago'
  },
  {
    id: 'live-lab',
    name: 'Live Lab',
    type: 'voice-stage',
    topic: 'Pop-up co-working and breakout voice rooms',
    description:
      'Stage channel for weekly build sprints. Members can raise hands, moderators can spin up breakout rooms instantly.',
    members: 684,
    slowMode: 0,
    isPrivate: true,
    allowMedia: true,
    permissions: ['voice', 'screen', 'recording'],
    moderators: ['Studio Hosts', 'Technical Producers'],
    tags: ['live', 'studio'],
    lastActivity: '24 minutes ago'
  },
  {
    id: 'broadcast-center',
    name: 'Broadcast Center',
    type: 'broadcast',
    topic: 'One-to-many announcements and launch coverage',
    description: 'Broadcast channel with mirrored social post automation and analytics feed.',
    members: 2410,
    slowMode: 0,
    isPrivate: false,
    allowMedia: false,
    permissions: ['announcements'],
    moderators: ['Community Ops'],
    tags: ['launch', 'announcements'],
    lastActivity: '1 hour ago'
  }
];

const DEFAULT_ROLES = [
  {
    id: 'community-leads',
    name: 'Community Leads',
    color: '#2563eb',
    members: 8,
    canBroadcast: true,
    canModerate: true,
    canManageVoice: true,
    permissions: ['Manage channels', 'Pin updates', 'Launch stages']
  },
  {
    id: 'studio-hosts',
    name: 'Studio Hosts',
    color: '#16a34a',
    members: 14,
    canBroadcast: false,
    canModerate: true,
    canManageVoice: true,
    permissions: ['Trigger scene switches', 'Start recordings', 'Approve speakers']
  },
  {
    id: 'community-crew',
    name: 'Community Crew',
    color: '#f97316',
    members: 43,
    canBroadcast: false,
    canModerate: false,
    canManageVoice: false,
    permissions: ['Flag posts', 'Share resources']
  }
];

const DEFAULT_EVENTS = [
  {
    id: 'weekly-build',
    title: 'Weekly Build Sprint',
    type: 'co-working',
    host: 'Studio Hosts',
    scheduledFor: 'Wednesdays · 14:00 UTC',
    duration: '90 minutes',
    channels: ['live-lab'],
    status: 'Scheduled',
    assets: ['Sprint brief.pdf', 'Intro bumper.mp4']
  },
  {
    id: 'launch-room',
    title: 'Launch Room: AI Accelerators',
    type: 'broadcast',
    host: 'Community Leads',
    scheduledFor: 'Fridays · 17:00 UTC',
    duration: '45 minutes',
    channels: ['broadcast-center'],
    status: 'Preparing',
    assets: ['Run-of-show.docx']
  }
];

const DEFAULT_MEDIA_ASSETS = [
  {
    id: 'asset-launch-intro',
    name: 'Launch intro bumper.mp4',
    type: 'Video',
    duration: '00:45',
    size: '148 MB',
    owner: 'Studio Team',
    status: 'Ready',
    assignedTo: ['broadcast-center'],
    notes: 'ProRes 422 master with alpha matte'
  },
  {
    id: 'asset-chill-bed',
    name: 'Focus lounge loop.aiff',
    type: 'Audio',
    duration: '15:00',
    size: '102 MB',
    owner: 'Audio Ops',
    status: 'Published',
    assignedTo: ['live-lab'],
    notes: 'Seamless loop, normalised to −14 LUFS'
  },
  {
    id: 'asset-runbook',
    name: 'Weekly ritual runbook.pdf',
    type: 'Document',
    duration: '—',
    size: '2.4 MB',
    owner: 'Community Leads',
    status: 'Ready',
    assignedTo: ['general-lounge', 'live-lab'],
    notes: 'Updated with 2024 OKRs'
  }
];

const DEFAULT_INCIDENTS = [
  {
    id: 'incident-flagged-post',
    channelId: 'general-lounge',
    severity: 'Medium',
    type: 'Content flag',
    status: 'Open',
    reportedBy: 'Community Crew',
    openedAt: '2024-03-11T14:20:00.000Z',
    notes: 'Automated filter caught promotional link. Awaiting moderator review.'
  },
  {
    id: 'incident-audio',
    channelId: 'live-lab',
    severity: 'Low',
    type: 'Audio quality',
    status: 'Investigating',
    reportedBy: 'Studio Hosts',
    openedAt: '2024-03-11T13:05:00.000Z',
    notes: 'Participants reported echo during breakout handoff.'
  }
];

const DEFAULT_CHECKS = [
  {
    id: 'permissions-sync',
    label: 'Verify permission sync',
    description: 'Confirm channel permission updates propagated to Discord and the LMS webhooks.',
    status: 'Pending'
  },
  {
    id: 'stage-audio',
    label: 'Stage audio test',
    description: 'Run 30-second latency and clipping test on the Live Lab stage.',
    status: 'Pending'
  },
  {
    id: 'broadcast-failover',
    label: 'Broadcast failover',
    description: 'Switch ingest node to secondary encoder and confirm stream continuity.',
    status: 'Pending'
  }
];

const DEFAULT_ACTIVITY = [
  {
    id: 'activity-webinar',
    scope: 'events',
    message: 'Launch Room: AI Accelerators marked as preparing by Community Leads.',
    timestamp: '2024-03-11T12:30:00.000Z'
  },
  {
    id: 'activity-role-update',
    scope: 'roles',
    message: 'Community Crew permissions updated – reactions enabled.',
    timestamp: '2024-03-11T11:10:00.000Z'
  }
];

const PERMISSION_OPTIONS = [
  { id: 'threads', label: 'Threads & replies' },
  { id: 'reactions', label: 'Reactions & polls' },
  { id: 'links', label: 'External links' },
  { id: 'voice', label: 'Voice rooms' },
  { id: 'screen', label: 'Screen share' },
  { id: 'recording', label: 'Recording' },
  { id: 'announcements', label: 'Broadcast posts' }
];

const ROLE_PERMISSION_OPTIONS = [
  { id: 'Manage channels', label: 'Manage channels' },
  { id: 'Pin updates', label: 'Pin updates' },
  { id: 'Launch stages', label: 'Launch stages' },
  { id: 'Trigger scene switches', label: 'Trigger scene switches' },
  { id: 'Start recordings', label: 'Start recordings' },
  { id: 'Approve speakers', label: 'Approve speakers' },
  { id: 'Flag posts', label: 'Flag posts' },
  { id: 'Share resources', label: 'Share resources' }
];

const EVENT_TYPES = [
  { id: 'co-working', label: 'Co-working sprint' },
  { id: 'broadcast', label: 'Broadcast show' },
  { id: 'voice-panel', label: 'Voice panel' },
  { id: 'roundtable', label: 'Roundtable discussion' }
];

const MEDIA_STATUS_FLOW = ['Staging', 'Ready', 'Published'];

function generateId(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function normaliseChannels(payload) {
  if (!Array.isArray(payload)) return [];
  return payload
    .filter((item) => item && (item.id || item.name))
    .map((item) => ({
      id: item.id ?? generateId('channel'),
      name: item.name ?? 'Channel',
      type: item.type ?? 'discussion',
      topic: item.topic ?? item.description ?? '',
      description: item.description ?? '',
      members: Number.parseInt(item.members ?? 0, 10) || 0,
      slowMode: Number.parseInt(item.slowMode ?? 0, 10) || 0,
      isPrivate: Boolean(item.isPrivate),
      allowMedia: item.allowMedia !== false,
      permissions: Array.isArray(item.permissions) ? item.permissions : [],
      moderators: Array.isArray(item.moderators) ? item.moderators : [],
      tags: Array.isArray(item.tags) ? item.tags : [],
      lastActivity: item.lastActivity ?? 'Just now'
    }));
}

function normaliseRoles(payload) {
  if (!Array.isArray(payload)) return [];
  return payload
    .filter((item) => item && (item.id || item.name))
    .map((item) => ({
      id: item.id ?? generateId('role'),
      name: item.name ?? 'Role',
      color: item.color ?? '#1d4ed8',
      members: Number.parseInt(item.members ?? 0, 10) || 0,
      canBroadcast: Boolean(item.canBroadcast),
      canModerate: Boolean(item.canModerate),
      canManageVoice: Boolean(item.canManageVoice),
      permissions: Array.isArray(item.permissions) ? item.permissions : []
    }));
}

function normaliseEvents(payload) {
  if (!Array.isArray(payload)) return [];
  return payload
    .filter((item) => item && (item.id || item.title))
    .map((item) => ({
      id: item.id ?? generateId('event'),
      title: item.title ?? 'Community event',
      type: item.type ?? 'co-working',
      host: item.host ?? 'Community Team',
      scheduledFor: item.scheduledFor ?? 'To be scheduled',
      duration: item.duration ?? '60 minutes',
      channels: Array.isArray(item.channels) ? item.channels : [],
      status: item.status ?? 'Draft',
      assets: Array.isArray(item.assets) ? item.assets : []
    }));
}

function normaliseMediaAssets(payload) {
  if (!Array.isArray(payload)) return [];
  return payload
    .filter((item) => item && (item.id || item.name))
    .map((item) => ({
      id: item.id ?? generateId('asset'),
      name: item.name ?? 'Untitled asset',
      type: item.type ?? 'Document',
      duration: item.duration ?? '—',
      size: item.size ?? '—',
      owner: item.owner ?? 'Community Ops',
      status: item.status ?? 'Staging',
      assignedTo: Array.isArray(item.assignedTo) ? item.assignedTo : [],
      notes: item.notes ?? ''
    }));
}

function normaliseIncidents(payload) {
  if (!Array.isArray(payload)) return [];
  return payload
    .filter((item) => item && (item.id || item.channelId))
    .map((item) => ({
      id: item.id ?? generateId('incident'),
      channelId: item.channelId ?? 'general-lounge',
      severity: item.severity ?? 'Low',
      type: item.type ?? 'Content flag',
      status: item.status ?? 'Open',
      reportedBy: item.reportedBy ?? 'Community Ops',
      openedAt: item.openedAt ?? new Date().toISOString(),
      resolvedAt: item.resolvedAt ?? null,
      resolution: item.resolution ?? null,
      notes: item.notes ?? ''
    }));
}

function normaliseChecks(payload) {
  if (!Array.isArray(payload)) return [];
  return payload
    .filter((item) => item && (item.id || item.label))
    .map((item) => ({
      id: item.id ?? generateId('check'),
      label: item.label ?? 'Operational check',
      description: item.description ?? '',
      status: item.status ?? 'Pending'
    }));
}

function normaliseActivity(payload) {
  if (!Array.isArray(payload)) return [];
  return payload
    .filter((item) => item && (item.id || item.message))
    .map((item) => ({
      id: item.id ?? generateId('activity'),
      scope: item.scope ?? 'system',
      message: item.message ?? 'Activity logged',
      timestamp: item.timestamp ?? new Date().toISOString()
    }));
}

function determineAssetType(fileName, mimeType) {
  if (mimeType?.startsWith('video')) return 'Video';
  if (mimeType?.startsWith('audio')) return 'Audio';
  if (mimeType?.includes('pdf')) return 'Document';
  if (mimeType?.includes('presentation')) return 'Slides';
  const extension = fileName?.split('.').pop()?.toLowerCase();
  if (['mp4', 'mov', 'webm'].includes(extension)) return 'Video';
  if (['mp3', 'wav', 'aiff', 'aac'].includes(extension)) return 'Audio';
  if (['pdf', 'doc', 'docx'].includes(extension)) return 'Document';
  if (['ppt', 'pptx', 'key'].includes(extension)) return 'Slides';
  return 'Document';
}

function formatTimestamp(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Just now';
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

const EMPTY_FORM = {
  name: '',
  type: 'discussion',
  topic: '',
  description: '',
  members: 0,
  slowMode: 0,
  isPrivate: false,
  allowMedia: true,
  permissions: [],
  moderators: '',
  tags: ''
};

const EMPTY_ROLE_FORM = {
  name: '',
  color: '#2563eb',
  members: 0,
  canBroadcast: false,
  canModerate: false,
  canManageVoice: false,
  permissions: []
};

const EMPTY_EVENT_FORM = {
  title: '',
  type: 'co-working',
  host: '',
  scheduledFor: '',
  duration: '60 minutes',
  channels: [],
  status: 'Draft',
  assets: ''
};

export default function InstructorCommunityChats() {
  const { dashboard } = useOutletContext();
  const seed = dashboard?.communities?.chatSuite ?? {};

  const [channels, setChannels] = useState(() => {
    const normalised = normaliseChannels(seed.channels);
    return normalised.length ? normalised : DEFAULT_CHANNELS;
  });
  const [roles, setRoles] = useState(() => {
    const normalised = normaliseRoles(seed.roles);
    return normalised.length ? normalised : DEFAULT_ROLES;
  });
  const [events, setEvents] = useState(() => {
    const normalised = normaliseEvents(seed.events);
    return normalised.length ? normalised : DEFAULT_EVENTS;
  });
  const [mediaAssets, setMediaAssets] = useState(() => {
    const normalised = normaliseMediaAssets(seed.mediaAssets);
    return normalised.length ? normalised : DEFAULT_MEDIA_ASSETS;
  });
  const [incidents, setIncidents] = useState(() => {
    const normalised = normaliseIncidents(seed.incidents);
    return normalised.length ? normalised : DEFAULT_INCIDENTS;
  });
  const [qualityChecks, setQualityChecks] = useState(() => {
    const normalised = normaliseChecks(seed.checks);
    return normalised.length ? normalised : DEFAULT_CHECKS;
  });
  const [activityLog, setActivityLog] = useState(() => {
    const normalised = normaliseActivity(seed.activity);
    const baseline = normalised.length ? normalised : DEFAULT_ACTIVITY;
    return baseline
      .slice()
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  });

  const [selectedChannelId, setSelectedChannelId] = useState(() => channels[0]?.id ?? '__new');
  const [channelForm, setChannelForm] = useState(EMPTY_FORM);
  const [roleForm, setRoleForm] = useState(EMPTY_ROLE_FORM);
  const [selectedRoleId, setSelectedRoleId] = useState(null);
  const [eventForm, setEventForm] = useState(EMPTY_EVENT_FORM);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [channelFilter, setChannelFilter] = useState('');

  useEffect(() => {
    const normalisedChannels = normaliseChannels(seed.channels);
    if (normalisedChannels.length) {
      setChannels(normalisedChannels);
      setSelectedChannelId((current) => {
        if (!current) return normalisedChannels[0].id;
        return normalisedChannels.some((channel) => channel.id === current)
          ? current
          : normalisedChannels[0].id;
      });
    }
  }, [seed.channels]);

  useEffect(() => {
    const normalisedRoles = normaliseRoles(seed.roles);
    if (normalisedRoles.length) {
      setRoles(normalisedRoles);
    }
  }, [seed.roles]);

  useEffect(() => {
    const normalisedEvents = normaliseEvents(seed.events);
    if (normalisedEvents.length) {
      setEvents(normalisedEvents);
    }
  }, [seed.events]);

  useEffect(() => {
    const normalisedAssets = normaliseMediaAssets(seed.mediaAssets);
    if (normalisedAssets.length) {
      setMediaAssets(normalisedAssets);
    }
  }, [seed.mediaAssets]);

  useEffect(() => {
    const normalisedIncidents = normaliseIncidents(seed.incidents);
    if (normalisedIncidents.length) {
      setIncidents(normalisedIncidents);
    }
  }, [seed.incidents]);

  useEffect(() => {
    const normalisedChecks = normaliseChecks(seed.checks);
    if (normalisedChecks.length) {
      setQualityChecks(normalisedChecks);
    }
  }, [seed.checks]);

  useEffect(() => {
    const normalisedActivity = normaliseActivity(seed.activity);
    if (normalisedActivity.length) {
      setActivityLog(
        normalisedActivity
          .slice()
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      );
    }
  }, [seed.activity]);

  const selectedChannel = useMemo(
    () => channels.find((channel) => channel.id === selectedChannelId) ?? null,
    [channels, selectedChannelId]
  );

  const channelLookup = useMemo(() => {
    const map = new Map();
    channels.forEach((channel) => {
      map.set(channel.id, channel.name);
    });
    return map;
  }, [channels]);

  const filteredChannels = useMemo(() => {
    const term = channelFilter.trim().toLowerCase();
    if (!term) return channels;
    return channels.filter((channel) =>
      [channel.name, channel.topic, channel.description]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(term))
    );
  }, [channelFilter, channels]);

  const channelMetrics = useMemo(() => {
    const totalMembers = channels.reduce((sum, channel) => sum + (channel.members ?? 0), 0);
    const privateCount = channels.filter((channel) => channel.isPrivate).length;
    const mediaEnabled = channels.filter((channel) => channel.allowMedia).length;
    return {
      totalMembers,
      privateCount,
      mediaEnabled
    };
  }, [channels]);

  const stagedAssets = useMemo(() => mediaAssets.filter((asset) => asset.status === 'Staging'), [mediaAssets]);
  const readyAssets = useMemo(() => mediaAssets.filter((asset) => asset.status === 'Ready'), [mediaAssets]);
  const displayedActivity = useMemo(() => activityLog.slice(0, 12), [activityLog]);
  const openIncidents = useMemo(() => incidents.filter((incident) => incident.status !== 'Resolved'), [incidents]);

  const severityBadge = useMemo(
    () => ({
      Low: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      Medium: 'border-amber-200 bg-amber-50 text-amber-700',
      High: 'border-rose-200 bg-rose-50 text-rose-700'
    }),
    []
  );

  const checkBadge = useMemo(
    () => ({
      Pending: 'border-slate-200 bg-slate-50 text-slate-600',
      Passed: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      Blocked: 'border-rose-200 bg-rose-50 text-rose-700'
    }),
    []
  );

  const assetStatusTone = useMemo(
    () => ({
      Staging: 'border-amber-200 bg-amber-50 text-amber-700',
      Ready: 'border-sky-200 bg-sky-50 text-sky-700',
      Published: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      Archived: 'border-slate-200 bg-slate-50 text-slate-500'
    }),
    []
  );

  const assetAdvanceLabel = (status) => {
    if (status === 'Staging') return 'Mark ready';
    if (status === 'Ready') return 'Publish';
    if (status === 'Published') return 'Restage';
    if (status === 'Archived') return 'Restore';
    return 'Advance state';
  };

  const logActivity = (message, scope = 'system') => {
    setActivityLog((previous) => [
      { id: generateId('activity'), scope, message, timestamp: new Date().toISOString() },
      ...previous
    ].slice(0, 40));
  };

  useEffect(() => {
    if (selectedChannelId === '__new' || !selectedChannel) {
      setChannelForm(EMPTY_FORM);
      return;
    }
    setChannelForm({
      name: selectedChannel.name,
      type: selectedChannel.type,
      topic: selectedChannel.topic ?? '',
      description: selectedChannel.description ?? '',
      members: selectedChannel.members ?? 0,
      slowMode: selectedChannel.slowMode ?? 0,
      isPrivate: selectedChannel.isPrivate ?? false,
      allowMedia: selectedChannel.allowMedia ?? false,
      permissions: selectedChannel.permissions ?? [],
      moderators: (selectedChannel.moderators ?? []).join(', '),
      tags: (selectedChannel.tags ?? []).join(', ')
    });
  }, [selectedChannelId, selectedChannel]);

  useEffect(() => {
    if (!selectedRoleId) {
      setRoleForm(EMPTY_ROLE_FORM);
      return;
    }
    const role = roles.find((item) => item.id === selectedRoleId);
    if (!role) {
      setRoleForm(EMPTY_ROLE_FORM);
      return;
    }
    setRoleForm({
      name: role.name,
      color: role.color,
      members: role.members,
      canBroadcast: role.canBroadcast,
      canModerate: role.canModerate,
      canManageVoice: role.canManageVoice,
      permissions: role.permissions
    });
  }, [roles, selectedRoleId]);

  useEffect(() => {
    if (!selectedEventId) {
      setEventForm(EMPTY_EVENT_FORM);
      return;
    }
    const event = events.find((item) => item.id === selectedEventId);
    if (!event) {
      setEventForm(EMPTY_EVENT_FORM);
      return;
    }
    setEventForm({
      title: event.title,
      type: event.type,
      host: event.host,
      scheduledFor: event.scheduledFor,
      duration: event.duration,
      channels: event.channels,
      status: event.status,
      assets: event.assets.join(', ')
    });
  }, [events, selectedEventId]);

  const handleChannelFormChange = (field, value) => {
    setChannelForm((current) => ({ ...current, [field]: value }));
  };

  const handlePermissionToggle = (permission) => {
    setChannelForm((current) => {
      const hasPermission = current.permissions.includes(permission);
      return {
        ...current,
        permissions: hasPermission
          ? current.permissions.filter((item) => item !== permission)
          : [...current.permissions, permission]
      };
    });
  };

  const handleChannelSubmit = (event) => {
    event.preventDefault();
    const isNewChannel = selectedChannelId === '__new' || !channels.some((channel) => channel.id === selectedChannelId);
    const payload = {
      id: selectedChannelId === '__new' ? generateId('channel') : selectedChannelId,
      name: channelForm.name.trim() || 'Untitled channel',
      type: channelForm.type,
      topic: channelForm.topic.trim(),
      description: channelForm.description.trim(),
      members: Number.parseInt(channelForm.members, 10) || 0,
      slowMode: Number.parseInt(channelForm.slowMode, 10) || 0,
      isPrivate: Boolean(channelForm.isPrivate),
      allowMedia: Boolean(channelForm.allowMedia),
      permissions: channelForm.permissions,
      moderators: channelForm.moderators
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean),
      tags: channelForm.tags
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean),
      lastActivity: selectedChannel?.lastActivity ?? 'Just now'
    };

    setChannels((previous) => {
      const exists = previous.some((channel) => channel.id === payload.id);
      if (exists) {
        return previous.map((channel) => (channel.id === payload.id ? { ...channel, ...payload } : channel));
      }
      return [...previous, payload];
    });

    setSelectedChannelId(payload.id);
    logActivity(
      `${isNewChannel ? 'Created' : 'Updated'} #${payload.name} ${payload.type.replace('-', ' ')} channel`,
      'channels'
    );
  };

  const handleChannelDelete = (id) => {
    const target = channels.find((channel) => channel.id === id);
    setChannels((previous) => {
      const next = previous.filter((channel) => channel.id !== id);
      setSelectedChannelId((current) => {
        if (current === id) {
          return next[0]?.id ?? '__new';
        }
        return current;
      });
      return next;
    });
    if (target) {
      logActivity(`Deleted #${target.name} channel`, 'channels');
    }
  };

  const handleChannelDuplicate = (id) => {
    const source = channels.find((channel) => channel.id === id);
    if (!source) return;
    const duplicate = {
      ...source,
      id: generateId('channel'),
      name: `${source.name} Copy`,
      lastActivity: 'Just now'
    };
    setChannels((previous) => [...previous, duplicate]);
    setSelectedChannelId(duplicate.id);
    logActivity(`Duplicated #${source.name} into ${duplicate.name}`, 'channels');
  };

  const handleRoleFormChange = (field, value) => {
    setRoleForm((current) => ({ ...current, [field]: value }));
  };

  const handleRolePermissionToggle = (permission) => {
    setRoleForm((current) => {
      const hasPermission = current.permissions.includes(permission);
      return {
        ...current,
        permissions: hasPermission
          ? current.permissions.filter((item) => item !== permission)
          : [...current.permissions, permission]
      };
    });
  };

  const handleRoleSubmit = (event) => {
    event.preventDefault();
    const isNewRole = !selectedRoleId || !roles.some((role) => role.id === selectedRoleId);
    const payload = {
      id: selectedRoleId ?? generateId('role'),
      name: roleForm.name.trim() || 'New role',
      color: roleForm.color,
      members: Number.parseInt(roleForm.members, 10) || 0,
      canBroadcast: Boolean(roleForm.canBroadcast),
      canModerate: Boolean(roleForm.canModerate),
      canManageVoice: Boolean(roleForm.canManageVoice),
      permissions: roleForm.permissions
    };

    setRoles((previous) => {
      const exists = previous.some((role) => role.id === payload.id);
      if (exists) {
        return previous.map((role) => (role.id === payload.id ? { ...role, ...payload } : role));
      }
      return [...previous, payload];
    });

    setSelectedRoleId(payload.id);
    logActivity(`${isNewRole ? 'Created' : 'Updated'} ${payload.name} role`, 'roles');
  };

  const handleRoleDelete = (id) => {
    const target = roles.find((role) => role.id === id);
    setRoles((previous) => previous.filter((role) => role.id !== id));
    setSelectedRoleId((current) => (current === id ? null : current));
    if (target) {
      logActivity(`Removed ${target.name} role`, 'roles');
    }
  };

  const handleEventFormChange = (field, value) => {
    setEventForm((current) => ({ ...current, [field]: value }));
  };

  const handleEventSubmit = (event) => {
    event.preventDefault();
    const isNewEvent = !selectedEventId || !events.some((item) => item.id === selectedEventId);
    const payload = {
      id: selectedEventId ?? generateId('event'),
      title: eventForm.title.trim() || 'Untitled event',
      type: eventForm.type,
      host: eventForm.host.trim() || 'Community Team',
      scheduledFor: eventForm.scheduledFor.trim() || 'To be scheduled',
      duration: eventForm.duration.trim() || '60 minutes',
      channels: eventForm.channels,
      status: eventForm.status.trim() || 'Draft',
      assets: eventForm.assets
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean)
    };

    setEvents((previous) => {
      const exists = previous.some((item) => item.id === payload.id);
      if (exists) {
        return previous.map((item) => (item.id === payload.id ? { ...item, ...payload } : item));
      }
      return [...previous, payload];
    });

    setSelectedEventId(payload.id);
    logActivity(`${isNewEvent ? 'Scheduled' : 'Updated'} ${payload.title}`, 'events');
  };

  const handleEventDelete = (id) => {
    const target = events.find((item) => item.id === id);
    setEvents((previous) => previous.filter((item) => item.id !== id));
    setSelectedEventId((current) => (current === id ? null : current));
    if (target) {
      logActivity(`Cancelled ${target.title}`, 'events');
    }
  };

  const handleMediaUpload = (event) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;
    const uploads = files.map((file) => ({
      id: generateId('asset'),
      name: file.name,
      type: determineAssetType(file.name, file.type),
      duration: file.type.startsWith('audio') ? '03:00' : file.type.startsWith('video') ? '00:30' : '—',
      size: file.size ? `${Math.max(file.size / (1024 * 1024), 0.1).toFixed(1)} MB` : '—',
      owner: 'You',
      status: 'Staging',
      assignedTo: [],
      notes: 'Uploaded from dashboard'
    }));
    setMediaAssets((previous) => [...uploads, ...previous]);
    logActivity(`Uploaded ${uploads.length} asset${uploads.length > 1 ? 's' : ''} to staging`, 'media');
    event.target.value = '';
  };

  const handleMediaAdvance = (id) => {
    const asset = mediaAssets.find((item) => item.id === id);
    if (!asset) return;
    const currentIndex = MEDIA_STATUS_FLOW.indexOf(asset.status);
    let nextStatus;
    if (asset.status === 'Published' || asset.status === 'Archived') {
      nextStatus = 'Staging';
    } else {
      nextStatus = MEDIA_STATUS_FLOW[Math.min(currentIndex + 1, MEDIA_STATUS_FLOW.length - 1)] ?? 'Published';
    }
    if (asset.status === nextStatus) return;
    setMediaAssets((previous) =>
      previous.map((item) => (item.id === id ? { ...item, status: nextStatus } : item))
    );
    logActivity(`Advanced ${asset.name} to ${nextStatus.toLowerCase()} state`, 'media');
  };

  const handleMediaArchive = (id) => {
    const asset = mediaAssets.find((item) => item.id === id);
    if (!asset) return;
    setMediaAssets((previous) =>
      previous.map((item) => (item.id === id ? { ...item, status: 'Archived' } : item))
    );
    logActivity(`Archived ${asset.name}`, 'media');
  };

  const handleMediaAssign = (assetId, channelId) => {
    if (!channelId) return;
    setMediaAssets((previous) =>
      previous.map((asset) => {
        if (asset.id !== assetId || asset.assignedTo.includes(channelId)) return asset;
        return { ...asset, assignedTo: [...asset.assignedTo, channelId] };
      })
    );
    const channelName = channelLookup.get(channelId) ?? channelId;
    const asset = mediaAssets.find((item) => item.id === assetId);
    if (asset) {
      logActivity(`Assigned ${asset.name} to #${channelName}`, 'media');
    }
  };

  const handleMediaRemoveAssignment = (assetId, channelId) => {
    const asset = mediaAssets.find((item) => item.id === assetId);
    if (!asset) return;
    setMediaAssets((previous) =>
      previous.map((item) =>
        item.id === assetId
          ? { ...item, assignedTo: item.assignedTo.filter((entry) => entry !== channelId) }
          : item
      )
    );
    const channelName = channelLookup.get(channelId) ?? channelId;
    logActivity(`Unassigned ${asset.name} from #${channelName}`, 'media');
  };

  const handleMediaDelete = (id) => {
    const asset = mediaAssets.find((item) => item.id === id);
    setMediaAssets((previous) => previous.filter((item) => item.id !== id));
    if (asset) {
      logActivity(`Removed ${asset.name} from library`, 'media');
    }
  };

  const handleLibrarySync = () => {
    logActivity('Triggered cloud library sync', 'media');
  };

  const handleIncidentResolve = (id, resolution) => {
    const incident = incidents.find((item) => item.id === id);
    if (!incident) return;
    setIncidents((previous) =>
      previous.map((item) =>
        item.id === id
          ? { ...item, status: 'Resolved', resolution, resolvedAt: new Date().toISOString() }
          : item
      )
    );
    const channelName = channelLookup.get(incident.channelId) ?? incident.channelId;
    logActivity(`Resolved ${incident.type.toLowerCase()} in #${channelName}`, 'moderation');
  };

  const handleChecklistPass = (id) => {
    setQualityChecks((previous) =>
      previous.map((item) => (item.id === id ? { ...item, status: 'Passed' } : item))
    );
    const check = qualityChecks.find((item) => item.id === id);
    if (check) {
      logActivity(`Passed check: ${check.label}`, 'qa');
    }
  };

  const handleChecklistBlock = (id) => {
    setQualityChecks((previous) =>
      previous.map((item) => (item.id === id ? { ...item, status: 'Blocked' } : item))
    );
    const check = qualityChecks.find((item) => item.id === id);
    if (check) {
      logActivity(`Flagged blocker on ${check.label}`, 'qa');
    }
  };

  const activeVoiceRooms = useMemo(
    () =>
      events
        .filter((item) => item.type !== 'broadcast')
        .map((item) => ({
          id: item.id,
          title: item.title,
          host: item.host,
          status: item.status,
          listeners: Math.max(12, Math.round(Math.random() * 80)),
          duration: item.duration
        })),
    [events]
  );

  return (
    <div className="space-y-10">
      <section className="dashboard-section">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="dashboard-kicker">Instructor community · Chats</p>
            <h1 className="dashboard-title">Engage every cohort in real-time</h1>
            <p className="dashboard-subtitle">
              Launch text, voice, and broadcast spaces with granular permissions, production-ready runbooks, and
              integrated media libraries.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className="dashboard-primary-pill"
              onClick={() => {
                setSelectedChannelId('__new');
                setChannelForm(EMPTY_FORM);
              }}
            >
              <PlusIcon className="mr-2 h-4 w-4" />
              New channel
            </button>
            <button type="button" className="dashboard-pill px-4 py-2" onClick={() => setChannelFilter('')}>
              <ArrowPathIcon className="mr-2 h-4 w-4" />
              Reset filters
            </button>
          </div>
        </div>

        <dl className="mt-8 grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
            <dt className="flex items-center gap-2 text-sm font-semibold text-slate-600">
              <ChatBubbleBottomCenterTextIcon className="h-5 w-5 text-primary" />
              Active channels
            </dt>
            <dd className="mt-2 text-3xl font-semibold text-slate-900">{channels.length}</dd>
            <p className="mt-1 text-xs text-slate-500">{channelMetrics.totalMembers} members routed across spaces.</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
            <dt className="flex items-center gap-2 text-sm font-semibold text-slate-600">
              <ShieldCheckIcon className="h-5 w-5 text-primary" />
              Private lounges
            </dt>
            <dd className="mt-2 text-3xl font-semibold text-slate-900">{channelMetrics.privateCount}</dd>
            <p className="mt-1 text-xs text-slate-500">High-trust spaces with moderator workflows enabled.</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
            <dt className="flex items-center gap-2 text-sm font-semibold text-slate-600">
              <VideoCameraIcon className="h-5 w-5 text-primary" />
              Media-ready rooms
            </dt>
            <dd className="mt-2 text-3xl font-semibold text-slate-900">{channelMetrics.mediaEnabled}</dd>
            <p className="mt-1 text-xs text-slate-500">Spaces with screen share and asset libraries activated.</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
            <dt className="flex items-center gap-2 text-sm font-semibold text-slate-600">
              <MusicalNoteIcon className="h-5 w-5 text-primary" />
              Assets staging
            </dt>
            <dd className="mt-2 text-3xl font-semibold text-slate-900">{stagedAssets.length}</dd>
            <p className="mt-1 text-xs text-slate-500">{readyAssets.length} ready · {mediaAssets.length} total assets.</p>
          </div>
        </dl>
      </section>

      <section className="grid gap-6 lg:grid-cols-[2fr,3fr]">
        <div className="space-y-6">
          <div className="dashboard-section">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Channel catalogue</h2>
              <input
                type="search"
                value={channelFilter}
                onChange={(event) => setChannelFilter(event.target.value)}
                className="w-48 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 focus:border-primary focus:outline-none"
                placeholder="Search channels"
              />
            </div>

            <ul className="mt-4 space-y-3">
              {filteredChannels.map((channel) => (
                <li key={channel.id} className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <button
                        type="button"
                        onClick={() => setSelectedChannelId(channel.id)}
                        className="text-left text-base font-semibold text-slate-900 hover:text-primary"
                      >
                        {channel.name}
                      </button>
                      <p className="mt-1 text-sm text-slate-600">{channel.topic}</p>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                        <span className="rounded-full bg-slate-100 px-2 py-1">{channel.type}</span>
                        <span className="rounded-full bg-slate-100 px-2 py-1">{channel.members} members</span>
                        {channel.isPrivate && (
                          <span className="rounded-full bg-amber-100 px-2 py-1 text-amber-700">Private</span>
                        )}
                        {channel.tags.map((tag) => (
                          <span key={tag} className="rounded-full bg-primary/10 px-2 py-1 text-primary">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="dashboard-pill px-3 py-1 text-xs"
                        onClick={() => handleChannelDuplicate(channel.id)}
                      >
                        Duplicate
                      </button>
                      <button
                        type="button"
                        className="dashboard-pill px-3 py-1 text-xs text-red-600 hover:border-red-200"
                        onClick={() => handleChannelDelete(channel.id)}
                      >
                        <TrashIcon className="mr-1 h-3 w-3" />
                        Delete
                      </button>
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-slate-500">Last active {channel.lastActivity}</p>
                </li>
              ))}
            </ul>
          </div>

          <div className="dashboard-section">
            <h2 className="text-lg font-semibold text-slate-900">
              {selectedChannelId === '__new' ? 'Create new channel' : 'Channel configuration'}
            </h2>
            <form className="mt-4 space-y-4" onSubmit={handleChannelSubmit}>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex flex-col text-sm font-medium text-slate-700">
                  Name
                  <input
                    required
                    type="text"
                    value={channelForm.name}
                    onChange={(event) => handleChannelFormChange('name', event.target.value)}
                    className="mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none"
                  />
                </label>
                <label className="flex flex-col text-sm font-medium text-slate-700">
                  Channel type
                  <select
                    value={channelForm.type}
                    onChange={(event) => handleChannelFormChange('type', event.target.value)}
                    className="mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none"
                  >
                    <option value="discussion">Discussion</option>
                    <option value="broadcast">Broadcast</option>
                    <option value="voice-stage">Voice & stage</option>
                    <option value="voice-room">Voice room</option>
                    <option value="live-support">Live support</option>
                  </select>
                </label>
              </div>

              <label className="flex flex-col text-sm font-medium text-slate-700">
                Topic
                <input
                  type="text"
                  value={channelForm.topic}
                  onChange={(event) => handleChannelFormChange('topic', event.target.value)}
                  className="mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none"
                  placeholder="What’s the focus?"
                />
              </label>

              <label className="flex flex-col text-sm font-medium text-slate-700">
                Description
                <textarea
                  rows={3}
                  value={channelForm.description}
                  onChange={(event) => handleChannelFormChange('description', event.target.value)}
                  className="mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none"
                  placeholder="Share moderation notes, pinned resources, and publishing guidelines"
                />
              </label>

              <div className="grid gap-4 md:grid-cols-3">
                <label className="flex flex-col text-sm font-medium text-slate-700">
                  Member slots
                  <input
                    type="number"
                    min={0}
                    value={channelForm.members}
                    onChange={(event) => handleChannelFormChange('members', event.target.value)}
                    className="mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none"
                  />
                </label>
                <label className="flex flex-col text-sm font-medium text-slate-700">
                  Slow mode (seconds)
                  <input
                    type="number"
                    min={0}
                    value={channelForm.slowMode}
                    onChange={(event) => handleChannelFormChange('slowMode', event.target.value)}
                    className="mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none"
                  />
                </label>
                <label className="flex flex-col text-sm font-medium text-slate-700">
                  Channel tags
                  <input
                    type="text"
                    value={channelForm.tags}
                    onChange={(event) => handleChannelFormChange('tags', event.target.value)}
                    className="mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none"
                    placeholder="launch, studio, intros"
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={channelForm.isPrivate}
                    onChange={(event) => handleChannelFormChange('isPrivate', event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                  />
                  Private channel
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={channelForm.allowMedia}
                    onChange={(event) => handleChannelFormChange('allowMedia', event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                  />
                  Allow media uploads & stage scenes
                </label>
              </div>

              <div>
                <p className="text-sm font-medium text-slate-700">Permissions</p>
                <div className="mt-2 grid gap-2 md:grid-cols-2">
                  {PERMISSION_OPTIONS.map((option) => (
                    <label key={option.id} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={channelForm.permissions.includes(option.id)}
                        onChange={() => handlePermissionToggle(option.id)}
                        className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </div>

              <label className="flex flex-col text-sm font-medium text-slate-700">
                Moderation teams
                <input
                  type="text"
                  value={channelForm.moderators}
                  onChange={(event) => handleChannelFormChange('moderators', event.target.value)}
                  className="mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none"
                  placeholder="Community Leads, Studio Hosts"
                />
              </label>

              <div className="flex justify-end gap-3">
                <button type="button" className="dashboard-pill px-4 py-2" onClick={() => setChannelForm(EMPTY_FORM)}>
                  Reset
                </button>
                <button type="submit" className="dashboard-primary-pill">
                  <PencilSquareIcon className="mr-2 h-4 w-4" />
                  {selectedChannelId === '__new' ? 'Create channel' : 'Save changes'}
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="space-y-6">
          <div className="dashboard-section">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Role controls</h2>
              <button
                type="button"
                className="dashboard-pill px-4 py-2"
                onClick={() => {
                  setSelectedRoleId(null);
                  setRoleForm(EMPTY_ROLE_FORM);
                }}
              >
                <PlusIcon className="mr-2 h-4 w-4" />
                New role
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {roles.map((role) => (
                <div key={role.id} className="flex flex-col gap-4 rounded-xl border border-slate-100 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-center gap-3">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: role.color }} aria-hidden="true" />
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{role.name}</p>
                      <p className="text-xs text-slate-500">{role.members} members · {role.permissions.join(', ') || 'No advanced permissions'}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 text-xs text-slate-600">
                    {role.canBroadcast && <span className="rounded-full bg-primary/10 px-3 py-1">Broadcast</span>}
                    {role.canModerate && <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-700">Moderation</span>}
                    {role.canManageVoice && <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700">Voice ops</span>}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="dashboard-pill px-3 py-1 text-xs"
                      onClick={() => setSelectedRoleId(role.id)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="dashboard-pill px-3 py-1 text-xs text-red-600 hover:border-red-200"
                      onClick={() => handleRoleDelete(role.id)}
                    >
                      <TrashIcon className="mr-1 h-3 w-3" />
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <form className="mt-6 space-y-4 border-t border-slate-100 pt-4" onSubmit={handleRoleSubmit}>
              <h3 className="text-sm font-semibold text-slate-800">
                {selectedRoleId ? 'Edit role' : 'Create role'}
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex flex-col text-sm font-medium text-slate-700">
                  Role name
                  <input
                    required
                    type="text"
                    value={roleForm.name}
                    onChange={(event) => handleRoleFormChange('name', event.target.value)}
                    className="mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none"
                  />
                </label>
                <label className="flex flex-col text-sm font-medium text-slate-700">
                  Accent colour
                  <input
                    type="color"
                    value={roleForm.color}
                    onChange={(event) => handleRoleFormChange('color', event.target.value)}
                    className="mt-1 h-10 w-full rounded-lg border border-slate-200"
                  />
                </label>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <label className="flex flex-col text-sm font-medium text-slate-700">
                  Members assigned
                  <input
                    type="number"
                    min={0}
                    value={roleForm.members}
                    onChange={(event) => handleRoleFormChange('members', event.target.value)}
                    className="mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none"
                  />
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={roleForm.canBroadcast}
                    onChange={(event) => handleRoleFormChange('canBroadcast', event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                  />
                  Broadcast access
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={roleForm.canModerate}
                    onChange={(event) => handleRoleFormChange('canModerate', event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                  />
                  Moderation controls
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={roleForm.canManageVoice}
                    onChange={(event) => handleRoleFormChange('canManageVoice', event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                  />
                  Manage voice rooms
                </label>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700">Advanced permissions</p>
                <div className="mt-2 grid gap-2 md:grid-cols-2">
                  {ROLE_PERMISSION_OPTIONS.map((option) => (
                    <label key={option.id} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={roleForm.permissions.includes(option.id)}
                        onChange={() => handleRolePermissionToggle(option.id)}
                        className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" className="dashboard-pill px-4 py-2" onClick={() => setRoleForm(EMPTY_ROLE_FORM)}>
                  Reset
                </button>
                <button type="submit" className="dashboard-primary-pill">
                  <PencilSquareIcon className="mr-2 h-4 w-4" />
                  {selectedRoleId ? 'Save role' : 'Create role'}
                </button>
              </div>
            </form>
          </div>

          <div className="dashboard-section">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Live events & voice stages</h2>
              <button
                type="button"
                className="dashboard-pill px-4 py-2"
                onClick={() => {
                  setSelectedEventId(null);
                  setEventForm(EMPTY_EVENT_FORM);
                }}
              >
                <PlusIcon className="mr-2 h-4 w-4" />
                Plan event
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {events.map((item) => (
                <div key={item.id} className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                      <p className="text-xs uppercase tracking-wide text-slate-500">{item.status}</p>
                      <p className="mt-1 text-sm text-slate-600">Hosted by {item.host}</p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                      <span className="rounded-full bg-slate-100 px-3 py-1">{item.scheduledFor}</span>
                      <span className="rounded-full bg-slate-100 px-3 py-1">{item.duration}</span>
                      {item.channels.map((channelId) => {
                        const channel = channels.find((channelItem) => channelItem.id === channelId);
                        return (
                          <span key={channelId} className="rounded-full bg-primary/10 px-3 py-1 text-primary">
                            #{channel?.name ?? channelId}
                          </span>
                        );
                      })}
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="dashboard-pill px-3 py-1 text-xs"
                        onClick={() => setSelectedEventId(item.id)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="dashboard-pill px-3 py-1 text-xs text-red-600 hover:border-red-200"
                        onClick={() => handleEventDelete(item.id)}
                      >
                        <TrashIcon className="mr-1 h-3 w-3" />
                        Cancel
                      </button>
                    </div>
                  </div>
                  {item.assets.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                      {item.assets.map((asset) => (
                        <span key={asset} className="rounded-full bg-slate-100 px-2 py-1">
                          {asset}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <form className="mt-6 space-y-4 border-t border-slate-100 pt-4" onSubmit={handleEventSubmit}>
              <h3 className="text-sm font-semibold text-slate-800">
                {selectedEventId ? 'Edit event' : 'Create event'}
              </h3>
              <label className="flex flex-col text-sm font-medium text-slate-700">
                Title
                <input
                  required
                  type="text"
                  value={eventForm.title}
                  onChange={(event) => handleEventFormChange('title', event.target.value)}
                  className="mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none"
                />
              </label>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex flex-col text-sm font-medium text-slate-700">
                  Event type
                  <select
                    value={eventForm.type}
                    onChange={(event) => handleEventFormChange('type', event.target.value)}
                    className="mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none"
                  >
                    {EVENT_TYPES.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col text-sm font-medium text-slate-700">
                  Host team
                  <input
                    type="text"
                    value={eventForm.host}
                    onChange={(event) => handleEventFormChange('host', event.target.value)}
                    className="mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none"
                    placeholder="Community Leads"
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <label className="flex flex-col text-sm font-medium text-slate-700">
                  Schedule
                  <input
                    type="text"
                    value={eventForm.scheduledFor}
                    onChange={(event) => handleEventFormChange('scheduledFor', event.target.value)}
                    className="mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none"
                    placeholder="Fridays · 17:00 UTC"
                  />
                </label>
                <label className="flex flex-col text-sm font-medium text-slate-700">
                  Duration
                  <input
                    type="text"
                    value={eventForm.duration}
                    onChange={(event) => handleEventFormChange('duration', event.target.value)}
                    className="mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none"
                    placeholder="60 minutes"
                  />
                </label>
                <label className="flex flex-col text-sm font-medium text-slate-700">
                  Status
                  <input
                    type="text"
                    value={eventForm.status}
                    onChange={(event) => handleEventFormChange('status', event.target.value)}
                    className="mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none"
                    placeholder="Scheduled"
                  />
                </label>
              </div>

              <div>
                <p className="text-sm font-medium text-slate-700">Channels</p>
                <div className="mt-2 grid gap-2 md:grid-cols-2">
                  {channels.map((channel) => (
                    <label key={channel.id} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={eventForm.channels.includes(channel.id)}
                        onChange={(event) => {
                          const checked = event.target.checked;
                          setEventForm((current) => ({
                            ...current,
                            channels: checked
                              ? [...current.channels, channel.id]
                              : current.channels.filter((id) => id !== channel.id)
                          }));
                        }}
                        className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                      />
                      #{channel.name}
                    </label>
                  ))}
                </div>
              </div>

              <label className="flex flex-col text-sm font-medium text-slate-700">
                Run of show assets
                <input
                  type="text"
                  value={eventForm.assets}
                  onChange={(event) => handleEventFormChange('assets', event.target.value)}
                  className="mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none"
                  placeholder="Run-of-show.docx, Intro bumper.mp4"
                />
              </label>

              <div className="flex justify-end gap-3">
                <button type="button" className="dashboard-pill px-4 py-2" onClick={() => setEventForm(EMPTY_EVENT_FORM)}>
                  Reset
                </button>
                <button type="submit" className="dashboard-primary-pill">
                  <PencilSquareIcon className="mr-2 h-4 w-4" />
                  {selectedEventId ? 'Save event' : 'Create event'}
                </button>
              </div>
            </form>
          </div>

          <div className="dashboard-section">
            <h2 className="text-lg font-semibold text-slate-900">Live control room</h2>
            <p className="mt-2 text-sm text-slate-600">
              Monitor active voice rooms, track listener counts, and trigger session recordings without leaving the
              dashboard.
            </p>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              {activeVoiceRooms.map((room) => (
                <div key={room.id} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
                    <SpeakerWaveIcon className="h-4 w-4" /> Voice room
                  </div>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{room.title}</p>
                  <p className="text-xs text-slate-500">{room.status}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
                    <span className="rounded-full bg-white px-2 py-1">{room.listeners} listeners</span>
                    <span className="rounded-full bg-white px-2 py-1">{room.duration}</span>
                    <span className="rounded-full bg-white px-2 py-1">Host {room.host}</span>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button type="button" className="dashboard-pill px-3 py-1 text-xs">
                      Start recording
                    </button>
                    <button type="button" className="dashboard-pill px-3 py-1 text-xs">
                      Open backstage
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="dashboard-section">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Media staging &amp; asset ops</h2>
                <p className="mt-2 text-sm text-slate-600">
                  Upload bumpers, ambience loops, and runbooks. Ready assets sync instantly to the channels you assign.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <label className="dashboard-primary-pill cursor-pointer">
                  <PlusIcon className="mr-2 h-4 w-4" />
                  Upload media
                  <input
                    type="file"
                    multiple
                    accept="video/*,audio/*,.pdf,.doc,.docx,.ppt,.pptx"
                    onChange={handleMediaUpload}
                    className="sr-only"
                  />
                </label>
                <button type="button" className="dashboard-pill px-4 py-2" onClick={handleLibrarySync}>
                  <ArrowPathIcon className="mr-2 h-4 w-4" />
                  Sync cloud drive
                </button>
              </div>
            </div>

            <div className="mt-6 overflow-hidden rounded-2xl border border-slate-100">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th scope="col" className="px-4 py-3">Asset</th>
                    <th scope="col" className="px-4 py-3">Assigned to</th>
                    <th scope="col" className="px-4 py-3">Status</th>
                    <th scope="col" className="px-4 py-3">Owner</th>
                    <th scope="col" className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {mediaAssets.map((asset) => {
                    const statusTone = assetStatusTone[asset.status] ?? 'border-slate-200 bg-slate-50 text-slate-500';
                    return (
                      <tr key={asset.id} className="align-top">
                        <td className="px-4 py-4">
                          <p className="font-semibold text-slate-900">{asset.name}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {asset.type} · {asset.duration} · {asset.size}
                          </p>
                          {asset.notes && <p className="mt-2 text-xs text-slate-500">{asset.notes}</p>}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-wrap gap-2">
                            {asset.assignedTo.length > 0 ? (
                              asset.assignedTo.map((channelId) => (
                                <span
                                  key={channelId}
                                  className="flex items-center gap-1 rounded-full border border-slate-200 px-2 py-1 text-xs text-slate-600"
                                >
                                  #{channelLookup.get(channelId) ?? channelId}
                                  <button
                                    type="button"
                                    className="ml-1 text-slate-400 transition hover:text-rose-500"
                                    onClick={() => handleMediaRemoveAssignment(asset.id, channelId)}
                                    aria-label={`Remove ${channelLookup.get(channelId) ?? channelId}`}
                                  >
                                    ×
                                  </button>
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-slate-400">Not assigned</span>
                            )}
                          </div>
                          <div className="mt-3 flex gap-2">
                            <select
                              defaultValue=""
                              className="w-44 rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 focus:border-primary focus:outline-none"
                              onChange={(event) => {
                                const value = event.target.value;
                                handleMediaAssign(asset.id, value);
                                event.target.value = '';
                              }}
                            >
                              <option value="">Assign channel…</option>
                              {channels.map((channel) => (
                                <option key={channel.id} value={channel.id}>
                                  {channel.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${statusTone}`}
                          >
                            {asset.status}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <p className="text-sm font-medium text-slate-700">{asset.owner}</p>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-col items-end gap-2 text-xs">
                            <button
                              type="button"
                              className="dashboard-pill px-3 py-1"
                              onClick={() => handleMediaAdvance(asset.id)}
                            >
                              {assetAdvanceLabel(asset.status)}
                            </button>
                            <button
                              type="button"
                              className="dashboard-pill px-3 py-1"
                              onClick={() => handleMediaArchive(asset.id)}
                              disabled={asset.status === 'Archived'}
                            >
                              Archive
                            </button>
                            <button
                              type="button"
                              className="dashboard-pill px-3 py-1 text-red-600 hover:border-red-200"
                              onClick={() => handleMediaDelete(asset.id)}
                            >
                              <TrashIcon className="mr-1 h-3 w-3" />
                              Remove
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {mediaAssets.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-sm text-slate-500">
                        Upload media to build your staging library.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <section className="grid gap-6 lg:grid-cols-2">
            <div className="dashboard-section">
              <h2 className="text-lg font-semibold text-slate-900">Moderation &amp; safety</h2>
              <p className="mt-2 text-sm text-slate-600">
                Track escalations and document how each case was resolved to maintain community trust.
              </p>
              <div className="mt-4 space-y-3">
                {incidents.map((incident) => {
                  const severityTone = severityBadge[incident.severity] ?? severityBadge.Medium;
                  const channelName = channelLookup.get(incident.channelId) ?? incident.channelId;
                  return (
                    <article key={incident.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          <span className={`rounded-full border px-2 py-1 text-[11px] ${severityTone}`}>
                            {incident.severity}
                          </span>
                          <span>#{channelName}</span>
                        </div>
                        <p className="text-xs text-slate-400">Opened {formatTimestamp(incident.openedAt)}</p>
                      </div>
                      <h3 className="mt-2 text-sm font-semibold text-slate-900">{incident.type}</h3>
                      <p className="mt-1 text-sm text-slate-600">{incident.notes}</p>
                      {incident.resolution && (
                        <p className="mt-2 text-xs text-emerald-600">
                          Resolved {formatTimestamp(incident.resolvedAt)} · {incident.resolution}
                        </p>
                      )}
                      <div className="mt-4 flex flex-wrap gap-2 text-xs">
                        <button
                          type="button"
                          className="dashboard-pill px-3 py-1"
                          onClick={() => handleIncidentResolve(incident.id, 'Muted user for 24h')}
                          disabled={incident.status === 'Resolved'}
                        >
                          Close &amp; mute
                        </button>
                        <button
                          type="button"
                          className="dashboard-pill px-3 py-1"
                          onClick={() => handleIncidentResolve(incident.id, 'Escalated to safety team')}
                          disabled={incident.status === 'Resolved'}
                        >
                          Escalate
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
              {openIncidents.length === 0 && (
                <p className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                  All incidents cleared. Keep proactive monitoring enabled during live launches.
                </p>
              )}
            </div>

            <div className="dashboard-section">
              <h2 className="text-lg font-semibold text-slate-900">Operational readiness</h2>
              <p className="mt-2 text-sm text-slate-600">
                Run pre-flight QA before major streams so production teams have absolute confidence.
              </p>
              <ul className="mt-4 space-y-3">
                {qualityChecks.map((check) => (
                  <li key={check.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{check.label}</p>
                        <p className="mt-1 text-sm text-slate-600">{check.description}</p>
                      </div>
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                          checkBadge[check.status] ?? checkBadge.Pending
                        }`}
                      >
                        {check.status}
                      </span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2 text-xs">
                      <button
                        type="button"
                        className="dashboard-pill px-3 py-1"
                        onClick={() => handleChecklistPass(check.id)}
                      >
                        Mark passed
                      </button>
                      <button
                        type="button"
                        className="dashboard-pill px-3 py-1 text-amber-600 hover:border-amber-200"
                        onClick={() => handleChecklistBlock(check.id)}
                      >
                        Flag blocker
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <div className="dashboard-section">
            <h2 className="text-lg font-semibold text-slate-900">Activity feed</h2>
            <p className="mt-2 text-sm text-slate-600">
              Every change is tracked for audit trails so operations and compliance can review quickly.
            </p>
            <ul className="mt-4 space-y-3">
              {displayedActivity.map((entry) => (
                <li key={entry.id} className="flex items-start justify-between gap-4 rounded-2xl border border-slate-100 bg-white p-4">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{entry.message}</p>
                    <p className="text-xs uppercase tracking-wide text-slate-500">{entry.scope}</p>
                  </div>
                  <time dateTime={entry.timestamp} className="text-xs text-slate-400">
                    {formatTimestamp(entry.timestamp)}
                  </time>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
