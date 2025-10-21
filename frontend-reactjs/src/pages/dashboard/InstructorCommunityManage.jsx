import { useCallback, useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { useOutletContext } from "react-router-dom";

import DashboardActionFeedback from "../../components/dashboard/DashboardActionFeedback.jsx";
import DashboardStateMessage from "../../components/dashboard/DashboardStateMessage.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { resolveInstructorAccess } from "./instructor/instructorAccess.js";
import {
  deleteCommunity,
  fetchCommunities,
  fetchCommunityDetail,
  updateCommunity
} from "../../api/communityApi.js";

function buildFormState(community) {
  if (!community) {
    return {
      name: "",
      description: "",
      coverImageUrl: "",
      visibility: "public",
      tagsInput: "",
      tone: "curated",
      focus: "",
      onboardingGuideUrl: "",
      welcomeVideoUrl: "",
      playbooksInput: "",
      theme: "",
      status: community?.status ?? "Active"
    };
  }

  const metadata = community.metadata ?? {};
  const tags = Array.isArray(metadata.tags) ? metadata.tags : [];
  const playbooks = Array.isArray(metadata.playbooks)
    ? metadata.playbooks
    : typeof metadata.playbooks === "string"
      ? metadata.playbooks
          .split("\n")
          .map((entry) => entry.trim())
          .filter(Boolean)
      : [];

  return {
    name: community.name ?? "",
    description: community.description ?? "",
    coverImageUrl: community.coverImageUrl ?? "",
    visibility: community.visibility ?? "public",
    tagsInput: tags.join(", "),
    tone: metadata.tone ?? "curated",
    focus: metadata.focus ?? "",
    onboardingGuideUrl: metadata.onboardingGuideUrl ?? "",
    welcomeVideoUrl: metadata.welcomeVideoUrl ?? "",
    playbooksInput: playbooks.join("\n"),
    theme: metadata.theme ?? "",
    status: community.metadata?.status ?? "Active"
  };
}

function formatDateTime(value) {
  if (!value) return "Not available";
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(new Date(value));
  } catch (_error) {
    return value;
  }
}

function classNames(...values) {
  return values.filter(Boolean).join(" ");
}

