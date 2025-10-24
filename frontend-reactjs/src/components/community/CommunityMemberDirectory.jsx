import { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import {
  EnvelopeIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  SparklesIcon,
  UsersIcon
} from '@heroicons/react/24/outline';

import { deriveMemberClusters } from './communityEngagementMetrics.js';

const STATUS_COLORS = {
  Active: 'bg-emerald-500',
  Pending: 'bg-amber-400',
  Suspended: 'bg-rose-500'
};

const ROLE_ORDER = ['Owner', 'Admin', 'Moderator', 'Member'];

const DEFAULT_MEMBERS = [
  {
    id: 'directory-default-1',
    name: 'Amina Rowe',
    role: 'Owner',
    status: 'Active',
    title: 'Community Architect',
    location: 'San Francisco, USA',
    email: 'amina@edulure.com',
    avatarUrl: 'https://randomuser.me/api/portraits/women/68.jpg',
    tags: ['Leadership', 'Stage host', 'Revenue rituals'],
    isOnline: true,
    lastActiveAt: '2024-05-12T17:15:00.000Z'
  },
  {
    id: 'directory-default-2',
    name: 'Leo Okafor',
    role: 'Moderator',
    status: 'Active',
    title: 'Operator Success',
    location: 'London, UK',
    email: 'leo@edulure.com',
    avatarUrl: 'https://randomuser.me/api/portraits/men/29.jpg',
    tags: ['Moderation', 'Classroom host'],
    isOnline: true,
    lastActiveAt: '2024-05-12T16:45:00.000Z',
    recommended: true
  },
  {
    id: 'directory-default-3',
    name: 'Nikhil Rao',
    role: 'Member',
    status: 'Active',
    title: 'Learning Designer',
    location: 'Bengaluru, IN',
    email: 'nikhil@edulure.com',
    avatarUrl: 'https://randomuser.me/api/portraits/men/94.jpg',
    tags: ['Instructional design', 'Async labs'],
    isOnline: true,
    lastActiveAt: '2024-05-12T13:20:00.000Z',
    recommended: true
  },
  {
    id: 'directory-default-4',
    name: 'Sofia Martínez',
    role: 'Member',
    status: 'Pending',
    title: 'Revenue Strategist',
    location: 'Madrid, ES',
    email: 'sofia@edulure.com',
    avatarUrl: 'https://randomuser.me/api/portraits/women/47.jpg',
    tags: ['Revenue pod', 'Onboarding'],
    isOnline: false,
    lastActiveAt: '2024-05-11T21:00:00.000Z'
  }
];

function normaliseMembers(members) {
  if (!Array.isArray(members) || members.length === 0) {
    return DEFAULT_MEMBERS;
  }

  return members
    .map((member, index) => ({
      id: member.id ?? member.memberId ?? `member-${index}`,
      name: member.name ?? member.displayName ?? 'Member',
      role: member.role ? String(member.role) : 'Member',
      status: member.status ? String(member.status) : 'Active',
      title: member.title ?? member.jobTitle ?? '',
      location: member.location ?? member.city ?? '',
      email: member.email ?? member.contactEmail ?? '',
      avatarUrl: member.avatarUrl ?? member.avatarURL ?? member.profileImageUrl ?? '',
      tags: Array.isArray(member.tags)
        ? member.tags
        : typeof member.tags === 'string'
          ? member.tags
              .split(',')
              .map((tag) => tag.trim())
              .filter(Boolean)
          : [],
      isOnline: Boolean(member.isOnline ?? member.online),
      lastActiveAt: member.lastActiveAt ?? member.lastSeenAt ?? null,
      recommended: Boolean(member.recommended ?? member.isRecommended)
    }))
    .filter((member) => member.id && member.name)
    .sort((a, b) => {
      const roleIndexA = ROLE_ORDER.indexOf(a.role);
      const roleIndexB = ROLE_ORDER.indexOf(b.role);
      if (roleIndexA !== roleIndexB) {
        return (roleIndexA === -1 ? ROLE_ORDER.length : roleIndexA) -
          (roleIndexB === -1 ? ROLE_ORDER.length : roleIndexB);
      }
      return a.name.localeCompare(b.name);
    });
}

function formatLastActive(value) {
  if (!value) return 'No activity logged';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No activity logged';
  return `Last active ${date.toLocaleString()}`;
}

function MemberAvatar({ name, avatarUrl, isOnline }) {
  const initials = useMemo(() => {
    if (!name) return '?';
    const parts = name.split(' ').filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? '?';
    return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase();
  }, [name]);

  return (
    <span className="relative inline-flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 via-primary/10 to-primary/30 text-sm font-semibold text-primary shadow-sm">
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt=""
          loading="lazy"
          className="h-full w-full rounded-full object-cover"
        />
      ) : (
        initials
      )}
      <span
        className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ${
          isOnline ? 'bg-emerald-500' : 'bg-slate-300'
        }`}
        aria-hidden="true"
      />
    </span>
  );
}

MemberAvatar.propTypes = {
  name: PropTypes.string,
  avatarUrl: PropTypes.string,
  isOnline: PropTypes.bool
};

function MemberCard({ member, onMessage }) {
  const statusColor = STATUS_COLORS[member.status] ?? STATUS_COLORS.Active;
  const handleMessage = () => {
    if (typeof onMessage === 'function') {
      onMessage(member);
      return;
    }
    if (member.email) {
      window.open(`mailto:${member.email}`, '_blank', 'noopener');
    }
  };

  return (
    <article className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm transition hover:border-primary/40 hover:shadow-md">
      <div className="flex items-center gap-3">
        <MemberAvatar name={member.name} avatarUrl={member.avatarUrl} isOnline={member.isOnline} />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900">{member.name}</p>
          {member.title ? <p className="text-xs text-slate-500">{member.title}</p> : null}
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">
              <UsersIcon className="h-3.5 w-3.5" /> {member.role}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">
              <span className={`h-1.5 w-1.5 rounded-full ${statusColor}`} /> {member.status}
            </span>
            {member.location ? <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-500">{member.location}</span> : null}
          </div>
        </div>
      </div>
      {member.tags?.length ? (
        <div className="flex flex-wrap gap-2 text-[11px] font-medium text-slate-500">
          {member.tags.slice(0, 6).map((tag) => (
            <span key={tag} className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">
              #{tag}
            </span>
          ))}
        </div>
      ) : null}
      <p className="text-xs text-slate-500">{formatLastActive(member.lastActiveAt)}</p>
      <div className="flex items-center justify-end gap-2">
        {member.recommended ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-[11px] font-semibold text-amber-600">
            <SparklesIcon className="h-3.5 w-3.5" /> Suggested
          </span>
        ) : null}
        <button
          type="button"
          onClick={handleMessage}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-primary hover:bg-primary/5 hover:text-primary"
        >
          <EnvelopeIcon className="h-4 w-4" /> Message
        </button>
      </div>
    </article>
  );
}

MemberCard.propTypes = {
  member: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    name: PropTypes.string.isRequired,
    role: PropTypes.string,
    status: PropTypes.string,
    title: PropTypes.string,
    location: PropTypes.string,
    email: PropTypes.string,
    avatarUrl: PropTypes.string,
    tags: PropTypes.arrayOf(PropTypes.string),
    isOnline: PropTypes.bool,
    lastActiveAt: PropTypes.string,
    recommended: PropTypes.bool
  }).isRequired,
  onMessage: PropTypes.func
};

export default function CommunityMemberDirectory({ members, onMessageMember, isLoading = false }) {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All roles');
  const [statusFilter, setStatusFilter] = useState('All statuses');
  const [onlyRecommended, setOnlyRecommended] = useState(false);

  const normalisedMembers = useMemo(() => normaliseMembers(members), [members]);

  const clusterBreakdown = useMemo(() => deriveMemberClusters(normalisedMembers), [normalisedMembers]);

  const roleOptions = useMemo(() => {
    const uniqueRoles = new Set(['All roles']);
    normalisedMembers.forEach((member) => uniqueRoles.add(member.role ?? 'Member'));
    return Array.from(uniqueRoles);
  }, [normalisedMembers]);

  const statusOptions = useMemo(() => {
    const uniqueStatuses = new Set(['All statuses']);
    normalisedMembers.forEach((member) => uniqueStatuses.add(member.status ?? 'Active'));
    return Array.from(uniqueStatuses);
  }, [normalisedMembers]);

  const filteredMembers = useMemo(() => {
    return normalisedMembers.filter((member) => {
      if (onlyRecommended && !member.recommended) return false;
      if (roleFilter !== 'All roles' && member.role !== roleFilter) return false;
      if (statusFilter !== 'All statuses' && member.status !== statusFilter) return false;
      if (!search.trim()) return true;
      const query = search.trim().toLowerCase();
      return [member.name, member.title, member.location, ...(member.tags ?? [])]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(query));
    });
  }, [normalisedMembers, onlyRecommended, roleFilter, statusFilter, search]);

  const recommendedCount = useMemo(
    () => normalisedMembers.filter((member) => member.recommended).length,
    [normalisedMembers]
  );

  return (
    <section className="space-y-5 rounded-4xl border border-slate-200 bg-white/85 p-6 shadow-xl">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Member directory</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-900">People powering this community</h2>
          <p className="mt-2 text-sm text-slate-600">
            Search, filter, and connect with operators across cohorts. Suggested profiles match overlapping tags so you can spin
            up pods quickly.
          </p>
        </div>
        <div className="flex flex-col gap-2 text-xs text-slate-500">
          <span>Total members shown: {filteredMembers.length}</span>
          <span>Suggested connections: {recommendedCount}</span>
        </div>
      </header>

      {clusterBreakdown.length ? (
        <div className="grid gap-3 rounded-3xl border border-slate-200 bg-white/90 p-4 text-xs text-slate-600 sm:grid-cols-2 lg:grid-cols-4">
          {clusterBreakdown.map((cluster) => (
            <div key={cluster.key} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3">
              <p className="text-sm font-semibold text-slate-800">{cluster.label}</p>
              <p className="mt-1">Members: {cluster.members}</p>
              <p className="mt-1">Online: {cluster.online}</p>
              {cluster.sampleMembers.length ? (
                <p className="mt-1 text-[11px] text-slate-400">
                  Examples: {cluster.sampleMembers.join(', ')}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-[minmax(0,2fr),minmax(0,1fr)]">
        <label className="relative flex items-center rounded-3xl border border-slate-200 bg-white/90 px-4 py-2 text-sm text-slate-500 focus-within:border-primary focus-within:text-primary">
          <MagnifyingGlassIcon className="h-5 w-5" />
          <span className="sr-only">Search members</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, expertise, or location"
            className="ml-3 w-full border-none bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
          />
        </label>
        <div className="flex flex-wrap items-center gap-3 justify-self-end">
          <label className="flex items-center gap-2 rounded-3xl border border-slate-200 bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            <FunnelIcon className="h-4 w-4" />
            <span className="sr-only">Filter by role</span>
            <select
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value)}
              className="border-none bg-transparent text-[11px] font-semibold uppercase tracking-wide text-slate-600 focus:outline-none"
            >
              {roleOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 rounded-3xl border border-slate-200 bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            <FunnelIcon className="h-4 w-4" />
            <span className="sr-only">Filter by status</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="border-none bg-transparent text-[11px] font-semibold uppercase tracking-wide text-slate-600 focus:outline-none"
            >
              {statusOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-3xl border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-600 shadow-sm transition hover:border-amber-300">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
              checked={onlyRecommended}
              onChange={(event) => setOnlyRecommended(event.target.checked)}
            />
            Suggested only
          </label>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-500">Loading members…</p>
      ) : filteredMembers.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50/60 p-6 text-sm text-slate-500">
          No members match your filters yet. Adjust filters or invite teammates to this hub.
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filteredMembers.map((member) => (
            <MemberCard key={member.id} member={member} onMessage={onMessageMember} />
          ))}
        </div>
      )}
    </section>
  );
}

CommunityMemberDirectory.propTypes = {
  members: PropTypes.arrayOf(PropTypes.object),
  onMessageMember: PropTypes.func,
  isLoading: PropTypes.bool
};

