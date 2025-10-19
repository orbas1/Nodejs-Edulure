import { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import {
  ArrowTopRightOnSquareIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  LinkIcon,
  PencilSquareIcon,
  PlusIcon,
  StarIcon,
  TrophyIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';

import usePersistentCollection from '../../hooks/usePersistentCollection.js';

const fallbackCommunity = {
  name: 'Edulure Growth Architects',
  slug: 'edulure-growth-architects',
  description:
    'Revenue, learning, and operations teams co-building high-trust launches, async rituals, and monetisation experiments.',
  coverImageUrl: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80',
  avatarUrl: 'https://randomuser.me/api/portraits/women/68.jpg',
  avatar: 'https://randomuser.me/api/portraits/women/68.jpg',
  websiteUrl: 'https://app.edulure.com/communities/growth-architects',
  stats: {
    members: 2187,
    online: 268,
    admins: 14
  },
  membership: {
    status: 'non-member',
    role: 'non-member'
  }
};

const defaultLinks = [
  { id: 'link-1', label: 'Orientation deck', url: 'https://files.edulure.com/community/orientation.pdf' },
  { id: 'link-2', label: 'Moderator handbook', url: 'https://files.edulure.com/community/moderator-handbook.pdf' }
];

const defaultSpotlights = [
  {
    id: 'spotlight-1',
    title: '30-day retention',
    value: '96%',
    description: 'Members returning across async rituals and live pods.'
  },
  {
    id: 'spotlight-2',
    title: 'Revenue lab velocity',
    value: '14 days',
    description: 'Average time from idea to experiment launch.'
  }
];

function QuickLinkForm({ link, onSubmit, onCancel }) {
  const [formState, setFormState] = useState(() => ({
    label: link?.label ?? '',
    url: link?.url ?? ''
  }));

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormState((previous) => ({ ...previous, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit?.(formState);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <label className="space-y-1 text-xs font-semibold text-slate-600">
        Label
        <input
          type="text"
          name="label"
          required
          value={formState.label}
          onChange={handleChange}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </label>
      <label className="space-y-1 text-xs font-semibold text-slate-600">
        URL
        <input
          type="url"
          name="url"
          required
          value={formState.url}
          onChange={handleChange}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </label>
      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-slate-200 px-3 py-1 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-100"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-primary-dark"
        >
          <CheckCircleIcon className="h-4 w-4" /> Save link
        </button>
      </div>
    </form>
  );
}

QuickLinkForm.propTypes = {
  link: PropTypes.object,
  onSubmit: PropTypes.func,
  onCancel: PropTypes.func
};

QuickLinkForm.defaultProps = {
  link: null,
  onSubmit: undefined,
  onCancel: undefined
};

function SpotlightForm({ spotlight, onSubmit, onCancel }) {
  const [formState, setFormState] = useState(() => ({
    title: spotlight?.title ?? '',
    value: spotlight?.value ?? '',
    description: spotlight?.description ?? ''
  }));

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormState((previous) => ({ ...previous, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit?.(formState);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <label className="space-y-1 text-xs font-semibold text-slate-600">
        Title
        <input
          type="text"
          name="title"
          required
          value={formState.title}
          onChange={handleChange}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </label>
      <label className="space-y-1 text-xs font-semibold text-slate-600">
        Value
        <input
          type="text"
          name="value"
          required
          value={formState.value}
          onChange={handleChange}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </label>
      <label className="space-y-1 text-xs font-semibold text-slate-600">
        Description
        <textarea
          name="description"
          rows={3}
          value={formState.description}
          onChange={handleChange}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </label>
      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-slate-200 px-3 py-1 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-100"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-primary-dark"
        >
          <CheckCircleIcon className="h-4 w-4" /> Save spotlight
        </button>
      </div>
    </form>
  );
}

SpotlightForm.propTypes = {
  spotlight: PropTypes.object,
  onSubmit: PropTypes.func,
  onCancel: PropTypes.func
};

SpotlightForm.defaultProps = {
  spotlight: null,
  onSubmit: undefined,
  onCancel: undefined
};

function StatPill({ label, value }) {
  return (
    <div className="space-y-2 rounded-3xl border border-slate-200 bg-white/80 p-4 text-center shadow-sm">
      <p className="text-2xl font-semibold text-primary">{value}</p>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
    </div>
  );
}

StatPill.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired
};

export default function CommunityAboutPanel({
  communityId,
  community,
  leaderboard,
  onJoin,
  onLeave,
  isJoining,
  isLeaving,
  joinError,
  leaveError,
  canJoin,
  canLeave
}) {
  const storageNamespace = communityId ? `community:${communityId}` : 'community:preview';

  const resolvedCommunity = useMemo(() => ({
    ...fallbackCommunity,
    ...(community ?? {})
  }), [community]);

  const {
    items: quickLinks,
    addItem: addLink,
    updateItem: updateLink,
    removeItem: removeLink
  } = usePersistentCollection(`${storageNamespace}:about:links`, defaultLinks);

  const {
    items: spotlights,
    addItem: addSpotlight,
    updateItem: updateSpotlight,
    removeItem: removeSpotlight
  } = usePersistentCollection(`${storageNamespace}:about:spotlights`, defaultSpotlights);

  const [linkDraft, setLinkDraft] = useState(null);
  const [spotlightDraft, setSpotlightDraft] = useState(null);

  const stats = {
    members: resolvedCommunity.stats?.members ?? fallbackCommunity.stats.members,
    online: resolvedCommunity.stats?.online ?? fallbackCommunity.stats.online,
    admins: resolvedCommunity.stats?.admins ?? fallbackCommunity.stats.admins
  };

  const membershipStatus = resolvedCommunity.membership?.status ?? 'non-member';
  const isMember = membershipStatus === 'member' || membershipStatus === 'active';

  const handleSaveLink = (payload) => {
    if (linkDraft?.id) {
      updateLink(linkDraft.id, { ...linkDraft, ...payload });
    } else {
      addLink(payload);
    }
    setLinkDraft(null);
  };

  const handleSaveSpotlight = (payload) => {
    if (spotlightDraft?.id) {
      updateSpotlight(spotlightDraft.id, { ...spotlightDraft, ...payload });
    } else {
      addSpotlight(payload);
    }
    setSpotlightDraft(null);
  };

  const topLeaderboard = Array.isArray(leaderboard) && leaderboard.length ? leaderboard.slice(0, 5) : [];

  return (
    <section className="space-y-6 rounded-4xl border border-slate-200 bg-white/80 p-6 shadow-xl">
      <div className="overflow-hidden rounded-3xl border border-slate-200 shadow-sm">
        <div
          className="relative h-32 bg-cover bg-center"
          style={{ backgroundImage: `url(${resolvedCommunity.coverImageUrl})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-slate-950/70 via-slate-900/50 to-primary/40" />
        </div>
        <div className="space-y-4 bg-white/95 p-6">
          <div className="flex items-start gap-4">
            <img
              src={resolvedCommunity.avatarUrl || resolvedCommunity.avatar}
              alt="Community avatar"
              className="h-16 w-16 flex-shrink-0 rounded-2xl border-4 border-white object-cover shadow-lg"
            />
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold text-slate-900">{resolvedCommunity.name}</h2>
                <span className="rounded-full bg-slate-900/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  {resolvedCommunity.slug}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-600">{resolvedCommunity.description}</p>
              {resolvedCommunity.websiteUrl ? (
                <a
                  href={resolvedCommunity.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-primary"
                >
                  Visit site <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                </a>
              ) : null}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <StatPill label="Members" value={stats.members} />
            <StatPill label="Online now" value={stats.online} />
            <StatPill label="Admins" value={stats.admins} />
          </div>
          <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold text-slate-500">
            <span className="rounded-full bg-primary/10 px-3 py-1 text-primary">{resolvedCommunity.membership?.role ?? 'Guest'}</span>
            <span className="rounded-full bg-slate-900/5 px-3 py-1">Status: {membershipStatus}</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {isMember && canLeave && onLeave ? (
              <button
                type="button"
                onClick={onLeave}
                disabled={isLeaving}
                className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLeaving ? 'Leaving…' : 'Leave community'}
              </button>
            ) : null}
            {!isMember && canJoin && onJoin ? (
              <button
                type="button"
                onClick={onJoin}
                disabled={isJoining}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isJoining ? 'Joining…' : 'Join community'}
              </button>
            ) : null}
          </div>
          {joinError ? (
            <p className="flex items-center gap-2 text-xs font-semibold text-rose-600">
              <ExclamationTriangleIcon className="h-4 w-4" /> {joinError}
            </p>
          ) : null}
          {leaveError ? (
            <p className="flex items-center gap-2 text-xs font-semibold text-rose-600">
              <ExclamationTriangleIcon className="h-4 w-4" /> {leaveError}
            </p>
          ) : null}
        </div>
      </div>

      <div className="space-y-4 rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">Quick links</p>
            <h3 className="text-sm font-semibold text-slate-900">Resources & orientation</h3>
          </div>
          <button
            type="button"
            onClick={() => setLinkDraft({})}
            className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary transition hover:bg-primary/20"
          >
            <PlusIcon className="h-4 w-4" /> Add
          </button>
        </div>
        {linkDraft ? (
          <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
            <QuickLinkForm link={linkDraft.id ? linkDraft : null} onSubmit={handleSaveLink} onCancel={() => setLinkDraft(null)} />
          </div>
        ) : null}
        <ul className="space-y-3 text-sm text-slate-600">
          {quickLinks.map((link) => (
            <li key={link.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 px-3 py-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">{link.label}</p>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-xs font-semibold text-primary"
                >
                  {link.url}
                  <LinkIcon className="h-4 w-4" />
                </a>
              </div>
              <button
                type="button"
                onClick={() => setLinkDraft(link)}
                className="inline-flex items-center gap-2 rounded-full bg-slate-900/5 px-3 py-1 text-[11px] font-semibold text-slate-500 transition hover:bg-slate-200"
              >
                <PencilSquareIcon className="h-4 w-4" /> Edit
              </button>
              <button
                type="button"
                onClick={() => removeLink(link.id)}
                className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1 text-[11px] font-semibold text-rose-600 transition hover:bg-rose-100"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-4 rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">Spotlights</p>
            <h3 className="text-sm font-semibold text-slate-900">Signals the team is proud of</h3>
          </div>
          <button
            type="button"
            onClick={() => setSpotlightDraft({})}
            className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary transition hover:bg-primary/20"
          >
            <PlusIcon className="h-4 w-4" /> Add
          </button>
        </div>
        {spotlightDraft ? (
          <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
            <SpotlightForm
              spotlight={spotlightDraft.id ? spotlightDraft : null}
              onSubmit={handleSaveSpotlight}
              onCancel={() => setSpotlightDraft(null)}
            />
          </div>
        ) : null}
        <ul className="space-y-3">
          {spotlights.map((spotlight) => (
            <li key={spotlight.id} className="flex items-start justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 px-3 py-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">{spotlight.title}</p>
                <p className="text-xl font-semibold text-primary">{spotlight.value}</p>
                <p className="mt-1 text-xs text-slate-500">{spotlight.description}</p>
              </div>
              <div className="flex flex-col gap-2 text-[11px] font-semibold text-slate-500">
                <button
                  type="button"
                  onClick={() => setSpotlightDraft(spotlight)}
                  className="inline-flex items-center gap-2 rounded-full bg-slate-900/5 px-3 py-1 transition hover:bg-slate-200"
                >
                  <PencilSquareIcon className="h-4 w-4" /> Edit
                </button>
                <button
                  type="button"
                  onClick={() => removeSpotlight(spotlight.id)}
                  className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1 text-rose-600 transition hover:bg-rose-100"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">30 day leaderboard</p>
            <h3 className="text-sm font-semibold text-slate-900">Accountability streaks</h3>
          </div>
          <TrophyIcon className="h-5 w-5 text-primary" />
        </div>
        <div className="mt-4 space-y-3">
          {topLeaderboard.length === 0 ? (
            <p className="text-sm text-slate-500">No leaderboard data available yet.</p>
          ) : (
            topLeaderboard.map((entry) => (
              <div key={entry.rank ?? entry.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 px-3 py-3">
                <div className="flex items-center gap-3 text-sm text-slate-700">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    #{entry.rank ?? '?'}
                  </span>
                  <div>
                    <p className="font-semibold text-slate-900">{entry.name}</p>
                    <p className="text-xs text-slate-500">{entry.role}</p>
                  </div>
                </div>
                <div className="text-right text-xs font-semibold text-slate-500">
                  <p>{entry.points ?? '—'} pts</p>
                  {entry.change ? <p className="text-emerald-600">{entry.change}</p> : null}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-500">
        <p className="flex items-center gap-2">
          <UserGroupIcon className="h-4 w-4" /> Maintain this panel locally to prep for production roll-outs.
        </p>
        <p className="flex items-center gap-2">
          <StarIcon className="h-4 w-4 text-primary" /> All edits persist in your browser for safe iteration.
        </p>
      </footer>
    </section>
  );
}

CommunityAboutPanel.propTypes = {
  communityId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  community: PropTypes.object,
  leaderboard: PropTypes.array,
  onJoin: PropTypes.func,
  onLeave: PropTypes.func,
  isJoining: PropTypes.bool,
  isLeaving: PropTypes.bool,
  joinError: PropTypes.string,
  leaveError: PropTypes.string,
  canJoin: PropTypes.bool,
  canLeave: PropTypes.bool
};

CommunityAboutPanel.defaultProps = {
  communityId: 'preview',
  community: null,
  leaderboard: undefined,
  onJoin: undefined,
  onLeave: undefined,
  isJoining: false,
  isLeaving: false,
  joinError: null,
  leaveError: null,
  canJoin: true,
  canLeave: false
};