export default function InstructorCommunityManage() {
  const outletContext = useOutletContext();
  const { refresh } = outletContext ?? {};
  const role = outletContext?.role ?? null;
  const access = resolveInstructorAccess(role);
  const hasAccess = access.granted;
  const { session } = useAuth();
  const token = session?.tokens?.accessToken;

  const [communities, setCommunities] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [form, setForm] = useState(buildFormState());
  const [isDirty, setIsDirty] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [listError, setListError] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [visibilityFilter, setVisibilityFilter] = useState("all");

  const loadCommunities = useCallback(async () => {
    if (!token || !hasAccess) return;
    setLoadingList(true);
    setListError(null);
    try {
      const response = await fetchCommunities(token);
      const data = Array.isArray(response.data) ? response.data : [];
      setCommunities(data);
      if (!selectedId && data.length > 0) {
        setSelectedId(data[0].id);
      }
    } catch (error) {
      setListError(error?.message ?? "Unable to load communities.");
      setCommunities([]);
      setSelectedId(null);
    } finally {
      setLoadingList(false);
    }
  }, [hasAccess, selectedId, token]);

  useEffect(() => {
    loadCommunities();
  }, [loadCommunities]);

  const selectedCommunity = useMemo(
    () => communities.find((community) => community.id === selectedId) ?? null,
    [communities, selectedId]
  );

  useEffect(() => {
    if (!token || !selectedId || !hasAccess) {
      setSelectedDetail(null);
      setForm(buildFormState(selectedCommunity));
      setIsDirty(false);
      return;
    }

    let cancelled = false;
    const fetchDetail = async () => {
      setLoadingDetail(true);
      try {
        const response = await fetchCommunityDetail(selectedId, token);
        if (!cancelled) {
          setSelectedDetail(response.data ?? null);
        }
      } catch (error) {
        if (!cancelled) {
          setFeedback({ tone: "error", message: error?.message ?? "Unable to load community detail." });
          setSelectedDetail(null);
        }
      } finally {
        if (!cancelled) {
          setLoadingDetail(false);
        }
      }
    };

    fetchDetail();
    return () => {
      cancelled = true;
    };
  }, [hasAccess, selectedCommunity, selectedId, token]);

  useEffect(() => {
    if (!selectedCommunity) {
      setForm(buildFormState());
      setIsDirty(false);
      return;
    }
    if (isDirty) {
      return;
    }
    const detail = selectedDetail && selectedDetail.id === selectedCommunity.id ? selectedDetail : null;
    setForm(buildFormState(detail ?? selectedCommunity));
  }, [selectedCommunity, selectedDetail, isDirty]);

  const filteredCommunities = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return communities.filter((community) => {
      const matchesSearch =
        !query ||
        [community.name, community.description, community.metadata?.focus, community.metadata?.tone]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(query);
      const matchesVisibility =
        visibilityFilter === "all" || community.visibility === visibilityFilter || community.visibility === visibilityFilter;
      return matchesSearch && matchesVisibility;
    });
  }, [communities, searchTerm, visibilityFilter]);

  const summary = useMemo(() => {
    return filteredCommunities.reduce(
      (accumulator, community) => {
        const stats = community.stats ?? {};
        accumulator.totalMembers += Number(stats.members ?? 0);
        accumulator.totalResources += Number(stats.resources ?? 0);
        accumulator.privateCount += community.visibility === "private" ? 1 : 0;
        accumulator.publicCount += community.visibility === "public" ? 1 : 0;
        return accumulator;
      },
      { totalMembers: 0, totalResources: 0, privateCount: 0, publicCount: 0 }
    );
  }, [filteredCommunities]);

  const handleFieldChange = useCallback((event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
    setIsDirty(true);
  }, []);

  const handleSubmit = useCallback(
    async (event) => {
      event.preventDefault();
      if (!token || !selectedCommunity || !hasAccess) {
        return;
      }
      setSaving(true);
      setFeedback(null);
      try {
        const tags = form.tagsInput
          .split(",")
          .map((entry) => entry.trim())
          .filter(Boolean);
        const playbooks = form.playbooksInput
          .split("\n")
          .map((entry) => entry.trim())
          .filter(Boolean);
        const payload = {
          name: form.name,
          description: form.description || undefined,
          coverImageUrl: form.coverImageUrl || undefined,
          visibility: form.visibility,
          metadata: Object.fromEntries(
            Object.entries({
              tone: form.tone,
              focus: form.focus,
              onboardingGuideUrl: form.onboardingGuideUrl,
              welcomeVideoUrl: form.welcomeVideoUrl,
              theme: form.theme,
              tags,
              playbooks
            }).filter(([, value]) => {
              if (Array.isArray(value)) {
                return value.length > 0;
              }
              return value !== "" && value !== null && value !== undefined;
            })
          )
        };
        await updateCommunity({ communityId: selectedCommunity.id, token, payload });
        setFeedback({ tone: "success", message: "Community updated successfully." });
        setIsDirty(false);
        await loadCommunities();
      } catch (error) {
        setFeedback({ tone: "error", message: error?.message ?? "Unable to update community." });
      } finally {
        setSaving(false);
      }
    },
    [form, hasAccess, loadCommunities, selectedCommunity, token]
  );

  const handleArchive = useCallback(
    async (community) => {
      if (!token || !hasAccess) return;
      if (!window.confirm(`Archive ${community.name}? Members will lose access.`)) {
        return;
      }
      setDeletingId(community.id);
      setFeedback(null);
      try {
        await deleteCommunity({ communityId: community.id, token });
        setFeedback({ tone: "success", message: "Community archived successfully." });
        if (selectedId === community.id) {
          setSelectedId(null);
          setSelectedDetail(null);
        }
        await loadCommunities();
      } catch (error) {
        setFeedback({ tone: "error", message: error?.message ?? "Unable to archive community." });
      } finally {
        setDeletingId(null);
      }
    },
    [hasAccess, loadCommunities, selectedId, token]
  );

  if (!hasAccess) {
    return (
      <DashboardStateMessage
        variant={access.message.variant}
        title={access.message.title}
        description={access.message.description}
      />
    );
  }

  const communityChannels = useMemo(() => {
    if (selectedDetail?.channels) {
      return selectedDetail.channels;
    }
    return [];
  }, [selectedDetail]);

  return (
    <div className="space-y-8">
      <DashboardActionFeedback feedback={feedback} onDismiss={() => setFeedback(null)} />

      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Community operations cockpit</h1>
          <p className="mt-2 text-sm text-slate-600">
            Audit every Learnspace you steward, update positioning, and archive communities that have run their course.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <a href="/dashboard/instructor/community/create" className="dashboard-pill px-4 py-2">
            Launch new community
          </a>
          <button type="button" className="dashboard-pill px-4 py-2" onClick={loadCommunities} disabled={loadingList}>
            {loadingList ? "Refreshing…" : "Refresh list"}
          </button>
          <button type="button" className="dashboard-primary-pill" onClick={() => refresh?.()}>
            Refresh telemetry
          </button>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="dashboard-card-muted p-5">
          <p className="text-xs uppercase tracking-wide text-slate-500">Managed communities</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{filteredCommunities.length}</p>
          <p className="mt-1 text-xs text-slate-500">{communities.length} total across your workspace.</p>
        </article>
        <article className="dashboard-card-muted p-5">
          <p className="text-xs uppercase tracking-wide text-slate-500">Active members</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{summary.totalMembers}</p>
          <p className="mt-1 text-xs text-slate-500">Aggregated membership across filtered communities.</p>
        </article>
        <article className="dashboard-card-muted p-5">
          <p className="text-xs uppercase tracking-wide text-slate-500">Content assets</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{summary.totalResources}</p>
          <p className="mt-1 text-xs text-slate-500">Published resources available to members.</p>
        </article>
        <article className="dashboard-card-muted p-5">
          <p className="text-xs uppercase tracking-wide text-slate-500">Visibility mix</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {summary.publicCount} public · {summary.privateCount} private
          </p>
          <p className="mt-1 text-xs text-slate-500">Balance your open and invite-only experiences.</p>
        </article>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1.8fr)]">
        <section className="dashboard-section space-y-5">
          <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="dashboard-kicker">Your communities</p>
              <h2 className="text-lg font-semibold text-slate-900">Portfolio overview</h2>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by name, focus, or tone"
                className="dashboard-input h-10"
              />
              <select
                value={visibilityFilter}
                onChange={(event) => setVisibilityFilter(event.target.value)}
                className="dashboard-input h-10"
              >
                <option value="all">All visibilities</option>
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>
            </div>
          </header>

          {listError ? (
            <DashboardStateMessage
              variant="error"
              title="Unable to load communities"
              description={listError}
              actionLabel="Retry"
              onAction={loadCommunities}
            />
          ) : null}

          {loadingList ? (
            <DashboardStateMessage
              variant="loading"
              title="Fetching communities"
              description="Syncing the latest membership and engagement telemetry."
            />
          ) : null}

          {!loadingList && filteredCommunities.length === 0 ? (
            <DashboardStateMessage
              title="No communities found"
              description="Launch a new Learnspace or adjust your filters to continue managing existing spaces."
              actionLabel="Create community"
              onAction={() => (window.location.href = "/dashboard/instructor/community/create")}
            />
          ) : null}

          <ul className="space-y-3">
            {filteredCommunities.map((community) => {
              const stats = community.stats ?? {};
              const isSelected = community.id === selectedId;
              return (
                <li key={community.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedId(community.id);
                      setIsDirty(false);
                    }}
                    className={classNames(
                      "w-full rounded-2xl border p-4 text-left transition focus:outline-none focus:ring-2 focus:ring-primary/40",
                      isSelected
                        ? "border-primary/60 bg-primary/5 shadow-sm"
                        : "border-slate-200 bg-white hover:border-primary/30 hover:bg-primary/5"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-semibold text-slate-900">{community.name}</p>
                        <p className="mt-1 text-xs text-slate-500">{community.visibility === "private" ? "Private" : "Public"}</p>
                      </div>
                      <span className="dashboard-pill px-3 py-1 text-xs font-semibold">
                        {stats.members ?? 0} members
                      </span>
                    </div>
                    {community.description ? (
                      <p className="mt-3 line-clamp-2 text-sm text-slate-600">{community.description}</p>
                    ) : null}
                    <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
                      {(community.metadata?.tags ?? []).map((tag) => (
                        <span key={`${community.id}-${tag}`} className="dashboard-pill px-3 py-1">
                          #{tag}
                        </span>
                      ))}
                      {community.metadata?.focus ? (
                        <span className="dashboard-pill px-3 py-1">{community.metadata.focus}</span>
                      ) : null}
                      <span className="dashboard-pill px-3 py-1">
                        Updated {formatDateTime(community.stats?.lastActivityAt ?? community.updatedAt)}
                      </span>
                      <button
                        type="button"
                        className="dashboard-pill border-transparent bg-rose-50 px-3 py-1 text-rose-600 hover:border-rose-200"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleArchive(community);
                        }}
                        disabled={deletingId === community.id}
                      >
                        {deletingId === community.id ? "Archiving…" : "Archive"}
                      </button>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="dashboard-section space-y-6">
          <div className="flex flex-col gap-2">
            <p className="dashboard-kicker">Community configuration</p>
            <h2 className="text-lg font-semibold text-slate-900">
              {selectedCommunity ? `Editing ${selectedCommunity.name}` : "Select a community"}
            </h2>
            <p className="text-sm text-slate-600">
              Update positioning, shareable assets, and visibility controls. Changes sync instantly to the learner portal.
            </p>
          </div>

          {!selectedCommunity ? (
            <DashboardStateMessage
              title="Choose a community"
              description="Select a community from the list to view detail, update configuration, and manage channels."
            />
          ) : (
            <form className="grid gap-4" onSubmit={handleSubmit}>
              <label className="grid gap-1 text-sm text-slate-600">
                Community name
                <input
                  required
                  name="name"
                  value={form.name}
                  onChange={handleFieldChange}
                  className="dashboard-input"
                />
              </label>
              <label className="grid gap-1 text-sm text-slate-600">
                Description
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleFieldChange}
                  className="dashboard-input min-h-[120px]"
                  placeholder="Describe the intent, rituals, and transformation your community delivers."
                />
              </label>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-1 text-sm text-slate-600">
                  Cover image URL
                  <input
                    name="coverImageUrl"
                    value={form.coverImageUrl}
                    onChange={handleFieldChange}
                    className="dashboard-input"
                    placeholder="https://cdn.example.com/community-cover.jpg"
                  />
                </label>
                <label className="grid gap-1 text-sm text-slate-600">
                  Visibility
                  <select name="visibility" value={form.visibility} onChange={handleFieldChange} className="dashboard-input">
                    <option value="public">Public</option>
                    <option value="private">Private</option>
                  </select>
                </label>
              </div>
              {form.coverImageUrl ? (
                <figure className="overflow-hidden rounded-2xl border border-slate-200">
                  <img
                    src={form.coverImageUrl}
                    alt="Community cover preview"
                    className="h-48 w-full object-cover"
                    onError={(event) => {
                      event.currentTarget.src =
                        "https://images.unsplash.com/photo-1545239351-1141bd82e8a6?auto=format&fit=crop&w=800&q=80";
                    }}
                  />
                </figure>
              ) : null}
              <label className="grid gap-1 text-sm text-slate-600">
                Tags
                <input
                  name="tagsInput"
                  value={form.tagsInput}
                  onChange={handleFieldChange}
                  className="dashboard-input"
                  placeholder="community, onboarding, mentorship"
                />
              </label>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-1 text-sm text-slate-600">
                  Tone
                  <select name="tone" value={form.tone} onChange={handleFieldChange} className="dashboard-input">
                    <option value="curated">Curated — high touch moderation</option>
                    <option value="open">Open — community-led discovery</option>
                    <option value="experimental">Experimental — rapid iteration</option>
                  </select>
                </label>
                <label className="grid gap-1 text-sm text-slate-600">
                  Focus
                  <input
                    name="focus"
                    value={form.focus}
                    onChange={handleFieldChange}
                    className="dashboard-input"
                    placeholder="Ramp new cohort to launch-ready in 6 weeks"
                  />
                </label>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-1 text-sm text-slate-600">
                  Onboarding guide URL
                  <input
                    name="onboardingGuideUrl"
                    value={form.onboardingGuideUrl}
                    onChange={handleFieldChange}
                    className="dashboard-input"
                    placeholder="https://docs.example.com/onboarding"
                  />
                </label>
                <label className="grid gap-1 text-sm text-slate-600">
                  Welcome video URL
                  <input
                    name="welcomeVideoUrl"
                    value={form.welcomeVideoUrl}
                    onChange={handleFieldChange}
                    className="dashboard-input"
                    placeholder="https://video.example.com/welcome.mp4"
                  />
                </label>
              </div>
              {form.welcomeVideoUrl ? (
                <video
                  controls
                  src={form.welcomeVideoUrl}
                  className="aspect-video w-full rounded-2xl border border-slate-200 object-cover"
                  preload="metadata"
                >
                  <track kind="captions" />
                </video>
              ) : null}
              <label className="grid gap-1 text-sm text-slate-600">
                Ritual playbooks
                <textarea
                  name="playbooksInput"
                  value={form.playbooksInput}
                  onChange={handleFieldChange}
                  className="dashboard-input min-h-[120px]"
                  placeholder={["Welcome circle", "Weekly co-working", "Demo day retro"].join(", ")}
                />
              </label>
              <div className="flex flex-wrap items-center justify-end gap-3">
                <span className="text-xs text-slate-500">
                  Last activity {formatDateTime(selectedCommunity.stats?.lastActivityAt ?? selectedCommunity.updatedAt)}
                </span>
                <button type="submit" className="dashboard-primary-pill px-6 py-2" disabled={saving || !isDirty}>
                  {saving ? "Saving…" : isDirty ? "Save changes" : "Up to date"}
                </button>
              </div>
            </form>
          )}

          {loadingDetail ? (
            <DashboardStateMessage
              variant="loading"
              title="Loading community detail"
              description="Fetching channels and membership signals."
            />
          ) : null}

          {communityChannels.length > 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white/70 p-4">
              <p className="dashboard-kicker">Channels</p>
              <ul className="mt-3 space-y-2 text-sm text-slate-600">
                {communityChannels.map((channel) => (
                  <li key={channel.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-2">
                    <span>
                      <span className="font-semibold text-slate-800">{channel.name}</span>
                      <span className="ml-2 text-xs uppercase tracking-wide text-slate-500">{channel.type}</span>
                    </span>
                    {channel.isDefault ? (
                      <span className="text-xs text-primary">Default</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}

InstructorCommunityManage.propTypes = {
  refresh: PropTypes.func
};

InstructorCommunityManage.defaultProps = {
  refresh: undefined
};
