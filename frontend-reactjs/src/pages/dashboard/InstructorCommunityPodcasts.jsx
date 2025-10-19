import { useCallback, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';

import DashboardStateMessage from '../../components/dashboard/DashboardStateMessage.jsx';
import usePersistentCollection from '../../hooks/usePersistentCollection.js';

const STAGE_OPTIONS = ['Planning', 'Recording', 'Editing', 'QA', 'Scheduled', 'Live'];

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

export default function InstructorCommunityPodcasts() {
  const { dashboard, refresh } = useOutletContext();
  const seedEpisodes = useMemo(
    () =>
      (Array.isArray(dashboard?.communities?.podcasts) ? dashboard.communities.podcasts : []).map((episode) => ({
        id: episode.id ?? `${episode.episode}-${episode.release}`,
        episode: episode.episode,
        stage: episode.stage ?? 'Planning',
        release: episode.release ?? new Date().toISOString().slice(0, 10),
        host: episode.host ?? 'Community team',
        duration: Number(episode.duration ?? 30),
        summary: episode.summary ?? '',
        audioUrl: episode.audioUrl ?? '',
        coverArtUrl: episode.coverArtUrl ?? ''
      })),
    [dashboard?.communities?.podcasts]
  );

  const {
    items: episodes,
    addItem,
    updateItem,
    removeItem,
    reset: resetEpisodes
  } = usePersistentCollection('edulure.community.podcasts', () => seedEpisodes);

  const [draft, setDraft] = useState(createEpisodeDraft);
  const [editingId, setEditingId] = useState(null);
  const [stageFilter, setStageFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  const productionStats = useMemo(() => {
    const totalMinutes = episodes.reduce((total, episode) => total + Number(episode.duration ?? 0), 0);
    const byStage = episodes.reduce((acc, episode) => {
      acc[episode.stage] = (acc[episode.stage] ?? 0) + 1;
      return acc;
    }, {});
    return { totalMinutes, byStage };
  }, [episodes]);

  const filteredEpisodes = useMemo(() => {
    return episodes.filter((episode) => {
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
  }, [episodes, searchTerm, stageFilter]);

  const handleSubmit = useCallback(
    (event) => {
      event.preventDefault();
      const payload = {
        episode: draft.episode || 'Untitled episode',
        stage: draft.stage,
        release: draft.release,
        host: draft.host || 'Community host',
        duration: Number.isNaN(Number(draft.duration)) ? 0 : Number(draft.duration),
        summary: draft.summary,
        audioUrl: draft.audioUrl,
        coverArtUrl: draft.coverArtUrl
      };

      if (editingId) {
        updateItem(editingId, payload);
      } else {
        addItem(payload);
      }

      setDraft(createEpisodeDraft());
      setEditingId(null);
    },
    [addItem, draft, editingId, updateItem]
  );

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
      coverArtUrl: episode.coverArtUrl ?? ''
    });
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingId(null);
    setDraft(createEpisodeDraft());
  }, []);

  const handleAdvanceStage = useCallback(
    (episode) => {
      const currentIndex = STAGE_OPTIONS.indexOf(episode.stage);
      const nextStage = STAGE_OPTIONS[Math.min(STAGE_OPTIONS.length - 1, currentIndex + 1)];
      updateItem(episode.id, { stage: nextStage });
    },
    [updateItem]
  );

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Community podcast studio</h1>
          <p className="mt-2 text-sm text-slate-600">
            Track production stages, host assignments, and publish-ready assets for every episode.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" className="dashboard-pill px-4 py-2" onClick={resetEpisodes}>
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
          <p className="mt-2 text-2xl font-semibold text-slate-900">{episodes.length}</p>
          <p className="mt-1 text-xs text-slate-500">Active episodes monitored in the studio board.</p>
        </div>
        <div className="dashboard-card-muted p-5">
          <p className="text-xs uppercase tracking-wide text-slate-500">Stage overview</p>
          <ul className="mt-2 space-y-1 text-xs text-slate-500">
            {STAGE_OPTIONS.map((stage) => (
              <li key={stage} className="flex items-center justify-between">
                <span>{stage}</span>
                <span className="font-semibold text-slate-700">{productionStats.byStage[stage] ?? 0}</span>
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
            <button type="submit" className="dashboard-primary-pill px-6 py-2">
              {editingId ? 'Update episode' : 'Add episode to studio'}
            </button>
          </div>
        </form>

        <div className="space-y-4">
          {filteredEpisodes.map((episode) => (
            <article key={episode.id} className="rounded-2xl border border-slate-200 bg-white/70 p-5 shadow-sm">
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
                    >
                      Advance stage
                    </button>
                    <button
                      type="button"
                      className="dashboard-pill border-transparent bg-rose-50 px-3 py-1 text-rose-600 hover:border-rose-200"
                      onClick={() => removeItem(episode.id)}
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
            title={episodes.length === 0 ? 'No podcast episodes in production' : 'No episodes match your filters'}
            description={
              episodes.length === 0
                ? 'Use the composer above to add your first episode or refresh from your studio integrations.'
                : 'Broaden the stage filter or clear your search to continue managing the production queue.'
            }
            actionLabel={episodes.length === 0 ? 'Create episode' : undefined}
            onAction={episodes.length === 0 ? () => setEditingId(null) : undefined}
          />
        ) : null}
      </section>
    </div>
  );
}
