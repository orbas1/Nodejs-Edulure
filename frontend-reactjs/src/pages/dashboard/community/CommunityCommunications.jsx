import PropTypes from 'prop-types';
import { useCallback, useMemo, useState } from 'react';

import DashboardStateMessage from '../../../components/dashboard/DashboardStateMessage.jsx';
import usePersistentCollection from '../../../hooks/usePersistentCollection.js';
import useRoleGuard from '../../../hooks/useRoleGuard.js';

const createEmptyPost = () => ({
  community: '',
  author: '',
  title: '',
  summary: '',
  tagsInput: '',
  mediaUrl: '',
  postedAt: new Date().toISOString().slice(0, 16)
});

const createEmptyBroadcast = () => ({
  title: '',
  channel: 'Community feed',
  stage: 'Draft',
  release: new Date().toISOString().slice(0, 10),
  owner: ''
});

const createEmptyLeaderboardEntry = () => ({
  member: '',
  role: 'Contributor',
  points: 0,
  streak: 0,
  avatarUrl: ''
});

function serialiseTags(tags) {
  if (!tags) {
    return '';
  }
  if (Array.isArray(tags)) {
    return tags.join(', ');
  }
  return String(tags);
}

function parseTags(tagsInput) {
  return tagsInput
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export default function CommunityCommunications({ dashboard, onRefresh }) {
  const { allowed, explanation } = useRoleGuard(['community', 'admin']);
  const rawHighlights = useMemo(
    () => (Array.isArray(dashboard?.communications?.highlights) ? dashboard.communications.highlights : []),
    [dashboard?.communications?.highlights]
  );
  const initialPosts = useMemo(
    () =>
      rawHighlights.map((highlight) => ({
        id: highlight.id ?? `${highlight.community}-${highlight.postedAt}`,
        community: highlight.community ?? 'Community',
        author: highlight.owner ?? highlight.community ?? 'Team',
        title: highlight.preview,
        summary: highlight.preview,
        mediaUrl: highlight.mediaUrl ?? '',
        tags: Array.isArray(highlight.tags) ? highlight.tags : [],
        postedAt: highlight.postedAt ?? new Date().toISOString()
      })),
    [rawHighlights]
  );
  const initialBroadcasts = useMemo(
    () =>
      (Array.isArray(dashboard?.communications?.broadcasts)
        ? dashboard.communications.broadcasts
        : []
      ).map((broadcast) => ({
        id: broadcast.id ?? `${broadcast.title}-${broadcast.release}`,
        title: broadcast.title,
        channel: broadcast.channel,
        stage: broadcast.stage,
        release: broadcast.release,
        owner: broadcast.owner ?? 'Comms team'
      })),
    [dashboard?.communications?.broadcasts]
  );
  const initialLeaderboard = useMemo(
    () =>
      (Array.isArray(dashboard?.communications?.leaderboard)
        ? dashboard.communications.leaderboard
        : []
      ).map((entry) => ({
        id: entry.id ?? `${entry.member}-${entry.points}`,
        member: entry.member,
        role: entry.role ?? 'Contributor',
        points: Number(entry.points ?? 0),
        streak: Number(entry.streak ?? 0),
        avatarUrl: entry.avatarUrl ?? ''
      })),
    [dashboard?.communications?.leaderboard]
  );
  const trends = useMemo(
    () => (Array.isArray(dashboard?.communications?.trends) ? dashboard.communications.trends : []),
    [dashboard?.communications?.trends]
  );

  const {
    items: posts,
    addItem: addPost,
    updateItem: updatePost,
    removeItem: removePost,
    reset: resetPosts
  } = usePersistentCollection('edulure.community.feed', () => initialPosts);
  const {
    items: broadcasts,
    addItem: addBroadcast,
    updateItem: updateBroadcast,
    removeItem: removeBroadcast,
    reset: resetBroadcasts
  } = usePersistentCollection('edulure.community.broadcasts', () => initialBroadcasts);
  const {
    items: leaderboard,
    addItem: addLeaderboardEntry,
    updateItem: updateLeaderboardEntry,
    removeItem: removeLeaderboardEntry,
    reset: resetLeaderboard
  } = usePersistentCollection('edulure.community.leaderboard', () => initialLeaderboard);

  const [postDraft, setPostDraft] = useState(createEmptyPost);
  const [editingPostId, setEditingPostId] = useState(null);
  const [postFilter, setPostFilter] = useState('');

  const [broadcastDraft, setBroadcastDraft] = useState(createEmptyBroadcast);
  const [editingBroadcastId, setEditingBroadcastId] = useState(null);
  const [broadcastStageFilter, setBroadcastStageFilter] = useState('All');

  const [leaderboardDraft, setLeaderboardDraft] = useState(createEmptyLeaderboardEntry);
  const [editingLeaderboardId, setEditingLeaderboardId] = useState(null);

  const filteredPosts = useMemo(() => {
    if (!postFilter) {
      return posts;
    }
    const query = postFilter.toLowerCase();
    return posts.filter((post) => {
      const haystack = [post.community, post.author, post.title, post.summary, ...(post.tags ?? [])]
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [postFilter, posts]);

  const filteredBroadcasts = useMemo(() => {
    if (broadcastStageFilter === 'All') {
      return broadcasts;
    }
    return broadcasts.filter((broadcast) => broadcast.stage === broadcastStageFilter);
  }, [broadcastStageFilter, broadcasts]);

  const sortedLeaderboard = useMemo(
    () => [...leaderboard].sort((a, b) => b.points - a.points || b.streak - a.streak),
    [leaderboard]
  );

  const handleSubmitPost = useCallback(
    (event) => {
      event.preventDefault();
      const payload = {
        community: postDraft.community || 'General community',
        author: postDraft.author || 'Community manager',
        title: postDraft.title || 'Untitled update',
        summary: postDraft.summary,
        mediaUrl: postDraft.mediaUrl,
        tags: parseTags(postDraft.tagsInput),
        postedAt: postDraft.postedAt || new Date().toISOString().slice(0, 16)
      };

      if (editingPostId) {
        updatePost(editingPostId, payload);
      } else {
        addPost(payload);
      }

      setPostDraft(createEmptyPost());
      setEditingPostId(null);
    },
    [addPost, editingPostId, postDraft, updatePost]
  );

  const handleEditPost = useCallback((post) => {
    setEditingPostId(post.id);
    setPostDraft({
      community: post.community,
      author: post.author,
      title: post.title,
      summary: post.summary,
      mediaUrl: post.mediaUrl ?? '',
      postedAt: post.postedAt ? post.postedAt.slice(0, 16) : new Date().toISOString().slice(0, 16),
      tagsInput: serialiseTags(post.tags)
    });
  }, []);

  const handleCancelEditPost = useCallback(() => {
    setEditingPostId(null);
    setPostDraft(createEmptyPost());
  }, []);

  const handleSubmitBroadcast = useCallback(
    (event) => {
      event.preventDefault();
      const payload = {
        title: broadcastDraft.title || 'Untitled broadcast',
        channel: broadcastDraft.channel || 'Community feed',
        stage: broadcastDraft.stage || 'Draft',
        release: broadcastDraft.release || new Date().toISOString().slice(0, 10),
        owner: broadcastDraft.owner || 'Communications team'
      };

      if (editingBroadcastId) {
        updateBroadcast(editingBroadcastId, payload);
      } else {
        addBroadcast(payload);
      }

      setBroadcastDraft(createEmptyBroadcast());
      setEditingBroadcastId(null);
    },
    [addBroadcast, broadcastDraft, editingBroadcastId, updateBroadcast]
  );

  const handleEditBroadcast = useCallback((broadcast) => {
    setEditingBroadcastId(broadcast.id);
    setBroadcastDraft({
      title: broadcast.title,
      channel: broadcast.channel,
      stage: broadcast.stage,
      release: broadcast.release,
      owner: broadcast.owner
    });
  }, []);

  const handleCancelEditBroadcast = useCallback(() => {
    setEditingBroadcastId(null);
    setBroadcastDraft(createEmptyBroadcast());
  }, []);

  const handleSubmitLeaderboard = useCallback(
    (event) => {
      event.preventDefault();
      const payload = {
        member: leaderboardDraft.member || 'Community member',
        role: leaderboardDraft.role || 'Contributor',
        points: Number.isNaN(Number(leaderboardDraft.points)) ? 0 : Number(leaderboardDraft.points),
        streak: Number.isNaN(Number(leaderboardDraft.streak)) ? 0 : Number(leaderboardDraft.streak),
        avatarUrl: leaderboardDraft.avatarUrl
      };

      if (editingLeaderboardId) {
        updateLeaderboardEntry(editingLeaderboardId, payload);
      } else {
        addLeaderboardEntry(payload);
      }

      setLeaderboardDraft(createEmptyLeaderboardEntry());
      setEditingLeaderboardId(null);
    },
    [addLeaderboardEntry, editingLeaderboardId, leaderboardDraft, updateLeaderboardEntry]
  );

  const handleEditLeaderboard = useCallback((entry) => {
    setEditingLeaderboardId(entry.id);
    setLeaderboardDraft({
      member: entry.member,
      role: entry.role,
      points: entry.points,
      streak: entry.streak,
      avatarUrl: entry.avatarUrl ?? ''
    });
  }, []);

  const handleCancelEditLeaderboard = useCallback(() => {
    setEditingLeaderboardId(null);
    setLeaderboardDraft(createEmptyLeaderboardEntry());
  }, []);

  if (!allowed) {
    return (
      <DashboardStateMessage
        variant="error"
        title="Community privileges required"
        description={explanation ?? 'Switch to a community workspace to manage communications.'}
      />
    );
  }

  if (!dashboard) {
    return (
      <DashboardStateMessage
        title="Communications telemetry unavailable"
        description="We could not retrieve communications insights. Refresh to retry loading highlights and broadcast data."
        actionLabel="Refresh"
        onAction={onRefresh}
      />
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="dashboard-title">Communications hub</h1>
          <p className="dashboard-subtitle">
            Operate the live community feed, coordinate broadcast drops, and celebrate your most engaged members.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" className="dashboard-pill px-4 py-2" onClick={resetPosts}>
            Reset feed
          </button>
          <button type="button" className="dashboard-pill px-4 py-2" onClick={resetBroadcasts}>
            Reset broadcasts
          </button>
          <button type="button" className="dashboard-pill px-4 py-2" onClick={resetLeaderboard}>
            Reset leaderboard
          </button>
          <button type="button" className="dashboard-primary-pill" onClick={onRefresh}>
            Refresh engagement data
          </button>
        </div>
      </header>

      <section className="dashboard-section space-y-6">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="dashboard-kicker">Community feed</p>
            <h2 className="text-lg font-semibold text-slate-900">Publish updates, polls, and launches</h2>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="search"
              value={postFilter}
              onChange={(event) => setPostFilter(event.target.value)}
              placeholder="Search posts"
              className="dashboard-input h-10"
            />
            {editingPostId ? (
              <button type="button" className="dashboard-pill px-4 py-2" onClick={handleCancelEditPost}>
                Cancel edit
              </button>
            ) : null}
          </div>
        </header>

        <form className="grid gap-4 rounded-2xl border border-slate-200 bg-white/60 p-5" onSubmit={handleSubmitPost}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-1 text-sm text-slate-600">
              Community space
              <input
                type="text"
                required
                value={postDraft.community}
                onChange={(event) => setPostDraft((previous) => ({ ...previous, community: event.target.value }))}
                className="dashboard-input"
              />
            </label>
            <label className="grid gap-1 text-sm text-slate-600">
              Author or team
              <input
                type="text"
                required
                value={postDraft.author}
                onChange={(event) => setPostDraft((previous) => ({ ...previous, author: event.target.value }))}
                className="dashboard-input"
              />
            </label>
          </div>
          <label className="grid gap-1 text-sm text-slate-600">
            Headline
            <input
              type="text"
              required
              value={postDraft.title}
              onChange={(event) => setPostDraft((previous) => ({ ...previous, title: event.target.value }))}
              className="dashboard-input"
            />
          </label>
          <label className="grid gap-1 text-sm text-slate-600">
            Summary
            <textarea
              required
              rows={3}
              value={postDraft.summary}
              onChange={(event) => setPostDraft((previous) => ({ ...previous, summary: event.target.value }))}
              className="dashboard-input resize-y"
            />
          </label>
          <div className="grid gap-4 md:grid-cols-3">
            <label className="grid gap-1 text-sm text-slate-600">
              Tag keywords
              <input
                type="text"
                value={postDraft.tagsInput}
                placeholder="product, launch"
                onChange={(event) => setPostDraft((previous) => ({ ...previous, tagsInput: event.target.value }))}
                className="dashboard-input"
              />
            </label>
            <label className="grid gap-1 text-sm text-slate-600">
              Featured media URL
              <input
                type="url"
                value={postDraft.mediaUrl}
                placeholder="https://cdn.edulure.io/launch.jpg"
                onChange={(event) => setPostDraft((previous) => ({ ...previous, mediaUrl: event.target.value }))}
                className="dashboard-input"
              />
            </label>
            <label className="grid gap-1 text-sm text-slate-600">
              Publish at
              <input
                type="datetime-local"
                value={postDraft.postedAt}
                onChange={(event) => setPostDraft((previous) => ({ ...previous, postedAt: event.target.value }))}
                className="dashboard-input"
              />
            </label>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3">
            <button type="submit" className="dashboard-primary-pill px-6 py-2">
              {editingPostId ? 'Update post' : 'Publish to feed'}
            </button>
          </div>
        </form>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredPosts.map((post) => (
            <article key={post.id} className="rounded-2xl border border-slate-200 bg-white/70 p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">{post.community}</p>
              <h3 className="mt-2 text-base font-semibold text-slate-900">{post.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{post.summary}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span>{post.author}</span>
                <span>•</span>
                <span>{new Date(post.postedAt).toLocaleString()}</span>
              </div>
              {post.mediaUrl ? (
                <a
                  href={post.mediaUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 block text-xs font-semibold text-primary hover:underline"
                >
                  View attached media
                </a>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-primary">
                {Array.isArray(post.tags) && post.tags.length > 0
                  ? post.tags.map((tag) => (
                      <span key={`${post.id}-${tag}`} className="rounded-full bg-primary/10 px-3 py-1">#{tag}</span>
                    ))
                  : (
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-500">No tags</span>
                    )}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" className="dashboard-pill px-3 py-1" onClick={() => handleEditPost(post)}>
                  Edit
                </button>
                <button
                  type="button"
                  className="dashboard-pill border-transparent bg-rose-50 px-3 py-1 text-rose-600 hover:border-rose-200"
                  onClick={() => removePost(post.id)}
                >
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
        {filteredPosts.length === 0 ? (
          <DashboardStateMessage
            title="No feed activity matches your filters"
            description="Adjust your search or publish a new post to activate the community feed."
          />
        ) : null}
      </section>

      <section className="dashboard-section space-y-6">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="dashboard-kicker">Broadcast pipeline</p>
            <h2 className="text-lg font-semibold text-slate-900">Plan announcements and drops</h2>
          </div>
          <div className="flex items-center gap-3">
            <select
              className="dashboard-input h-10"
              value={broadcastStageFilter}
              onChange={(event) => setBroadcastStageFilter(event.target.value)}
            >
              <option value="All">All stages</option>
              <option value="Draft">Draft</option>
              <option value="Scheduled">Scheduled</option>
              <option value="Live">Live</option>
              <option value="Complete">Complete</option>
            </select>
            {editingBroadcastId ? (
              <button type="button" className="dashboard-pill px-4 py-2" onClick={handleCancelEditBroadcast}>
                Cancel edit
              </button>
            ) : null}
          </div>
        </header>

        <form className="grid gap-4 rounded-2xl border border-slate-200 bg-white/60 p-5" onSubmit={handleSubmitBroadcast}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-1 text-sm text-slate-600">
              Broadcast title
              <input
                type="text"
                required
                value={broadcastDraft.title}
                onChange={(event) => setBroadcastDraft((previous) => ({ ...previous, title: event.target.value }))}
                className="dashboard-input"
              />
            </label>
            <label className="grid gap-1 text-sm text-slate-600">
              Channel
              <input
                type="text"
                required
                value={broadcastDraft.channel}
                onChange={(event) => setBroadcastDraft((previous) => ({ ...previous, channel: event.target.value }))}
                className="dashboard-input"
              />
            </label>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <label className="grid gap-1 text-sm text-slate-600">
              Stage
              <select
                className="dashboard-input"
                value={broadcastDraft.stage}
                onChange={(event) => setBroadcastDraft((previous) => ({ ...previous, stage: event.target.value }))}
              >
                <option value="Draft">Draft</option>
                <option value="Scheduled">Scheduled</option>
                <option value="Live">Live</option>
                <option value="Complete">Complete</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm text-slate-600">
              Release date
              <input
                type="date"
                value={broadcastDraft.release}
                onChange={(event) => setBroadcastDraft((previous) => ({ ...previous, release: event.target.value }))}
                className="dashboard-input"
              />
            </label>
            <label className="grid gap-1 text-sm text-slate-600">
              Owner
              <input
                type="text"
                value={broadcastDraft.owner}
                onChange={(event) => setBroadcastDraft((previous) => ({ ...previous, owner: event.target.value }))}
                className="dashboard-input"
              />
            </label>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3">
            <button type="submit" className="dashboard-primary-pill px-6 py-2">
              {editingBroadcastId ? 'Update broadcast' : 'Add to pipeline'}
            </button>
          </div>
        </form>

        <ul className="space-y-4">
          {filteredBroadcasts.map((broadcast) => (
            <li key={broadcast.id} className="rounded-2xl border border-slate-200 bg-white/70 p-5 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{broadcast.title}</p>
                  <p className="mt-1 text-xs text-slate-500">Channel: {broadcast.channel}</p>
                  <p className="mt-1 text-xs text-slate-500">Owner: {broadcast.owner}</p>
                </div>
                <div className="flex flex-col items-end gap-2 text-xs text-slate-500">
                  <span className="dashboard-pill px-3 py-1 uppercase tracking-wide">{broadcast.stage}</span>
                  <span>Release {broadcast.release}</span>
                  <div className="flex gap-2">
                    <button type="button" className="dashboard-pill px-3 py-1" onClick={() => handleEditBroadcast(broadcast)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      className="dashboard-pill border-transparent bg-rose-50 px-3 py-1 text-rose-600 hover:border-rose-200"
                      onClick={() => removeBroadcast(broadcast.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
        {filteredBroadcasts.length === 0 ? (
          <DashboardStateMessage
            title="No broadcasts scheduled"
            description="Add an announcement to the pipeline or change the stage filter to view archived drops."
          />
        ) : null}
      </section>

      <section className="dashboard-section space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="dashboard-kicker">Leaderboard</p>
            <h2 className="text-lg font-semibold text-slate-900">Celebrate engaged community members</h2>
          </div>
          <div className="text-sm text-slate-600">
            Total points distributed this month:{' '}
            <span className="font-semibold text-primary">
              {sortedLeaderboard.reduce((total, entry) => total + Number(entry.points ?? 0), 0)}
            </span>
          </div>
        </div>

        <form className="grid gap-4 rounded-2xl border border-slate-200 bg-white/60 p-5" onSubmit={handleSubmitLeaderboard}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-1 text-sm text-slate-600">
              Member name
              <input
                type="text"
                required
                value={leaderboardDraft.member}
                onChange={(event) => setLeaderboardDraft((previous) => ({ ...previous, member: event.target.value }))}
                className="dashboard-input"
              />
            </label>
            <label className="grid gap-1 text-sm text-slate-600">
              Role
              <input
                type="text"
                value={leaderboardDraft.role}
                onChange={(event) => setLeaderboardDraft((previous) => ({ ...previous, role: event.target.value }))}
                className="dashboard-input"
              />
            </label>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <label className="grid gap-1 text-sm text-slate-600">
              Points
              <input
                type="number"
                min="0"
                value={leaderboardDraft.points}
                onChange={(event) => setLeaderboardDraft((previous) => ({ ...previous, points: event.target.value }))}
                className="dashboard-input"
              />
            </label>
            <label className="grid gap-1 text-sm text-slate-600">
              Streak (days)
              <input
                type="number"
                min="0"
                value={leaderboardDraft.streak}
                onChange={(event) => setLeaderboardDraft((previous) => ({ ...previous, streak: event.target.value }))}
                className="dashboard-input"
              />
            </label>
            <label className="grid gap-1 text-sm text-slate-600">
              Avatar URL
              <input
                type="url"
                value={leaderboardDraft.avatarUrl}
                onChange={(event) => setLeaderboardDraft((previous) => ({ ...previous, avatarUrl: event.target.value }))}
                className="dashboard-input"
              />
            </label>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3">
            {editingLeaderboardId ? (
              <button type="button" className="dashboard-pill px-4 py-2" onClick={handleCancelEditLeaderboard}>
                Cancel edit
              </button>
            ) : null}
            <button type="submit" className="dashboard-primary-pill px-6 py-2">
              {editingLeaderboardId ? 'Update member' : 'Add member to leaderboard'}
            </button>
          </div>
        </form>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sortedLeaderboard.map((entry, index) => (
            <article key={entry.id} className="rounded-2xl border border-slate-200 bg-white/70 p-4 text-sm shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
                  #{index + 1}
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{entry.member}</p>
                  <p className="text-xs uppercase tracking-wide text-slate-500">{entry.role}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                <span>{entry.points} pts</span>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700">{entry.streak}-day streak</span>
              </div>
              {entry.avatarUrl ? (
                <img
                  src={entry.avatarUrl}
                  alt="Member avatar"
                  className="mt-3 h-20 w-full rounded-xl object-cover"
                  loading="lazy"
                />
              ) : null}
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" className="dashboard-pill px-3 py-1" onClick={() => handleEditLeaderboard(entry)}>
                  Edit
                </button>
                <button
                  type="button"
                  className="dashboard-pill border-transparent bg-rose-50 px-3 py-1 text-rose-600 hover:border-rose-200"
                  onClick={() => removeLeaderboardEntry(entry.id)}
                >
                  Remove
                </button>
              </div>
            </article>
          ))}
        </div>
        {sortedLeaderboard.length === 0 ? (
          <DashboardStateMessage
            title="No leaderboard entries"
            description="Celebrate your community by adding top contributors to the monthly leaderboard."
          />
        ) : null}
      </section>

      <section className="dashboard-section space-y-4">
        <div>
          <p className="dashboard-kicker">Engagement trends</p>
          <h2 className="text-lg font-semibold text-slate-900">Community sentiment</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {trends.map((trend) => (
            <div key={trend.id} className="rounded-2xl border border-slate-200 p-4">
              <p className="text-sm font-semibold text-slate-900">{trend.metric}</p>
              <p className="mt-1 text-xs text-slate-500">Current: {trend.current}</p>
              <p className="mt-1 text-xs text-slate-500">Previous: {trend.previous}</p>
            </div>
          ))}
          {trends.length === 0 ? (
            <DashboardStateMessage
              title="No trend data"
              description="Once participation telemetry is active we will surface trend deltas across each community."
            />
          ) : null}
        </div>
      </section>
    </div>
  );
}

CommunityCommunications.propTypes = {
  dashboard: PropTypes.object,
  onRefresh: PropTypes.func
};

CommunityCommunications.defaultProps = {
  dashboard: null,
  onRefresh: undefined
};
