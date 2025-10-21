import { useCallback, useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';

import DashboardActionFeedback from '../../components/dashboard/DashboardActionFeedback.jsx';
import DashboardStateMessage from '../../components/dashboard/DashboardStateMessage.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { fetchCommunities } from '../../api/communityApi.js';
import withInstructorDashboardAccess from './instructor/withInstructorDashboardAccess.jsx';
import {
  createCommunityPodcastEpisode,
  deleteCommunityPodcastEpisode,
  listCommunityPodcastEpisodes,
  updateCommunityPodcastEpisode
} from '../../api/communityProgrammingApi.js';

const STAGE_OPTIONS = ['Planning', 'Recording', 'Editing', 'QA', 'Scheduled', 'Live', 'Archived'];

const createEpisodeDraft = () => ({
  episode: '',
  stage: 'Planning',
  release: new Date().toISOString().slice(0, 10),
  host: '',
  duration: 30,
  summary: '',
  audioUrl: '',
  coverArtUrl: ''
});

const createLoadState = () => ({
  items: [],
  pagination: { total: 0, count: 0, limit: 0, offset: 0 },
  loading: false,
  error: null
});

const normalisePagination = (pagination, fallbackCount = 0) => ({
  total: typeof pagination?.total === 'number' ? pagination.total : fallbackCount,
  count: typeof pagination?.count === 'number' ? pagination.count : fallbackCount,
  limit:
    typeof pagination?.limit === 'number'
      ? pagination.limit
      : fallbackCount > 0
        ? fallbackCount
        : 0,
  offset: typeof pagination?.offset === 'number' ? pagination.offset : 0
});

function normaliseEpisode(episode) {
  const stageValue = String(episode.stage ?? 'planning').toLowerCase();
  const stageLabel = stageValue.charAt(0).toUpperCase() + stageValue.slice(1);
  const release = episode.releaseOn ?? episode.release ?? new Date().toISOString().slice(0, 10);
  return {
    id: episode.id ?? `${episode.title}-${release}`,
    episode: episode.title ?? episode.episode ?? 'Untitled episode',
    stage: stageLabel,
    stageValue,
    release,
    host: episode.host ?? 'Community host',
    duration: Number(episode.durationMinutes ?? episode.duration ?? 0),
    summary: episode.summary ?? '',
    audioUrl: episode.audioUrl ?? '',
    coverArtUrl: episode.coverArtUrl ?? '',
    permissions: episode.permissions ?? { canEdit: true }
  };
}

function InstructorCommunityPodcasts() {
  const { dashboard, refresh } = useOutletContext();
  const { session, isAuthenticated } = useAuth();
  const token = session?.tokens?.accessToken ?? null;

  const [communitiesState, setCommunitiesState] = useState({ items: [], loading: false, error: null });
  const [selectedCommunityId, setSelectedCommunityId] = useState(null);

  const [episodesState, setEpisodesState] = useState(createLoadState);
  const [draft, setDraft] = useState(createEpisodeDraft);
  const [editingId, setEditingId] = useState(null);
  const [stageFilter, setStageFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [saving, setSaving] = useState(false);

  const loadCommunities = useCallback(async () => {
    if (!token || !isAuthenticated) {
      setCommunitiesState({ items: [], loading: false, error: null });
      setSelectedCommunityId(null);
      return;
    }
    setCommunitiesState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await fetchCommunities(token);
      const items = Array.isArray(response.data) ? response.data : [];
      setCommunitiesState({ items, loading: false, error: null });
      setSelectedCommunityId((current) => {
        if (current && items.some((community) => String(community.id) === String(current))) {
          return current;
        }
        return items[0] ? String(items[0].id) : null;
      });
    } catch (error) {
      setCommunitiesState({ items: [], loading: false, error });
      setSelectedCommunityId(null);
    }
  }, [isAuthenticated, token]);

  useEffect(() => {
    loadCommunities();
  }, [loadCommunities]);

  const loadEpisodes = useCallback(
    async (communityId, { showFeedback = false } = {}) => {
      if (!token || !communityId) {
        setEpisodesState(createLoadState());
        return;
      }
      setEpisodesState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const response = await listCommunityPodcastEpisodes({
          communityId,
          token,
          params: { order: 'desc', limit: 200 }
        });
        const items = response.data.map(normaliseEpisode);
        setEpisodesState({
          items,
          pagination: normalisePagination(response.pagination, items.length),
          loading: false,
          error: null
        });
        if (showFeedback) {
          setFeedback({ tone: 'success', message: 'Podcast studio synced successfully.' });
        }
      } catch (error) {
        setEpisodesState({
          items: [],
          pagination: normalisePagination(null, 0),
          loading: false,
          error
        });
      }
    },
    [token]
  );

  useEffect(() => {
    if (selectedCommunityId) {
      loadEpisodes(selectedCommunityId);
    } else {
      setEpisodesState(createLoadState());
    }
  }, [loadEpisodes, selectedCommunityId]);

  useEffect(() => {
    if (Array.isArray(dashboard?.communities?.podcasts) && episodesState.items.length === 0 && selectedCommunityId) {
      const seeded = dashboard.communities.podcasts.map(normaliseEpisode);
      setEpisodesState({
        items: seeded,
        pagination: normalisePagination(null, seeded.length),
        loading: false,
        error: null
      });
    }
  }, [dashboard?.communities?.podcasts, episodesState.items.length, selectedCommunityId]);

  const productionStats = useMemo(() => {
    const totalMinutes = episodesState.items.reduce((total, episode) => total + Number(episode.duration ?? 0), 0);
    const byStage = episodesState.items.reduce((acc, episode) => {
      const stage = episode.stage;
      acc[stage] = (acc[stage] ?? 0) + 1;
      return acc;
    }, {});
    const totalEpisodes = episodesState.pagination.total ?? episodesState.items.length;
    return { totalMinutes, byStage, totalEpisodes };
  }, [episodesState.items, episodesState.pagination.total]);

  const filteredEpisodes = useMemo(() => {
    return episodesState.items.filter((episode) => {
      const matchesStage = stageFilter === 'All' || episode.stage === stageFilter;
      if (!matchesStage) {
        return false;
      }
      if (!searchTerm) {
        return true;
      }
      const query = searchTerm.toLowerCase();
      return [episode.episode, episode.host, episode.summary]
        .join(' ')
        .toLowerCase()
        .includes(query);
    });
  }, [episodesState.items, searchTerm, stageFilter]);

  const handleEdit = useCallback((episode) => {
    setEditingId(episode.id);
    setDraft({
      episode: episode.episode,
      stage: episode.stage,
      release: episode.release,
      host: episode.host,
      duration: episode.duration,
      summary: episode.summary,
      audioUrl: episode.audioUrl,
      coverArtUrl: episode.coverArtUrl
    });
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingId(null);
    setDraft(createEpisodeDraft());
  }, []);

  const handleSubmit = useCallback(
    async (event) => {
      event.preventDefault();
      if (!selectedCommunityId || !token) {
        setFeedback({ tone: 'error', message: 'Select a community to manage podcast episodes.' });
        return;
      }
      const payload = {
        title: draft.episode || 'Untitled episode',
        host: draft.host || 'Community host',
        stage: draft.stage.toLowerCase(),
        releaseOn: draft.release || null,
        durationMinutes: Number.isNaN(Number(draft.duration)) ? 0 : Number(draft.duration),
        summary: draft.summary || undefined,
        audioUrl: draft.audioUrl || undefined,
        coverArtUrl: draft.coverArtUrl || undefined
      };

      setSaving(true);
      try {
        if (editingId) {
          await updateCommunityPodcastEpisode({
            communityId: selectedCommunityId,
            episodeId: editingId,
            token,
            payload
          });
          setFeedback({ tone: 'success', message: 'Episode updated successfully.' });
        } else {
          await createCommunityPodcastEpisode({ communityId: selectedCommunityId, token, payload });
          setFeedback({ tone: 'success', message: 'Episode added to the production studio.' });
        }
        setDraft(createEpisodeDraft());
        setEditingId(null);
        await loadEpisodes(selectedCommunityId);
      } catch (error) {
        setFeedback({ tone: 'error', message: error?.message ?? 'Unable to save episode. Please try again.' });
      } finally {
        setSaving(false);
      }
    },
    [draft, editingId, loadEpisodes, selectedCommunityId, token]
  );

  const handleAdvanceStage = useCallback(
    async (episode) => {
      if (!episode?.id || !selectedCommunityId || !token) return;
      const currentIndex = STAGE_OPTIONS.indexOf(episode.stage);
      const nextStage = STAGE_OPTIONS[Math.min(STAGE_OPTIONS.length - 1, currentIndex + 1)];
      try {
        await updateCommunityPodcastEpisode({
          communityId: selectedCommunityId,
          episodeId: episode.id,
          token,
          payload: { stage: nextStage.toLowerCase() }
        });
        await loadEpisodes(selectedCommunityId);
        setFeedback({ tone: 'success', message: 'Episode advanced to the next production stage.' });
      } catch (error) {
        setFeedback({ tone: 'error', message: error?.message ?? 'Unable to advance stage.' });
      }
    },
    [loadEpisodes, selectedCommunityId, token]
  );

  const handleDelete = useCallback(
    async (episodeId) => {
      if (!selectedCommunityId || !token) return;
      try {
        await deleteCommunityPodcastEpisode({ communityId: selectedCommunityId, episodeId, token });
        await loadEpisodes(selectedCommunityId);
        setFeedback({ tone: 'success', message: 'Episode removed from the studio.' });
        if (editingId === episodeId) {
          handleCancelEdit();
        }
      } catch (error) {
        setFeedback({ tone: 'error', message: error?.message ?? 'Unable to delete episode.' });
      }
    },
    [editingId, handleCancelEdit, loadEpisodes, selectedCommunityId, token]
  );

  const handleReset = useCallback(() => {
    setStageFilter('All');
    setSearchTerm('');
    setDraft(createEpisodeDraft());
    setEditingId(null);
    if (selectedCommunityId) {
      loadEpisodes(selectedCommunityId, { showFeedback: true });
    }
  }, [loadEpisodes, selectedCommunityId]);

  const productionTotals = useMemo(() => {
    const stageSummary = {};
    STAGE_OPTIONS.forEach((stage) => {
      stageSummary[stage] = productionStats.byStage[stage] ?? 0;
    });
    return stageSummary;
  }, [productionStats.byStage]);

  const isAuthenticatedInstructor = Boolean(token && isAuthenticated);

  if (!isAuthenticatedInstructor) {
    return (
      <DashboardStateMessage
        title="Instructor session required"
        description="Sign in with an instructor account to manage podcast production."
        actionLabel="Back"
        onAction={() => window.history.back()}
      />
    );
  }

  return (
    <div className="space-y-8">
      <DashboardActionFeedback feedback={feedback} onDismiss={() => setFeedback(null)} />

      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Community podcast studio</h1>
          <p className="mt-2 text-sm text-slate-600">
            Track production stages, host assignments, and publish-ready assets for every episode.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" className="dashboard-pill px-4 py-2" onClick={handleReset}>
            Reset queue
          </button>
          <button type="button" className="dashboard-primary-pill" onClick={() => refresh?.()}>
            Refresh from source
          </button>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="dashboard-card-muted p-5">
          <p className="text-xs uppercase tracking-wide text-slate-500">Production time</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{productionStats.totalMinutes} minutes</p>
          <p className="mt-1 text-xs text-slate-500">Estimated published runtime in the pipeline.</p>
        </div>
        <div className="dashboard-card-muted p-5">
          <p className="text-xs uppercase tracking-wide text-slate-500">Episodes</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{productionStats.totalEpisodes}</p>
          <p className="mt-1 text-xs text-slate-500">Active episodes monitored in the studio board.</p>
        </div>
        <div className="dashboard-card-muted p-5">
          <p className="text-xs uppercase tracking-wide text-slate-500">Stage overview</p>
          <ul className="mt-2 space-y-1 text-xs text-slate-500">
            {STAGE_OPTIONS.map((stage) => (
              <li key={stage} className="flex items-center justify-between">
                <span>{stage}</span>
                <span className="font-semibold text-slate-700">{productionTotals[stage]}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="dashboard-section space-y-6">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="dashboard-kicker">Episode composer</p>
            <h2 className="text-lg font-semibold text-slate-900">Create or import a new episode</h2>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <select
              className="dashboard-input h-10"
              value={selectedCommunityId ?? ''}
              onChange={(event) => setSelectedCommunityId(event.target.value || null)}
            >
              {communitiesState.items.map((community) => (
                <option key={community.id} value={community.id}>
                  {community.name ?? `Community ${community.id}`}
                </option>
              ))}
            </select>
            <select
              className="dashboard-input h-10"
              value={stageFilter}
              onChange={(event) => setStageFilter(event.target.value)}
            >
              <option value="All">All stages</option>
              {STAGE_OPTIONS.map((stage) => (
                <option key={stage} value={stage}>
                  {stage}
                </option>
              ))}
            </select>
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by episode or host"
              className="dashboard-input h-10"
            />
            {editingId ? (
              <button type="button" className="dashboard-pill px-4 py-2" onClick={handleCancelEdit}>
                Cancel edit
              </button>
            ) : null}
          </div>
        </header>

        <form className="grid gap-4 rounded-2xl border border-slate-200 bg-white/60 p-5" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-1 text-sm text-slate-600">
              Episode title
              <input
                type="text"
                required
                value={draft.episode}
                onChange={(event) => setDraft((previous) => ({ ...previous, episode: event.target.value }))}
                className="dashboard-input"
              />
            </label>
            <label className="grid gap-1 text-sm text-slate-600">
              Host or facilitator
              <input
                type="text"
                required
                value={draft.host}
                onChange={(event) => setDraft((previous) => ({ ...previous, host: event.target.value }))}
                className="dashboard-input"
              />
            </label>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <label className="grid gap-1 text-sm text-slate-600">
              Stage
              <select
                className="dashboard-input"
                value={draft.stage}
                onChange={(event) => setDraft((previous) => ({ ...previous, stage: event.target.value }))}
              >
                {STAGE_OPTIONS.map((stage) => (
                  <option key={stage} value={stage}>
                    {stage}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm text-slate-600">
              Release date
              <input
                type="date"
                value={draft.release}
                onChange={(event) => setDraft((previous) => ({ ...previous, release: event.target.value }))}
                className="dashboard-input"
              />
            </label>
            <label className="grid gap-1 text-sm text-slate-600">
              Duration (minutes)
              <input
                type="number"
                min="0"
                value={draft.duration}
                onChange={(event) => setDraft((previous) => ({ ...previous, duration: event.target.value }))}
                className="dashboard-input"
              />
            </label>
          </div>
          <label className="grid gap-1 text-sm text-slate-600">
            Episode summary
            <textarea
              rows={3}
              value={draft.summary}
              onChange={(event) => setDraft((previous) => ({ ...previous, summary: event.target.value }))}
              className="dashboard-input resize-y"
            />
          </label>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-1 text-sm text-slate-600">
              Audio URL
              <input
                type="url"
                value={draft.audioUrl}
                onChange={(event) => setDraft((previous) => ({ ...previous, audioUrl: event.target.value }))}
                className="dashboard-input"
              />
            </label>
            <label className="grid gap-1 text-sm text-slate-600">
              Cover art URL
              <input
                type="url"
                value={draft.coverArtUrl}
                onChange={(event) => setDraft((previous) => ({ ...previous, coverArtUrl: event.target.value }))}
                className="dashboard-input"
              />
            </label>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3">
            <button type="submit" className="dashboard-primary-pill px-6 py-2" disabled={saving}>
              {editingId ? 'Update episode' : 'Add episode to studio'}
            </button>
          </div>
        </form>

        <div className="space-y-4">
          {filteredEpisodes.map((episode) => (
            <article key={episode.id} className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500">{episode.stage}</p>
                  <h3 className="text-lg font-semibold text-slate-900">{episode.episode}</h3>
                  <p className="text-xs text-slate-500">Hosted by {episode.host}</p>
                  <p className="text-sm text-slate-600">{episode.summary || 'No production notes yet.'}</p>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <span className="dashboard-pill px-3 py-1">{episode.duration} min</span>
                    <span className="dashboard-pill px-3 py-1">Release {episode.release}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className="dashboard-pill px-3 py-1" onClick={() => handleEdit(episode)}>
                      Edit episode
                    </button>
                    <button
                      type="button"
                      className="dashboard-pill px-3 py-1"
                      onClick={() => handleAdvanceStage(episode)}
                      disabled={!episode.permissions?.canEdit}
                    >
                      Advance stage
                    </button>
                    <button
                      type="button"
                      className="dashboard-pill border-transparent bg-rose-50 px-3 py-1 text-rose-600 hover:border-rose-200"
                      onClick={() => handleDelete(episode.id)}
                      disabled={!episode.permissions?.canEdit}
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-3 text-xs text-slate-500">
                  {episode.coverArtUrl ? (
                    <img
                      src={episode.coverArtUrl}
                      alt="Episode cover"
                      className="h-28 w-28 rounded-xl object-cover"
                      loading="lazy"
                    />
                  ) : null}
                  {episode.audioUrl ? (
                    <audio controls className="w-full min-w-[200px]">
                      <source src={episode.audioUrl} />
                      Your browser does not support the audio element.
                    </audio>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </div>

        {filteredEpisodes.length === 0 ? (
          <DashboardStateMessage
            title={
              productionStats.totalEpisodes === 0
                ? 'No podcast episodes in production'
                : 'No episodes match your filters'
            }
            description={
              productionStats.totalEpisodes === 0
                ? 'Use the composer above to add your first episode or refresh from your studio integrations.'
                : 'Broaden the stage filter or clear your search to continue managing the production queue.'
            }
            actionLabel={productionStats.totalEpisodes === 0 ? 'Create episode' : undefined}
            onAction={productionStats.totalEpisodes === 0 ? () => setEditingId(null) : undefined}
          />
        ) : null}

        {episodesState.error ? (
          <DashboardStateMessage
            tone="error"
            title="Unable to load podcast episodes"
            description={episodesState.error?.message ?? 'Check your connection and try again.'}
            actionLabel="Retry"
            onAction={() => selectedCommunityId && loadEpisodes(selectedCommunityId)}
          />
        ) : null}
      </section>
    </div>
  );
}

export default withInstructorDashboardAccess(InstructorCommunityPodcasts);
