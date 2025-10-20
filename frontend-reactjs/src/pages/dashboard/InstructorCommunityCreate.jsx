import { useCallback, useEffect, useMemo, useState } from 'react';

import DashboardActionFeedback from '../../components/dashboard/DashboardActionFeedback.jsx';
import DashboardStateMessage from '../../components/dashboard/DashboardStateMessage.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useOutletContext } from 'react-router-dom';
import {
  createCommunity,
  deleteCommunity,
  fetchCommunities,
  updateCommunity
} from '../../api/communityApi.js';

const initialDraft = {
  name: '',
  description: '',
  coverImageUrl: '',
  visibility: 'public',
  metadata: {
    tags: [],
    tone: 'curated',
    focus: '',
    onboardingGuideUrl: '',
    welcomeVideoUrl: '',
    playbooks: []
  }
};

export default function InstructorCommunityCreate() {
  const { session } = useAuth();
  const token = session?.tokens?.accessToken;
  const { dashboard } = useOutletContext();

  const templates = useMemo(
    () => (Array.isArray(dashboard?.communities?.createTemplates) ? dashboard.communities.createTemplates : []),
    [dashboard?.communities?.createTemplates]
  );

  const [communities, setCommunities] = useState([]);
  const [draft, setDraft] = useState(initialDraft);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);

  const loadCommunities = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetchCommunities(token);
      setCommunities(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setError(err.message ?? 'Unable to load communities.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadCommunities();
  }, [loadCommunities]);

  const handleDraftChange = useCallback((event) => {
    const { name, value } = event.target;
    setDraft((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleMetadataChange = useCallback((event) => {
    const { name, value, type, checked } = event.target;
    const key = name.replace('metadata.', '');
    setDraft((prev) => ({
      ...prev,
      metadata: {
        ...prev.metadata,
        [key]: type === 'checkbox' ? checked : value
      }
    }));
  }, []);

  const applyTemplate = useCallback((template) => {
    setDraft({
      name: template.name ?? template.title ?? 'New community',
      description: template.summary ?? template.description ?? '',
      coverImageUrl: template.coverImageUrl ?? '',
      visibility: template.visibility ?? 'public',
      metadata: {
        ...initialDraft.metadata,
        theme: template.theme ?? 'launch',
        tone: template.tone ?? template.vibe ?? initialDraft.metadata.tone,
        focus: template.focus ?? template.positioning ?? '',
        onboardingGuideUrl: template.onboardingGuideUrl ?? '',
        welcomeVideoUrl: template.welcomeVideoUrl ?? '',
        playbooks: Array.isArray(template.ingredients)
          ? template.ingredients
          : typeof template.ingredients === 'string'
            ? template.ingredients
                .split('\n')
                .map((entry) => entry.trim())
                .filter(Boolean)
            : []
      }
    });
    setEditingId(null);
  }, []);

  const resetDraft = useCallback(() => {
    setDraft(initialDraft);
    setEditingId(null);
  }, []);

  const handleSubmit = useCallback(
    async (event) => {
      event.preventDefault();
      if (!token) return;
      setLoading(true);
      setFeedback(null);
      try {
        const payload = {
          name: draft.name,
          description: draft.description || undefined,
          coverImageUrl: draft.coverImageUrl || undefined,
          visibility: draft.visibility,
          metadata: (() => {
            const metadata = {
              ...draft.metadata,
              tags: Array.isArray(draft.metadata?.tags) ? draft.metadata.tags : [],
              playbooks: Array.isArray(draft.metadata?.playbooks)
                ? draft.metadata.playbooks
                : String(draft.metadata?.playbooks ?? '')
                    .split('\n')
                    .map((entry) => entry.trim())
                    .filter(Boolean)
            };
            return Object.fromEntries(
              Object.entries(metadata).filter(([, value]) => {
                if (Array.isArray(value)) {
                  return value.length > 0;
                }
                return value !== '' && value !== null && value !== undefined;
              })
            );
          })()
        };
        if (editingId) {
          await updateCommunity({ communityId: editingId, token, payload });
          setFeedback({ tone: 'success', message: 'Community updated successfully.' });
        } else {
          await createCommunity({ token, payload });
          setFeedback({ tone: 'success', message: 'Community created successfully.' });
        }
        await loadCommunities();
        resetDraft();
      } catch (err) {
        setFeedback({ tone: 'error', message: err.message ?? 'Unable to save community.' });
      } finally {
        setLoading(false);
      }
    },
    [draft, editingId, loadCommunities, resetDraft, token]
  );

  const handleEdit = useCallback((community) => {
    setDraft({
      name: community.name,
      description: community.description ?? '',
      coverImageUrl: community.coverImageUrl ?? '',
      visibility: community.visibility ?? 'public',
      metadata: {
        ...initialDraft.metadata,
        ...(community.metadata ?? {}),
        tags: Array.isArray(community.metadata?.tags) ? community.metadata.tags : [],
        playbooks: Array.isArray(community.metadata?.playbooks)
          ? community.metadata.playbooks
          : String(community.metadata?.playbooks ?? '')
              .split('\n')
              .map((entry) => entry.trim())
              .filter(Boolean)
      }
    });
    setEditingId(community.id);
  }, []);

  const handleDelete = useCallback(
    async (community) => {
      if (!token) return;
      if (!window.confirm(`Archive ${community.name}? This will hide it from members.`)) return;
      setLoading(true);
      setFeedback(null);
      try {
        await deleteCommunity({ communityId: community.id, token });
        setFeedback({ tone: 'success', message: 'Community archived.' });
        await loadCommunities();
      } catch (err) {
        setFeedback({ tone: 'error', message: err.message ?? 'Unable to archive community.' });
      } finally {
        setLoading(false);
      }
    },
    [loadCommunities, token]
  );

  return (
    <div className="space-y-8">
      <DashboardActionFeedback feedback={feedback} onDismiss={() => setFeedback(null)} />

      <section className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <form className="grid gap-4 rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-2">
            <p className="dashboard-kicker">Community launch studio</p>
            <h1 className="text-2xl font-semibold text-slate-900">
              {editingId ? 'Update community' : 'Create a new community'}
            </h1>
            <p className="text-sm text-slate-600">
              Configure launch-ready metadata, set visibility, and publish a space for your learners.
            </p>
          </div>
          <div className="space-y-3">
            <label className="dashboard-label" htmlFor="name">
              Community name
            </label>
            <input
              id="name"
              name="name"
              className="dashboard-input"
              value={draft.name}
              onChange={handleDraftChange}
              required
              placeholder="Launch Lab"
            />
          </div>
          <div className="space-y-3">
            <label className="dashboard-label" htmlFor="description">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              className="dashboard-input min-h-[120px]"
              value={draft.description}
              onChange={handleDraftChange}
              placeholder="Describe the rituals, purpose, and value of this space."
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="dashboard-label" htmlFor="coverImageUrl">
                Cover image URL
              </label>
              <input
                id="coverImageUrl"
                name="coverImageUrl"
                className="dashboard-input"
                value={draft.coverImageUrl}
                onChange={handleDraftChange}
                placeholder="https://cdn.example.com/community-cover.jpg"
              />
              {draft.coverImageUrl ? (
                <figure className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                  <img
                    src={draft.coverImageUrl}
                    alt="Community cover preview"
                    className="h-40 w-full object-cover"
                    onError={(event) => {
                      event.currentTarget.src =
                        'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=600&q=80';
                    }}
                  />
                </figure>
              ) : null}
            </div>
            <div>
              <label className="dashboard-label" htmlFor="visibility">
                Visibility
              </label>
              <select
                id="visibility"
                name="visibility"
                className="dashboard-input"
                value={draft.visibility}
                onChange={handleDraftChange}
              >
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>
            </div>
          </div>
          <div>
            <label className="dashboard-label" htmlFor="metadata.tags">
              Tags (comma separated)
            </label>
            <input
              id="metadata.tags"
              name="metadata.tags"
              className="dashboard-input"
              value={(draft.metadata?.tags ?? []).join(', ')}
              onChange={(event) => {
                const tags = event.target.value
                  .split(',')
                  .map((tag) => tag.trim())
                  .filter(Boolean);
                setDraft((prev) => ({ ...prev, metadata: { ...prev.metadata, tags } }));
              }}
              placeholder="community, launch, mentorship"
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="dashboard-label" htmlFor="metadata.tone">
                Tone of the space
              </label>
              <select
                id="metadata.tone"
                name="metadata.tone"
                className="dashboard-input"
                value={draft.metadata?.tone ?? 'curated'}
                onChange={handleMetadataChange}
              >
                <option value="curated">Curated — high touch moderation</option>
                <option value="open">Open — community-led discovery</option>
                <option value="experimental">Experimental — rapid iteration</option>
              </select>
            </div>
            <div>
              <label className="dashboard-label" htmlFor="metadata.focus">
                Strategic focus
              </label>
              <input
                id="metadata.focus"
                name="metadata.focus"
                className="dashboard-input"
                value={draft.metadata?.focus ?? ''}
                onChange={handleMetadataChange}
                placeholder="Launch onboarding accelerator"
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="dashboard-label" htmlFor="metadata.onboardingGuideUrl">
                Onboarding guide URL
              </label>
              <input
                id="metadata.onboardingGuideUrl"
                name="metadata.onboardingGuideUrl"
                className="dashboard-input"
                value={draft.metadata?.onboardingGuideUrl ?? ''}
                onChange={handleMetadataChange}
                placeholder="https://docs.example.com/onboarding"
              />
            </div>
            <div>
              <label className="dashboard-label" htmlFor="metadata.welcomeVideoUrl">
                Welcome video URL
              </label>
              <input
                id="metadata.welcomeVideoUrl"
                name="metadata.welcomeVideoUrl"
                className="dashboard-input"
                value={draft.metadata?.welcomeVideoUrl ?? ''}
                onChange={handleMetadataChange}
                placeholder="https://video.example.com/welcome.mp4"
              />
            </div>
          </div>
          <div>
            <label className="dashboard-label" htmlFor="metadata.playbooks">
              Ritual playbooks (one per line)
            </label>
            <textarea
              id="metadata.playbooks"
              name="metadata.playbooks"
              className="dashboard-input min-h-[120px]"
              value={(draft.metadata?.playbooks ?? []).join('\n')}
              onChange={(event) => {
                const lines = event.target.value
                  .split('\n')
                  .map((line) => line.trim())
                  .filter(Boolean);
                setDraft((prev) => ({ ...prev, metadata: { ...prev.metadata, playbooks: lines } }));
              }}
              placeholder={['Welcome circle', 'Weekly co-working', 'Demo day retrospective'].join('\n')}
            />
          </div>
          {draft.metadata?.welcomeVideoUrl ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="dashboard-label mb-2">Welcome trailer preview</p>
              <video
                controls
                src={draft.metadata.welcomeVideoUrl}
                className="aspect-video w-full rounded-xl bg-black object-cover"
                preload="metadata"
              >
                <track kind="captions" />
              </video>
            </div>
          ) : null}
          <div className="flex gap-3">
            <button type="submit" className="dashboard-primary-pill px-4 py-2" disabled={loading}>
              {loading ? 'Saving…' : editingId ? 'Save changes' : 'Create community'}
            </button>
            {editingId && (
              <button type="button" className="dashboard-pill px-4 py-2" onClick={resetDraft}>
                Cancel edit
              </button>
            )}
          </div>
        </form>

        <aside className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm">
            <p className="dashboard-kicker">Templates</p>
            <h2 className="text-lg font-semibold text-slate-900">Start from a playbook</h2>
            <p className="mt-2 text-sm text-slate-600">
              Duplicate a proven community blueprint to accelerate setup. All fields remain editable after applying.
            </p>
            <div className="mt-4 space-y-3">
              {templates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm font-semibold text-slate-700 transition hover:border-primary/50 hover:bg-primary/5 hover:text-primary"
                  onClick={() => applyTemplate(template)}
                >
                  <div className="font-semibold">{template.name}</div>
                  <div className="text-xs text-slate-500">{template.duration ?? 'Flexible duration'}</div>
                </button>
              ))}
              {templates.length === 0 && (
                <p className="text-xs text-slate-500">No templates available yet. Save your favourite structure to reuse later.</p>
              )}
            </div>
          </div>
        </aside>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm">
        <header className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="dashboard-kicker">Active communities</p>
            <h2 className="text-lg font-semibold text-slate-900">Portfolio overview</h2>
          </div>
          <button type="button" className="dashboard-pill px-4 py-2" onClick={loadCommunities}>
            Refresh list
          </button>
        </header>

        {loading && (
          <div className="mt-6">
            <DashboardStateMessage
              variant="loading"
              title="Loading communities"
              description="Fetching communities for your workspace."
            />
          </div>
        )}

        {error && !loading && (
          <div className="mt-6">
            <DashboardStateMessage
              variant="error"
              title="Unable to load communities"
              description={error}
              actionLabel="Retry"
              onAction={loadCommunities}
            />
          </div>
        )}

        {!loading && !error && communities.length === 0 && (
          <div className="mt-6">
            <DashboardStateMessage
              title="No communities yet"
              description="Use the form above to publish your first community space."
            />
          </div>
        )}

        {!loading && !error && communities.length > 0 && (
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {communities.map((community) => (
              <article key={community.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">{community.name}</h3>
                    <p className="mt-1 text-xs text-slate-500">Visibility: {community.visibility}</p>
                  </div>
                  <button
                    type="button"
                    className="dashboard-pill px-3 py-1"
                    onClick={() => handleEdit(community)}
                  >
                    Edit
                  </button>
                </div>
                {community.description && (
                  <p className="mt-3 text-sm text-slate-600 line-clamp-3">{community.description}</p>
                )}
                <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
                  {(community.metadata?.tags ?? []).map((tag) => (
                    <span key={tag} className="dashboard-pill px-3 py-1">
                      #{tag}
                    </span>
                  ))}
                </div>
                <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                  <span>
                    Updated {community.updatedAt ? new Date(community.updatedAt).toLocaleDateString() : 'recently'}
                  </span>
                  <button type="button" className="text-rose-500 hover:underline" onClick={() => handleDelete(community)}>
                    Archive
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
